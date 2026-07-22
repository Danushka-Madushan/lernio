'use client';

/**
 * ThumbnailUploader
 *
 * Validates, compresses, crops, and uploads a video thumbnail image.
 *
 * Rules:
 *  - Accepted formats: JPG, PNG only
 *  - If aspect ratio is exactly 16:9, uploads automatically.
 *  - If aspect ratio differs, opens a real-time visual cropper.
 *  - Resized to 1280×720 via Canvas before upload.
 *  - Compressed to JPEG quality 0.88 (≤ 2 MB).
 */

import { useState, useRef, useCallback } from 'react';
import { ImagePlus, CheckCircle2, Loader2, X, AlertTriangle, Crop as CropIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
const MAX_BYTES = 1.3 * 1024 * 1024; // 1.3 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ASPECT_RATIO = 16 / 9;
const ASPECT_TOLERANCE = 0.02; // ±2%

interface ThumbnailUploaderProps {
  onSuccess: (url: string) => void;
  existingPreview?: string;
}

/**
 * Extract a cropped area from an image source and compress it to 1280x720 JPEG.
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<{ blob: Blob; previewUrl: string; error?: string }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = imageSrc;
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ blob: new Blob(), previewUrl: '', error: 'Canvas not supported by browser.' });
        return;
      }

      // Draw the exact cropped box mapped to 1280x720 output
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        TARGET_WIDTH,
        TARGET_HEIGHT
      );

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
              error: `Compressed file is ${(blob.size / 1024 / 1024).toFixed(1)} MB — still exceeds 2 MB. Use a less complex image.`,
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

    image.onerror = () => {
      resolve({ blob: new Blob(), previewUrl: '', error: 'Could not load the image file into canvas.' });
    };
  });
}

export default function ThumbnailUploader({ onSuccess, existingPreview }: ThumbnailUploaderProps) {
  // Base State
  const [preview, setPreview] = useState<string>(existingPreview ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'uploading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [compressedSize, setCompressedSize] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Cropper State
  const [originalImageSrc, setOriginalImageSrc] = useState<string>('');
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

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

    // Reset base UI
    setErrorMsg('');
    setStatus('idle');
    setPreview('');
    setUploadProgress(0);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg('Only JPG and PNG images are accepted.');
      setStatus('error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const src = URL.createObjectURL(file);
    setOriginalImageSrc(src);

    // Dimension Check
    const img = new Image();
    img.onload = async () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      const deviation = Math.abs(ratio - ASPECT_RATIO) / ASPECT_RATIO;

      if (deviation > ASPECT_TOLERANCE) {
        // Needs cropping — open modal
        setShowCropper(true);
      } else {
        // Fits criteria automatically — process immediately
        const fullCrop = { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
        await processAndUpload(src, fullCrop);
      }
    };
    
    img.onerror = () => {
      setErrorMsg('Could not load the selected image file.');
      setStatus('error');
    };
    
    img.src = src;
  };

  const processAndUpload = async (imageSrc: string, pixelCrop: any) => {
    setStatus('compressing');
    setShowCropper(false);

    // Step 1: Compress & Crop Client-side
    const { blob, previewUrl, error } = await getCroppedImg(imageSrc, pixelCrop);

    if (error || !blob) {
      setErrorMsg(error || 'Image compression failed.');
      setStatus('error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
    setCompressedSize(`${sizeMB} MB`);
    setPreview(previewUrl);

    // Step 2: Upload to Server
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
        onSuccess(data.key);
      } else {
        setErrorMsg(data.error || 'Upload failed.');
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

  const handleCancelCrop = () => {
    setShowCropper(false);
    if (status !== 'done') {
      setStatus('idle');
      setOriginalImageSrc('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleClear = () => {
    setPreview('');
    setStatus('idle');
    setErrorMsg('');
    setUploadProgress(0);
    setCompressedSize('');
    setOriginalImageSrc('');
    if (inputRef.current) inputRef.current.value = '';
    onSuccess('');
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  return (
    <div className="space-y-2.5">
      {/* Drop zone / file picker */}
      {status !== 'done' && (
        <label
          htmlFor="thumbnail-input"
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-colors duration-150
            ${status === 'error' ? 'border-[#fad2cf] bg-[#fce8e6]' : 'border-[#dadce0] bg-[#f8f9fa] hover:border-[#1a73e8] hover:bg-[#e8f0fe]/40'}`}
        >
          <ImagePlus size={20} className={status === 'error' ? 'text-[#d93025]' : 'text-[#5f6368]'} />
          <span className="text-center text-[11px] leading-relaxed text-[#5f6368]">
            Click to select a JPG or PNG cover image
            <br />
            <span className="text-[10px] text-[#9aa0a6]">Will be locked and resized to 16:9 (1280×720)</span>
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
        <div className="flex items-start gap-2 rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-2.5 text-[11px] text-[#c5221f]">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compressing indicator */}
      {status === 'compressing' && (
        <div className="flex items-center gap-2 text-[11px] text-[#5f6368]">
          <Loader2 size={12} className="animate-spin text-[#1a73e8]" />
          Cropping and compressing to 1280×720…
        </div>
      )}

      {/* Upload progress */}
      {(status === 'uploading' || status === 'done') && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-[#5f6368]">
            <span>
              {status === 'done' ? (
                <span className="flex items-center gap-1 font-semibold text-[#137333]">
                  <CheckCircle2 size={11} /> Uploaded — {compressedSize}
                </span>
              ) : (
                `Uploading… ${compressedSize}`
              )}
            </span>
            <span className="tabular-nums font-semibold text-[#3c4043]">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e8eaed]">
            <div
              className={`h-full rounded-full transition-all duration-200 ${status === 'done' ? 'bg-[#34a853]' : 'bg-[#1a73e8]'}`}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview + Edit/Remove Controls */}
      {preview && status !== 'error' && (
        <div className="flex items-start gap-3">
          <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg border border-[#e8eaed] bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Thumbnail preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex h-full flex-col justify-between gap-2 pt-1">
            <div className="space-y-0.5 text-[10px] text-[#5f6368]">
              <p className="font-semibold text-[#137333]">1280 × 720 · JPEG</p>
              <p>{compressedSize}</p>
            </div>
            
            {status === 'done' && (
              <div className="flex items-center gap-3">
                {originalImageSrc && (
                  <button
                    type="button"
                    onClick={() => setShowCropper(true)}
                    className="flex items-center gap-1 text-[10px] font-medium text-[#1a73e8] transition-colors hover:text-[#1765cc]"
                  >
                    <CropIcon size={10} />
                    Edit Size
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#d93025] transition-colors hover:text-[#a50e0e]"
                >
                  <X size={10} />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cropping Modal Overlay */}
      {showCropper && (
        <div className="fixed inset-0 z-999 flex items-center justify-center bg-[#202124]/60 p-4 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e8eaed] px-5 py-4">
              <div>
                <h3 className="text-[15px] font-medium text-[#202124]">Crop Thumbnail</h3>
                <p className="text-xs text-[#5f6368]">Adjust the frame. It will be mapped directly to 1280×720.</p>
              </div>
              <button 
                onClick={handleCancelCrop} 
                className="rounded-full p-2 text-[#5f6368] transition-colors hover:bg-[#f1f3f4]"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Crop Workspace */}
            <div className="relative flex-1 bg-[#f8f9fa]">
              <Cropper
                image={originalImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={ASPECT_RATIO}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>
            
            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-[#e8eaed] px-5 py-4">
              <button
                onClick={handleCancelCrop}
                className="rounded-full px-5 py-2 text-sm font-medium text-[#5f6368] transition-colors hover:bg-[#f1f3f4]"
              >
                Cancel
              </button>
              <button
                onClick={() => croppedAreaPixels && processAndUpload(originalImageSrc, croppedAreaPixels)}
                className="rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1765cc] hover:shadow-md"
              >
                Apply & Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
