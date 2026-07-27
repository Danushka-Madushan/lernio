'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Play, Pause, X, CheckCircle, Loader2,
  Zap, AlertTriangle, WifiOff,
} from 'lucide-react';
import {
  needsFastStart,
  applyFastStart,
  MAX_PROCESSABLE_BYTES,
  type RemuxProgress,
} from '@/lib/moovAtom';

const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB per part (AWS/R2 minimum is 5 MB)

// Retry tuning for a single part. These are deliberately generous: mobile
// and flaky networks routinely drop a request without the connection being
// "really down," and we don't want that to look like a hard failure.
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000; // 1s, 2s, 4s, 8s, 16s
// If a chunk PUT goes this long with zero upload progress, treat it as a
// stalled connection (not a clean error) and abort so we can retry, rather
// than leaving the UI hung on a spinner indefinitely.
const STALL_TIMEOUT_MS = 20_000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResumableUploaderProps {
  onSuccess: (r2Key: string) => void;
}

interface UploadState {
  uploadId: string;
  key: string;
  filename: string;
  totalSize: number;
  parts: { partNumber: number; etag: string }[];
  currentPart: number;
}

/**
 * Overall phase the uploader is in.
 *
 * idle            → file selected but nothing started yet
 * checking        → running moov atom header check (instant)
 * loading-ffmpeg  → downloading / initializing FFmpeg WASM engine
 * remuxing        → FFmpeg is remuxing the file (movflags +faststart)
 * remux-error     → FFmpeg failed; user can upload unprocessed or abort
 * uploading       → multipart upload to R2 is in progress
 * paused          → upload paused mid-way
 * done            → upload complete
 */
type Phase =
  | 'idle'
  | 'checking'
  | 'loading-ffmpeg'
  | 'remuxing'
  | 'remux-error'
  | 'uploading'
  | 'paused'
  | 'done';

// ─── Error types used to route failures correctly ───────────────────────────
//
// Not all failures should be treated the same way:
//  - RetryableError  → transient (network blip, 5xx, stall) - retry with backoff
//  - SignatureExpiredError → presigned URL expired - re-sign and retry
//  - PausedError     → we aborted the request ourselves because the user hit
//                      Pause - not an error, just stop cleanly
//  - UploadAbortedError → we aborted because the user cancelled - stop and
//                      let the caller's cleanup run
//  - anything else   → genuine, non-retryable failure - surface to the user

class RetryableError extends Error {}
class SignatureExpiredError extends Error {}
class PausedError extends Error {}
class UploadAbortedError extends Error {}

type AbortReason = 'user-pause' | 'user-cancel' | 'stall' | null;

interface ChunkHandle {
  xhr: XMLHttpRequest | null;
  abortReason: AbortReason;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** Sleep for `ms`, but wake up early (and repeatedly re-check) if `shouldWakeEarly` goes true. */
function sleepUnless(ms: number, shouldWakeEarly: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (shouldWakeEarly() || Date.now() - start >= ms) {
        resolve();
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

/**
 * PUT a chunk to a pre-signed URL using XMLHttpRequest instead of fetch.
 *
 * fetch() resolves its promise only once the *entire* request body has been
 * sent, so any progress UI driven by it can only update once per chunk.
 * XHR's `upload.onprogress` event fires continuously as bytes actually go
 * out over the wire, so we use it here purely to get smooth, byte-level
 * progress - everything else about the request is unchanged.
 *
 * `handle` is a mutable, externally-visible slot: whoever calls this stores
 * `handle` in a ref, so a Pause/Cancel button click elsewhere in the app can
 * reach into the *actual in-flight request* and abort it immediately,
 * instead of just flipping a flag the loop won't check until the chunk
 * finishes on its own.
 */
function putChunkWithProgress(
  url: string,
  chunk: Blob,
  contentType: string,
  onProgress: (loadedBytes: number) => void,
  handle: ChunkHandle,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    handle.xhr = xhr;
    xhr.open('PUT', url, true);
    if (contentType) xhr.setRequestHeader('Content-Type', contentType);

    // Stall watchdog - see STALL_TIMEOUT_MS comment above.
    let stallTimer: ReturnType<typeof setTimeout>;
    const resetStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        handle.abortReason = 'stall';
        xhr.abort();
      }, STALL_TIMEOUT_MS);
    };
    resetStallTimer();

