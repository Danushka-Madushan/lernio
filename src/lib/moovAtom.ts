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
  const isMP4 = MP4_MIME_PREFIXES.some((p) => file.type.startsWith(p));
  if (!isMP4) return false;

  let offset = 0;

  // ─── TOP-LEVEL BOX SCAN ────────────────────────────────────────────────────
  while (offset + 8 <= file.size) {
    const headerBlob = file.slice(offset, offset + 8);
    const buffer = await headerBlob.arrayBuffer();
    const view = new DataView(buffer);

    let boxSize = view.getUint32(0, false);
    const boxType = String.fromCharCode(
      view.getUint8(4),
      view.getUint8(5),
      view.getUint8(6),
      view.getUint8(7)
    );

    let headerLength = 8;

    // Handle 64-bit extended box sizes
    if (boxSize === 1) {
      if (offset + 16 > file.size) break;
      const extHeaderBlob = file.slice(offset + 8, offset + 16);
      const extBuffer = await extHeaderBlob.arrayBuffer();
      const extView = new DataView(extBuffer);
      boxSize = Number(extView.getBigUint64(0, false));
      headerLength = 16;
    } else if (boxSize === 0) {
      // Size 0 means box extends to EOF
      boxSize = file.size - offset; 
    }

    // Infinite loop protection
    if (boxSize < headerLength) {
      console.warn(`[MP4 Parser] Invalid box size (${boxSize}) at offset ${offset}.`);
      return false;
    }

    if (boxType === 'mdat') {
      // mdat found before a valid moov -> needs optimization
      return true;
    }

    if (boxType === 'moov') {
      // ─── NESTED MOOV SCAN (Checking for fMP4) ─────────────────────────────
      // We found moov at the front! But we must verify it is a complete 
      // progressive map, not just a fragmented header.
      let subOffset = offset + headerLength;
      const moovEnd = offset + boxSize;

      while (subOffset + 8 <= moovEnd && subOffset + 8 <= file.size) {
        const subHeaderBlob = file.slice(subOffset, subOffset + 8);
        const subBuffer = await subHeaderBlob.arrayBuffer();
        const subView = new DataView(subBuffer);

        let subBoxSize = subView.getUint32(0, false);
        const subBoxType = String.fromCharCode(
          subView.getUint8(4),
          subView.getUint8(5),
          subView.getUint8(6),
          subView.getUint8(7)
        );

        let subHeaderLength = 8;

        if (subBoxSize === 1) {
          if (subOffset + 16 > file.size) break;
          const subExtBlob = file.slice(subOffset + 8, subOffset + 16);
          const subExtView = new DataView(await subExtBlob.arrayBuffer());
          subBoxSize = Number(subExtView.getBigUint64(0, false));
          subHeaderLength = 16;
        } else if (subBoxSize === 0) {
          subBoxSize = moovEnd - subOffset;
        }

        if (subBoxSize < subHeaderLength) break;

        if (subBoxType === 'mvex') {
          // Found the 'Movie Extends' box. This confirms the file is a 
          // Fragmented MP4 (fMP4) and its index is scattered.
          // FFmpeg must consolidate this into a single moov+mdat stream.
          return true;
        }

        subOffset += subBoxSize;
      }

      // If we scanned the immediate children of moov and found no 'mvex',
      // it is a true, fully mapped progressive moov at the front of the file.
      return false;
    }

    // Jump to the next top-level box
    offset += boxSize;
  }

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
