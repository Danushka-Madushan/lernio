'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Play, Pause, X, CheckCircle, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB per part (AWS/R2 minimum is 5 MB)

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

function formatMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function ResumableUploader({ onSuccess }: ResumableUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  const pausedRef = useRef(false);

  // Check localStorage for active incomplete upload on mount
  useEffect(() => {
    const saved = localStorage.getItem('lernio_active_upload');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UploadState;
        setUploadState(parsed);
        // Restore uploaded bytes from saved state
        const bytesAlreadyUploaded = (parsed.currentPart - 1) * CHUNK_SIZE;
        setUploadedBytes(Math.min(bytesAlreadyUploaded, parsed.totalSize));
        setProgress(Math.round((bytesAlreadyUploaded / parsed.totalSize) * 100));
        setStatusText(`Found incomplete upload for '${parsed.filename}'. Ready to resume.`);
      } catch {
        localStorage.removeItem('lernio_active_upload');
      }
    }
  }, []);

  // Sync paused ref
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const resetUploader = () => {
    setFile(null);
    setUploadState(null);
    setUploading(false);
    setPaused(false);
    setProgress(0);
    setUploadedBytes(0);
    setStatusText('');
    setError('');
    localStorage.removeItem('lernio_active_upload');
  };

  const startNewUpload = async () => {
    if (!file) return;
    setUploading(true);
    setPaused(false);
    setError('');
    setUploadedBytes(0);
    setStatusText('Initiating resumable upload…');

    try {
      const res = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize upload');

      const newState: UploadState = {
        uploadId: data.uploadId,
        key: data.key,
        filename: file.name,
        totalSize: file.size,
        parts: [],
        currentPart: 1,
      };

      setUploadState(newState);
      localStorage.setItem('lernio_active_upload', JSON.stringify(newState));
      uploadChunks(file, newState);
    } catch (err: any) {
      setError(err.message || 'Error initiating upload.');
      setUploading(false);
    }
  };

  const resumeUpload = () => {
    if (!uploadState || !file) {
      setError('Please select the original file to resume the upload.');
      return;
    }
    setUploading(true);
    setPaused(false);
    setError('');
    uploadChunks(file, uploadState);
  };

  const uploadChunks = async (currentFile: File, state: UploadState) => {
    const totalChunks = Math.ceil(currentFile.size / CHUNK_SIZE);
    let parts = [...state.parts];
    let currentPart = state.currentPart;

    // Restore byte progress from already-completed parts
    let bytesDone = (currentPart - 1) * CHUNK_SIZE;

    while (currentPart <= totalChunks) {
      if (pausedRef.current) {
        setStatusText('Upload paused.');
        const updatedState = { ...state, parts, currentPart };
        setUploadState(updatedState);
        localStorage.setItem('lernio_active_upload', JSON.stringify(updatedState));
        setUploading(false);
        return;
      }

      const start = (currentPart - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, currentFile.size);
      const chunk = currentFile.slice(start, end);

      // MB display label
      const doneLabel = formatMB(Math.min(bytesDone, currentFile.size));
      const totalLabel = formatMB(currentFile.size);
      setStatusText(`Part ${currentPart}/${totalChunks} — ${doneLabel} MB / ${totalLabel} MB`);

      try {
        // 1. Sign this part
        const signRes = await fetch('/api/upload/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: state.key, uploadId: state.uploadId, partNumber: currentPart }),
        });
        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData.error || 'Failed to sign part');

        // 2. PUT the chunk directly to R2
        const uploadRes = await fetch(signData.url, {
          method: 'PUT',
          body: chunk,
          headers: { 'Content-Type': currentFile.type },
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload part ${currentPart}`);

        const etag = uploadRes.headers.get('ETag');
        if (!etag) throw new Error(`No ETag returned for part ${currentPart}`);

        parts.push({ partNumber: currentPart, etag });
        bytesDone = end; // end of this chunk is now confirmed done
        currentPart++;

        const pct = Math.round((bytesDone / currentFile.size) * 100);
        setProgress(pct);
        setUploadedBytes(bytesDone);

        // Update status to reflect post-chunk state
        const doneLabelPost = formatMB(bytesDone);
        setStatusText(`Part ${currentPart - 1}/${totalChunks} done — ${doneLabelPost} MB / ${totalLabel} MB`);
      } catch (err: any) {
        setError(`Error on part ${currentPart}: ${err.message}`);
        setUploading(false);
        const updatedState = { ...state, parts, currentPart };
        setUploadState(updatedState);
        localStorage.setItem('lernio_active_upload', JSON.stringify(updatedState));
        return;
      }
    }

    // 3. Finalize
    setStatusText('Finalizing — stitching parts…');
    try {
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: state.key, uploadId: state.uploadId, parts }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || 'Stitching failed');

      setStatusText('Upload complete!');
      setProgress(100);
      setUploadedBytes(currentFile.size);
      setUploading(false);
      localStorage.removeItem('lernio_active_upload');
      onSuccess(state.key);
    } catch (err: any) {
      setError(`Stitching failed: ${err.message}`);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    if (uploadState && uploadState.filename !== selected.name) {
      setError('File name does not match the saved upload session. Starting fresh.');
      localStorage.removeItem('lernio_active_upload');
      setUploadState(null);
      setProgress(0);
      setUploadedBytes(0);
    }
  };

  const totalMB = file?.size ?? uploadState?.totalSize ?? 0;

  return (
    <div className="space-y-4 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">Video File</h3>
        {uploadState && (
          <button
            onClick={resetUploader}
            className="flex items-center gap-1 text-[10px] font-medium text-[#d93025] hover:underline"
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
          disabled={uploading}
          className="w-full cursor-pointer text-xs text-[#5f6368] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#e8f0fe] file:px-3.5 file:py-1.5 file:text-xs file:font-medium file:text-[#1a73e8] hover:file:bg-[#d2e3fc]"
        />

        {file && (
          <div className="text-[10px] text-[#5f6368]">
            <span className="font-medium text-[#3c4043]">{file.name}</span>
            {' '}— {formatMB(file.size)} MB
          </div>
        )}

        {/* Progress Block */}
        {(uploading || progress > 0) && (
          <div className="space-y-1.5">
            {/* Status + Percentage row */}
            <div className="flex items-center justify-between text-[10px] text-[#5f6368]">
              <span>{statusText}</span>
              <span className="font-semibold tabular-nums text-[#3c4043]">{progress}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8eaed]">
              <div
                className="h-full rounded-full bg-[#1a73e8] transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* MB counter */}
            {totalMB > 0 && (
              <div className="flex justify-between text-[10px] tabular-nums text-[#5f6368]">
                <span>{formatMB(uploadedBytes)} MB uploaded</span>
                <span>{formatMB(totalMB)} MB total</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-2.5 text-[10px] text-[#c5221f]">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {!uploadState ? (
            <button
              type="button"
              onClick={startNewUpload}
              disabled={!file || uploading}
              className="flex items-center gap-1.5 rounded-full bg-[#1a73e8] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none"
            >
              <Upload size={13} />
              Start Upload
            </button>
          ) : (
            <>
              {!uploading ? (
                <button
                  type="button"
                  onClick={resumeUpload}
                  disabled={!file}
                  className="flex items-center gap-1.5 rounded-full bg-[#f9ab00] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#e8a000] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Play size={13} />
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { pausedRef.current = true; setPaused(true); }}
                  className="flex items-center gap-1.5 rounded-full border border-[#feefc3] bg-[#fef7e0] px-4 py-1.5 text-xs font-medium text-[#b06000] transition-colors hover:bg-[#fdedc0]"
                >
                  <Pause size={13} />
                  Pause
                </button>
              )}
            </>
          )}

          {uploading && (
            <span className="flex items-center gap-1 text-[10px] text-[#5f6368]">
              <Loader2 size={11} className="animate-spin text-[#1a73e8]" />
              Transferring…
            </span>
          )}

          {progress === 100 && !uploading && (
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