    xhr.upload.onprogress = (e) => {
      resetStallTimer();
      if (e.lengthComputable) onProgress(e.loaded);
    };

    xhr.onload = () => {
      clearTimeout(stallTimer);
      handle.xhr = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag');
        if (!etag) {
          reject(new Error('No ETag returned for part'));
          return;
        }
        onProgress(chunk.size); // snap to 100% for this chunk on completion
        resolve(etag);
      } else if (xhr.status === 403 || xhr.status === 400) {
        // Most likely an expired/invalid presigned URL - re-sign and retry.
        reject(new SignatureExpiredError(`Upload URL rejected (status ${xhr.status})`));
      } else if (xhr.status >= 500) {
        reject(new RetryableError(`Server error while uploading part (status ${xhr.status})`));
      } else {
        reject(new Error(`Failed to upload part (status ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      clearTimeout(stallTimer);
      handle.xhr = null;
      reject(new RetryableError('Network error while uploading part'));
    };

    xhr.onabort = () => {
      clearTimeout(stallTimer);
      const reason = handle.abortReason;
      handle.xhr = null;
      if (reason === 'user-cancel') reject(new UploadAbortedError());
      else if (reason === 'user-pause') reject(new PausedError());
      else reject(new RetryableError('Upload stalled (no response) - retrying'));
    };

    xhr.send(chunk);
  });
}

/** fetch() wrapper that can be aborted via the same AbortController ref used for cancel. */
async function fetchAbortable(
  url: string,
  init: RequestInit,
  controllerRef: { current: AbortController | null },
): Promise<Response> {
  const controller = new AbortController();
  controllerRef.current = controller;
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    if (controllerRef.current === controller) controllerRef.current = null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ResumableUploader({ onSuccess }: ResumableUploaderProps) {
  // The raw file selected by the user.
  const [rawFile, setRawFile] = useState<File | null>(null);
  // The file we'll actually upload (may be remuxed version of rawFile).
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);        // upload %
  const [preProgress, setPreProgress] = useState(0);  // ffmpeg load / remux %
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [preStatusText, setPreStatusText] = useState('');
  const [error, setError] = useState('');
  const [remuxError, setRemuxError] = useState('');
  const [wasOptimized, setWasOptimized] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const pausedRef = useRef(false);
  // Set the instant Cancel is pressed; every loop/retry checks this and bails
  // immediately instead of finishing whatever request happens to be in flight.
  const cancelRequestedRef = useRef(false);
  // The in-flight chunk request, if any - lets Pause/Cancel abort it directly.
  const activeChunkHandleRef = useRef<ChunkHandle>({ xhr: null, abortReason: null });
  // The in-flight sign/init/complete fetch, if any - same idea for non-chunk calls.
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  // Set when we pause specifically because the browser reports we're offline,
  // so we know to auto-resume once connectivity returns.
  const autoResumeOnReconnectRef = useRef(false);
  const resumeUploadRef = useRef<() => void>(() => {});

  // ── Restore incomplete upload session from localStorage ────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('lernio_active_upload');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UploadState;
        setUploadState(parsed);
        const bytesAlreadyUploaded = (parsed.currentPart - 1) * CHUNK_SIZE;
        setUploadedBytes(Math.min(bytesAlreadyUploaded, parsed.totalSize));
        setProgress(Math.round((bytesAlreadyUploaded / parsed.totalSize) * 100));
        setPhase('paused');
        setStatusText(`Found incomplete upload for '${parsed.filename}'. Ready to resume.`);
      } catch {
        localStorage.removeItem('lernio_active_upload');
      }
    }
  }, []);

  // ── Sync pausedRef ─────────────────────────────────────────────────────────
  useEffect(() => {
    pausedRef.current = phase === 'paused';
  }, [phase]);

  // ── Track browser online/offline state, and auto-resume when we're back ───
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      if (autoResumeOnReconnectRef.current) {
        autoResumeOnReconnectRef.current = false;
        resumeUploadRef.current();
      }
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // ── Reset everything ───────────────────────────────────────────────────────
  const resetUploader = () => {
    setRawFile(null);
    setUploadFile(null);
    setUploadState(null);
    setPhase('idle');
    setProgress(0);
    setPreProgress(0);
    setUploadedBytes(0);
    setStatusText('');
    setPreStatusText('');
    setError('');
    setRemuxError('');
    setWasOptimized(false);
    autoResumeOnReconnectRef.current = false;
    localStorage.removeItem('lernio_active_upload');
  };

  // ── Cancel: abort whatever is in flight immediately, then reset ──────────
  // Per your call: Cancel keeps the partial upload on the server (we don't
  // call an abort-multipart endpoint here) but does clear the local session,
  // since "Cancel Session" is meant to fully back out. Pause (below) is the
  // "stop now, resume later" action that keeps local state around.
  const cancelUpload = () => {
    cancelRequestedRef.current = true;

    const chunkHandle = activeChunkHandleRef.current;
    if (chunkHandle.xhr) {
      chunkHandle.abortReason = 'user-cancel';
      chunkHandle.xhr.abort();
    }
    if (activeFetchControllerRef.current) {
      activeFetchControllerRef.current.abort();
    }

    resetUploader();

    // Allow a fresh upload to start normally afterward.
    setTimeout(() => { cancelRequestedRef.current = false; }, 0);
  };

  // ── Pause: abort the in-flight chunk immediately, keep state for resume ──
  const pauseUpload = () => {
    pausedRef.current = true;
    const chunkHandle = activeChunkHandleRef.current;
    if (chunkHandle.xhr) {
      chunkHandle.abortReason = 'user-pause';
      chunkHandle.xhr.abort();
    }
    setPhase('paused');
  };

  // ── Chunked multipart upload loop ─────────────────────────────────────────
  // Declared first so startNewUpload and preprocessAndUpload can reference it.
  const uploadChunks = async (currentFile: File, state: UploadState) => {
    const totalChunks = Math.ceil(currentFile.size / CHUNK_SIZE);
    let parts = [...state.parts];
    let currentPart = state.currentPart;
    let bytesDone = (currentPart - 1) * CHUNK_SIZE;

    const savePausedState = () => {
      const updatedState = { ...state, parts, currentPart };
      setUploadState(updatedState);
      localStorage.setItem('lernio_active_upload', JSON.stringify(updatedState));
      setPhase('paused');
    };

    while (currentPart <= totalChunks) {
      if (cancelRequestedRef.current) return;
      if (pausedRef.current) {
        setStatusText('Upload paused.');
        savePausedState();
        return;
      }

      const start = (currentPart - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, currentFile.size);
      const chunk = currentFile.slice(start, end);
      const doneLabel = formatMB(Math.min(bytesDone, currentFile.size));
      const totalLabel = formatMB(currentFile.size);

      let attempt = 0;
      let uploadedEtag: string | null = null;

      while (uploadedEtag === null) {
        if (cancelRequestedRef.current) return;
        if (pausedRef.current) {
          setStatusText('Upload paused.');
          savePausedState();
          return;
        }

        setStatusText(
          attempt === 0
            ? `Part ${currentPart}/${totalChunks} - ${doneLabel} MB / ${totalLabel} MB`
            : `Part ${currentPart}/${totalChunks} - retrying (${attempt}/${MAX_RETRIES})…`,
        );

        try {
          // Re-sign on every attempt: presigned URLs are time-limited, and a
          // slow or retried upload can easily outlive the original signature.
          const signRes = await fetchAbortable(
            '/api/upload/sign-part',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ key: state.key, uploadId: state.uploadId, partNumber: currentPart }),
            },
            activeFetchControllerRef,
          );
          const signData = await signRes.json();
          if (!signRes.ok) throw new Error(signData.error || 'Failed to sign part');

          const handle: ChunkHandle = { xhr: null, abortReason: null };
          activeChunkHandleRef.current = handle;

          uploadedEtag = await putChunkWithProgress(
            signData.url,
            chunk,
            currentFile.type,
            (loadedInChunk) => {
              const overallBytes = start + loadedInChunk;
              const livePct = Math.min(99, Math.round((overallBytes / currentFile.size) * 100));
              setProgress(livePct);
              setUploadedBytes(overallBytes);
              setStatusText(`Part ${currentPart}/${totalChunks} - ${formatMB(overallBytes)} MB / ${totalLabel} MB`);
            },
            handle,
          );
        } catch (err: unknown) {
          activeChunkHandleRef.current = { xhr: null, abortReason: null };

          if (err instanceof UploadAbortedError || cancelRequestedRef.current) return;
          if (err instanceof PausedError) {
            setStatusText('Upload paused.');
            savePausedState();
            return;
          }
          // A fetch abort (e.g. cancel fired mid-sign) surfaces as a DOMException.
          if (err instanceof DOMException && err.name === 'AbortError') return;

          const retryable = err instanceof RetryableError || err instanceof SignatureExpiredError;
          attempt++;

          if (!retryable || attempt > MAX_RETRIES) {
            const message = err instanceof Error ? err.message : String(err);
            const offline = typeof navigator !== 'undefined' && !navigator.onLine;
            setError(
              offline
                ? "You're offline. Your progress is saved - we'll resume automatically once you're back online."
                : `Error on part ${currentPart}: ${message}`,
            );
            if (offline) autoResumeOnReconnectRef.current = true;
            savePausedState();
            return;
          }

          // Exponential backoff, but wake up immediately if paused/cancelled
          // during the wait instead of sitting through the full delay.
          const backoffMs = BASE_BACKOFF_MS * 2 ** (attempt - 1);
          await sleepUnless(backoffMs, () => pausedRef.current || cancelRequestedRef.current);
        }
      }

      parts.push({ partNumber: currentPart, etag: uploadedEtag });
      bytesDone = end;
      currentPart++;

      const pct = Math.round((bytesDone / currentFile.size) * 100);
      setProgress(pct);
      setUploadedBytes(bytesDone);
      setStatusText(`Part ${currentPart - 1}/${totalChunks} done - ${formatMB(bytesDone)} MB / ${totalLabel} MB`);
    }

    // 3. Finalize
    if (cancelRequestedRef.current) return;
    setStatusText('Finalizing - stitching parts…');
    try {
      const completeRes = await fetchAbortable(
        '/api/upload/complete',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: state.key, uploadId: state.uploadId, parts }),
        },
        activeFetchControllerRef,
      );
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || 'Stitching failed');

      setStatusText('Upload complete!');
      setProgress(100);
      setUploadedBytes(currentFile.size);
      setPhase('done');
      localStorage.removeItem('lernio_active_upload');
      onSuccess(state.key);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : String(err);
      setError(`Stitching failed: ${message}`);
      setPhase('paused');
    }
  };

  // ── Start a brand-new multipart upload ────────────────────────────────────
  const startNewUpload = async (fileToUpload: File) => {
    setProgress(0);
    setUploadedBytes(0);
    setStatusText('Initiating resumable upload…');

    try {
      const res = await fetchAbortable(
        '/api/upload/init',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileToUpload.name, contentType: fileToUpload.type }),
        },
        activeFetchControllerRef,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize upload');

      const newState: UploadState = {
        uploadId: data.uploadId,
        key: data.key,
        filename: fileToUpload.name,
        totalSize: fileToUpload.size,
        parts: [],
        currentPart: 1,
      };

      setUploadState(newState);
      localStorage.setItem('lernio_active_upload', JSON.stringify(newState));
      uploadChunks(fileToUpload, newState);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Error initiating upload.');
      setPhase('idle');
    }
  };

  // ── Upload away as-is when remux failed ───────────────────────────────────
  const uploadUnprocessed = async () => {
    if (!rawFile) return;
    setRemuxError('');
    setUploadFile(rawFile);
    setPhase('uploading');
    await startNewUpload(rawFile);
  };

  // ── Resume a paused upload ─────────────────────────────────────────────────
  const resumeUpload = useCallback(() => {
    const fileForUpload = uploadFile ?? rawFile;
    if (!uploadState || !fileForUpload) {
      setError('Please select the original file to resume the upload.');
      return;
    }
    pausedRef.current = false;
    setPhase('uploading');
    setError('');
    uploadChunks(fileForUpload, uploadState);
  }, [uploadFile, rawFile, uploadState]);

  // Keep a stable ref to the latest resumeUpload for the online-listener effect above.
  useEffect(() => {
    resumeUploadRef.current = resumeUpload;
  }, [resumeUpload]);

  // ── Pre-process: check moov atom + optionally remux ───────────────────────
  // Declared last because it calls startNewUpload (declared above).
  const preprocessAndUpload = useCallback(async (file: File) => {
    setError('');
    setRemuxError('');
    setWasOptimized(false);

    // Step 1: Instant moov atom header check
    setPhase('checking');
    setPreStatusText('Checking video format…');
    let shouldFix = false;
    try {
      shouldFix = await needsFastStart(file);
    } catch {
      // If we can't read the header, skip the fix and upload as-is.
      shouldFix = false;
    }

    // If file is too large for in-browser processing, skip the fix.
    if (shouldFix && file.size > MAX_PROCESSABLE_BYTES) {
      shouldFix = false;
      setError(
        `⚠️ Video is larger than 2 GB - skipping streaming optimization. ` +
        `Progressive playback may be limited for this video.`,
      );
    }

    if (!shouldFix) {
      // No fix needed - go straight to upload.
      setUploadFile(file);
      setPreStatusText('');
      setPhase('uploading');
      await startNewUpload(file);
      return;
    }

    // Step 2: Load FFmpeg WASM + remux
    let remuxedFile: File;
    try {
      setPhase('loading-ffmpeg');
      setPreProgress(0);

      remuxedFile = await applyFastStart(file, (p: RemuxProgress) => {
        setPreProgress(p.percent);
        setPreStatusText(p.label);
        if (p.phase === 'remuxing') {
          setPhase('remuxing');
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setRemuxError(message);
      setPhase('remux-error');
      return;
    }

    setWasOptimized(true);
    setUploadFile(remuxedFile);
    setPhase('uploading');
    await startNewUpload(remuxedFile);
  }, []);

  // ── File input handler ─────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setRawFile(selected);

    if (uploadState && uploadState.filename !== selected.name) {
      setError('File name does not match the saved upload session. Starting fresh.');
      localStorage.removeItem('lernio_active_upload');
      setUploadState(null);
      setProgress(0);
      setUploadedBytes(0);
      setPhase('idle');
    }
  };

  // ── Derived UI values ──────────────────────────────────────────────────────
  const isPreprocessing = phase === 'checking' || phase === 'loading-ffmpeg' || phase === 'remuxing';
  const isUploading = phase === 'uploading';
  const isActive = isPreprocessing || isUploading;
  const totalMB = (uploadFile ?? rawFile)?.size ?? uploadState?.totalSize ?? 0;

  // Phase-specific labels
  const phaseIcon: Record<string, React.ReactNode> = {
    'checking': <Loader2 size={11} className="animate-spin text-[#9334e9]" />,
    'loading-ffmpeg': <Loader2 size={11} className="animate-spin text-[#9334e9]" />,
    'remuxing': <Zap size={11} className="text-[#9334e9]" />,
    'uploading': <Loader2 size={11} className="animate-spin text-blue-500" />,
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">Video File</h3>
        {(uploadState || phase !== 'idle') && (
          <button
            onClick={cancelUpload}
            className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:underline"
          >
            <X size={11} />
            Cancel Session
          </button>
        )}
      </div>

      <div className="space-y-3 text-xs">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={isActive}
          className="w-full cursor-pointer text-xs text-[#5f6368] file:mr-3 file:rounded-full file:border-0 file:bg-[#e8f0fe] file:px-3.5 file:py-1.5  file:font-medium hover:file:bg-[#d2e3fc]"
        />

        {rawFile && (
          <div className="text-[10px] text-[#5f6368]">
            <span className="font-medium text-[#3c4043]">{rawFile.name}</span>
            {' '}- {formatMB(rawFile.size)} MB
          </div>
        )}

        {/* ── Offline indicator ───────────────────────────────────────────── */}
        {isOffline && isActive && (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#fce8e6] bg-[#fef7f6] px-2.5 py-1.5 text-[10px] font-medium text-[#b06000]">
            <WifiOff size={11} />
            You&rsquo;re offline - we&rsquo;ll resume automatically once connectivity returns.
          </div>
        )}

        {/* ── Optimization badge (shown after successful remux) ─────────── */}
        {wasOptimized && (
          <div className="flex items-center gap-1.5 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-2.5 py-1.5 text-[10px] font-medium text-[#137333]">
            <Zap size={11} />
            Video optimized for streaming (moov atom moved to start)
          </div>
        )}

        {/* ── Pre-processing progress (check → load ffmpeg → remux) ───── */}
        {isPreprocessing && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#7627e8]">
              {phaseIcon[phase]}
              <span>{preStatusText || 'Preparing…'}</span>
            </div>
            {(phase === 'loading-ffmpeg' || phase === 'remuxing') && (
              <>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8eaed]">
                  <div
                    className="h-full rounded-full bg-[#9334e9] transition-all duration-300"
                    style={{ width: `${preProgress}%` }}
                  />
                </div>
                <div className="text-right text-[9px] tabular-nums text-[#5f6368]">
                  {preProgress}%
                </div>
              </>
            )}
            {phase === 'loading-ffmpeg' && preProgress === 0 && (
              <p className="text-[9px] text-[#80868b]">
                Downloading FFmpeg engine once - cached for future uploads.
              </p>
            )}
          </div>
        )}

        {/* ── Remux error banner ────────────────────────────────────────── */}
        {phase === 'remux-error' && (
          <div className="space-y-2 rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-2.5">
            <div className="flex items-start gap-1.5 text-[10px] text-[#c5221f]">
              <AlertTriangle size={11} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold">Streaming optimization failed.</span>{' '}
                {remuxError ? `(${remuxError})` : ''}{' '}
                You can still upload the original file, but progressive playback
                may require the full video to download first.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={uploadUnprocessed}
                className="flex items-center gap-1 rounded-full bg-[#c5221f] px-3 py-1 text-[10px] font-medium text-white hover:bg-[#a50e0e]"
              >
                <WifiOff size={10} />
                Upload anyway
              </button>
              <button
                type="button"
                onClick={resetUploader}
                className="rounded-full border border-[#fad2cf] px-3 py-1 text-[10px] text-[#c5221f] hover:bg-[#fce8e6]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Upload progress block ─────────────────────────────────────── */}
        {(isUploading || phase === 'paused' || phase === 'done') && progress >= 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#5f6368]">
              <span>{statusText}</span>
              <span className="font-semibold tabular-nums text-[#3c4043]">{progress}%</span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8eaed]">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            {totalMB > 0 && (
              <div className="flex justify-between text-[10px] tabular-nums text-[#5f6368]">
                <span>{formatMB(uploadedBytes)} MB uploaded</span>
                <span>{formatMB(totalMB)} MB total</span>
              </div>
            )}
          </div>
        )}

        {/* ── General error ─────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-2.5 text-[10px] text-[#c5221f]">
            {error}
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {/* Start upload - shown when no active session */}
          {!uploadState && phase === 'idle' && (
            <button
              type="button"
              onClick={() => rawFile && preprocessAndUpload(rawFile)}
              disabled={!rawFile}
              className="flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md disabled:cursor-not-allowed"
            >
              <Upload size={13} />
              Start Upload
            </button>
          )}

          {/* Resume - shown when paused with existing session */}
          {uploadState && phase === 'paused' && (
            <button
              type="button"
              onClick={resumeUpload}
              disabled={!rawFile && !uploadFile}
              className="flex items-center gap-1.5 rounded-full bg-[#f9ab00] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#e8a000] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play size={13} />
              Resume
            </button>
          )}

          {/* Pause - shown while uploading */}
          {isUploading && (
            <button
              type="button"
              onClick={pauseUpload}
              className="flex items-center gap-1.5 rounded-full border border-[#feefc3] bg-[#fef7e0] px-4 py-1.5 text-xs font-medium text-[#b06000] transition-colors hover:bg-[#fdedc0]"
            >
              <Pause size={13} />
              Pause
            </button>
          )}

          {/* Spinner while any async work is running */}
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] text-[#5f6368]">
              {phaseIcon[phase]}
              {isPreprocessing ? 'Processing…' : 'Transferring…'}
            </span>
          )}

          {/* Done badge */}
          {phase === 'done' && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#137333]">
              <CheckCircle size={11} />
              Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
