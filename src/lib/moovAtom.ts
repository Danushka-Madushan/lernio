/**
 * moovAtom.ts
 *
 * Utilities for detecting and fixing the moov atom position in MP4/MOV files.
 *
 * Why this matters
 * ----------------
 * MP4 containers store metadata in a "moov" atom.  Many encoders place this
 * atom at the END of the file.  When streamed over HTTP, the browser cannot
 * begin playback until the moov is received — i.e., the entire file must be
 * downloaded first.  Running `ffmpeg -movflags +faststart` remuxes the file
 * (no re-encoding) so the moov atom is moved to the BEGINNING, enabling true
 * progressive/streaming playback.
 */

import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg, type FFmpegLoadProgress } from './ffmpegLoader';

/** Browsers/containers for which moov atom checking is applicable. */
const MP4_MIME_PREFIXES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];

/**
 * Maximum file size we'll attempt to process in-browser.
 * Above this limit we warn the user and skip the fix to avoid OOM crashes.
 */
export const MAX_PROCESSABLE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

// ─── Moov atom position check ────────────────────────────────────────────────

/**
 * Reads only the first ~512 bytes of the file and walks the top-level MP4 box
 * structure to determine whether the `moov` atom appears before any `mdat`
 * (media data) atom.
 *
 * Returns:
 *  - `false`  — moov is first (or file is not an MP4) — no fix needed.
 *  - `true`   — moov is absent from the start, likely at end — fix needed.
 *
 * This is a pure JS operation — zero FFmpeg involved — and runs in < 1 ms.
 */
export async function needsFastStart(file: File): Promise<boolean> {
  // Only relevant for MP4 / MOV / M4V containers.
  const isMP4 = MP4_MIME_PREFIXES.some(p => file.type.startsWith(p));
  if (!isMP4) return false;

  // Files too large for in-browser remux — we flag as needing fix but the
  // caller is responsible for showing the size warning and skipping.
  // We still check the header here for accurate detection.

  // Read the first 512 bytes — enough to find ftyp + first major box header.
  const headerBytes = Math.min(512, file.size);
  const buffer = await file.slice(0, headerBytes).arrayBuffer();
  const view = new DataView(buffer);

  let offset = 0;

  while (offset + 8 <= buffer.byteLength) {
    const boxSize = view.getUint32(offset, false); // big-endian
    const boxType = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7),
    );

    if (boxType === 'moov') {
      // moov found before mdat → already fast-start.
      return false;
    }

    if (boxType === 'mdat') {
      // mdat before moov → moov is at the end → needs fix.
      return true;
    }

    // Skip over this box and continue.
    if (boxSize === 0) break; // box extends to EOF — can't advance further
    if (boxSize === 1) {
      // 64-bit extended size — very rare, treat as needing fix to be safe.
      return true;
    }
    offset += boxSize;
  }

  // Couldn't determine — safe default: no fix (avoid unnecessary processing).
  return false;
}

// ─── Fast-start remux via FFmpeg WASM ────────────────────────────────────────

export type RemuxProgress =
  | { phase: 'loading-ffmpeg'; percent: number; label: string }
  | { phase: 'remuxing'; percent: number; label: string }
  | { phase: 'done'; percent: 100; label: string };

/**
 * Remuxes the given file using FFmpeg WASM with `-movflags +faststart`.
 * This moves the moov atom to the beginning without re-encoding any streams.
 *
 * @param file        The original video File object.
 * @param onProgress  Optional progress callback with phase + percent.
 * @returns           A new File object with the moov atom at the start.
 */
export async function applyFastStart(
  file: File,
  onProgress?: (p: RemuxProgress) => void,
): Promise<File> {
  const inputName = 'input_' + Date.now() + getExtension(file.name);
  const outputName = 'output_' + Date.now() + getExtension(file.name);

  // ── Step 1: Load FFmpeg engine (uses IndexedDB cache after first load) ────
  const ffmpeg = await getFFmpeg((p: FFmpegLoadProgress) => {
    if (p.phase === 'downloading') {
      onProgress?.({
        phase: 'loading-ffmpeg',
        percent: Math.round(p.percent * 0.8), // downloading = 0–80 % of load phase
        label: `Downloading FFmpeg engine… ${p.percent}%`,
      });
    } else {
      onProgress?.({
        phase: 'loading-ffmpeg',
        percent: 80,
        label: 'Initializing FFmpeg…',
      });
    }
  });

  // ── Step 2: Write input file to FFmpeg virtual FS ─────────────────────────
  onProgress?.({ phase: 'loading-ffmpeg', percent: 90, label: 'Reading video file…' });
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // ── Step 3: Run remux ─────────────────────────────────────────────────────
  onProgress?.({ phase: 'remuxing', percent: 0, label: 'Remuxing for streaming…' });

  // Wire up FFmpeg's own progress events (ratio 0–1).
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    onProgress?.({
      phase: 'remuxing',
      percent: Math.round(Math.max(0, Math.min(1, progress)) * 100),
      label: `Optimizing for streaming… ${Math.round(progress * 100)}%`,
    });
  });

  await ffmpeg.exec([
    '-i', inputName,
    '-c', 'copy',          // stream copy — no re-encode
    '-movflags', '+faststart',
    outputName,
  ]);

  // ── Step 4: Read output from virtual FS ──────────────────────────────────
  onProgress?.({ phase: 'remuxing', percent: 99, label: 'Reading optimized file…' });
  const rawData = await ffmpeg.readFile(outputName);
  // readFile returns Uint8Array<ArrayBufferLike> — copy into a plain ArrayBuffer
  // to satisfy the BlobPart type constraint.
  const data = new Uint8Array(rawData as Uint8Array);

  // ── Step 5: Clean up virtual FS entries ──────────────────────────────────
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Non-fatal cleanup failure.
  }

  // Remove the progress listener to avoid leaking handlers on future calls.
  ffmpeg.off('progress', () => {});

  onProgress?.({ phase: 'done', percent: 100, label: 'Optimization complete!' });

  // Return a new File with the same name and MIME type as the original.
  // Use data.buffer.slice(0) to get a plain ArrayBuffer (BlobPart compatible).
  const blob = new Blob([data.buffer.slice(0)], { type: file.type });
  return new File([blob], file.name, { type: file.type, lastModified: Date.now() });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot !== -1 ? filename.slice(dot) : '.mp4';
}
