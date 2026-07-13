'use client';

/**
 * ThumbnailUploader
 *
 * Validates, compresses, and uploads a video thumbnail image.
 *
 * Rules (matching YouTube's standard):
 *  - Accepted formats: JPG, PNG only
 *  - Aspect ratio must be exactly 16:9 (tolerance ±2%)
 *  - Resized to 1280×720 via Canvas before upload
 *  - Compressed to JPEG quality 0.88 — resulting file is always ≤ 2 MB in practice
 *  - If the canvas output somehow exceeds 2 MB the file is rejected with an error
 *
 * On success calls onSuccess(url) with the ImgBB direct image URL.
 */

import React, { useState, useRef } from 'react';
import { ImagePlus, CheckCircle2, Loader2, X, AlertTriangle } from 'lucide-react';

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ASPECT_RATIO = 16 / 9;
const ASPECT_TOLERANCE = 0.02; // ±2%

interface ThumbnailUploaderProps {
  onSuccess: (url: string) => void;
  existingPreview?: string; // Optional existing thumbnail URL for edit mode
}

/**
 * Compress an image File to 1280×720 JPEG using the Canvas API.
 * Returns a Blob ready for upload.
 */
async function compressToYouTubeStandard(file: File): Promise<{ blob: Blob; previewUrl: string; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth: w, naturalHeight: h } = img;
      const ratio = w / h;
      const deviation = Math.abs(ratio - ASPECT_RATIO) / ASPECT_RATIO;

      if (deviation > ASPECT_TOLERANCE) {
        resolve({
          blob: new Blob(),
          previewUrl: '',
          error: `Image aspect ratio is ${ratio.toFixed(2)}:1 — must be 16:9 (${ASPECT_RATIO.toFixed(2)}:1). Please crop your image before uploading.`,
        });
        return;
      }

      // Draw onto a 1280×720 canvas
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ blob: new Blob(), previewUrl: '', error: 'Canvas compression failed.' });
            return;
          }

          if (blob.size > MAX_BYTES) {
            resolve({
              blob,
              previewUrl: '',
              error: `Compressed file is ${(blob.size / 1024 / 1024).toFixed(1)} MB — still exceeds 2 MB after compression. Use a less complex image.`,
            });
            return;
          }

          const previewUrl = URL.createObjectURL(blob);
          resolve({ blob, previewUrl });
        },
        'image/jpeg',
        0.88
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: new Blob(), previewUrl: '', error: 'Could not load the selected image file.' });
    };

    img.src = objectUrl;
  });
}

export default function ThumbnailUploader({ onSuccess, existingPreview }: ThumbnailUploaderProps) {
  const [preview, setPreview] = useState<string>(existingPreview ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0–100 simulated
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [compressedSize, setCompressedSize] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Simulate XHR upload progress (ImgBB doesn't support streaming progress, but we can still show animation)
  const simulateProgress = () => {
    let p = 0;
    setUploadProgress(0);
    const interval = setInterval(() => {
      p += Math.random() * 18;
      if (p >= 90) {
        clearInterval(interval);
        setUploadProgress(90);
      } else {
        setUploadProgress(Math.round(p));
      }
    }, 120);
    return () => clearInterval(interval);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setErrorMsg('');
    setStatus('idle');
    setPreview('');
    setUploadProgress(0);

    // Format check
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg('Only JPG and PNG images are accepted.');
      setStatus('error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Step 1: Compress client-side
    setStatus('compressing');
    const { blob, previewUrl, error } = await compressToYouTubeStandard(file);

    if (error) {
      setErrorMsg(error);
      setStatus('error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
    setCompressedSize(`${sizeMB} MB`);
    setPreview(previewUrl);

    // Step 2: Upload to ImgBB via our backend
    setStatus('uploading');
    setUploading(true);
    const stopProgress = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('file', blob, 'thumbnail.jpg');

      const res = await fetch('/api/upload/thumbnail', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      stopProgress();

      if (res.ok && data.success) {
        setUploadProgress(100);
        setStatus('done');
        onSuccess(data.key); // ImgBB direct URL
      } else {
        setErrorMsg(data.error || 'Upload to ImgBB failed.');
        setStatus('error');
        setPreview('');
      }
    } catch {
      stopProgress();
      setErrorMsg('Connection error during thumbnail upload.');
      setStatus('error');
      setPreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreview('');
    setStatus('idle');
    setErrorMsg('');
    setUploadProgress(0);
    setCompressedSize('');
    if (inputRef.current) inputRef.current.value = '';
    onSuccess(''); // Signal clear to parent
  };

  return (
    <div className="space-y-2">
      {/* Drop zone / file picker */}
      {status !== 'done' && (
        <label
          htmlFor="thumbnail-input"
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-radius-xs p-4 cursor-pointer transition-colors
            ${status === 'error' ? 'border-red-300 bg-red-50' : 'border-surface-strong bg-surface-muted/40 hover:border-neutral-400 hover:bg-surface-muted'}`}
        >
          <ImagePlus size={20} className={status === 'error' ? 'text-red-400' : 'text-text-tertiary'} />
          <span className="text-[11px] text-text-tertiary text-center leading-relaxed">
            Click to select a JPG or PNG cover image
            <br />
            <span className="text-[10px]">Must be 16:9 ratio — will be resized to 1280×720</span>
          </span>
          <input
            ref={inputRef}
            id="thumbnail-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            disabled={uploading || status === 'compressing'}
            className="hidden"
          />
        </label>
      )}

      {/* Error message */}
      {status === 'error' && errorMsg && (
        <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-radius-xs p-2">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compressing indicator */}
      {status === 'compressing' && (
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <Loader2 size={12} className="animate-spin" />
          Validating aspect ratio and compressing to 1280×720…
        </div>
      )}

      {/* Upload progress */}
      {(status === 'uploading' || status === 'done') && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-text-tertiary">
            <span>
              {status === 'done' ? (
                <span className="text-green-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Uploaded — {compressedSize}
                </span>
              ) : (
                `Uploading to ImgBB… ${compressedSize}`
              )}
            </span>
            <span className="tabular-nums font-semibold text-text-secondary">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-surface-strong h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${status === 'done' ? 'bg-green-500' : 'bg-black'}`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview + result */}
      {preview && status !== 'error' && (
        <div className="flex items-start gap-3">
          <div className="relative w-32 aspect-video rounded border border-surface-strong overflow-hidden bg-black shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Thumbnail preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-between h-full gap-2 pt-1">
            <div className="text-[10px] text-text-tertiary space-y-0.5">
              <p className="font-semibold text-green-600">1280 × 720 · JPEG</p>
              <p>{compressedSize}</p>
            </div>
            {status === 'done' && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 transition-colors"
              >
                <X size={10} />
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
