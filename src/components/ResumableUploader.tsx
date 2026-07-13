'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Play, Pause, X, CheckCircle, Loader2 } from 'lucide-react';

const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunk size (AWS S3/R2 limit is 5MB minimum)

interface ResumableUploaderProps {
  onSuccess: (r2Key: string) => void;
}

interface UploadState {
  uploadId: string;
  key: string;
  filename: string;
  parts: { partNumber: number; etag: string }[];
  currentPart: number;
}

export default function ResumableUploader({ onSuccess }: ResumableUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');

  // Refs for tracking pause/abort
  const pausedRef = useRef(false);

  // Check localStorage for active incomplete upload on mount
  useEffect(() => {
    const saved = localStorage.getItem('lernio_active_upload');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UploadState;
        setUploadState(parsed);
        setStatusText(`Found incomplete upload for '${parsed.filename}'. Ready to resume.`);
      } catch (e) {
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
    setStatusText('');
    setError('');
    localStorage.removeItem('lernio_active_upload');
  };

  const startNewUpload = async () => {
    if (!file) return;
    setUploading(true);
    setPaused(false);
    setError('');
    setStatusText('Initiating resumable upload connection...');

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
        parts: [],
        currentPart: 1,
      };

      setUploadState(newState);
      localStorage.setItem('lernio_active_upload', JSON.stringify(newState));
      uploadChunks(file, newState);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error initiating upload.');
      setUploading(false);
    }
  };

  const resumeUpload = () => {
    if (!uploadState || !file) {
      setError('Please select the original file to resume upload.');
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

    while (currentPart <= totalChunks) {
      if (pausedRef.current) {
        setStatusText('Upload paused by user.');
        // Save current progress in state & localStorage
        const updatedState = { ...state, parts, currentPart };
        setUploadState(updatedState);
        localStorage.setItem('lernio_active_upload', JSON.stringify(updatedState));
        setUploading(false);
        return;
      }

      setStatusText(`Uploading part ${currentPart} of ${totalChunks}...`);
      const start = (currentPart - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, currentFile.size);
      const chunk = currentFile.slice(start, end);

      try {
        // 1. Get presigned URL for this chunk
        const signRes = await fetch('/api/upload/sign-part', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: state.key, uploadId: state.uploadId, partNumber: currentPart }),
        });
        const signData = await signRes.json();
        if (!signRes.ok) throw new Error(signData.error || 'Failed to sign part');

        // 2. PUT chunk directly to R2 pre-signed URL
        const uploadRes = await fetch(signData.url, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': currentFile.type,
          },
        });

        if (!uploadRes.ok) throw new Error(`Failed to upload chunk ${currentPart}`);

        // Extract ETag
        const etag = uploadRes.headers.get('ETag');
        if (!etag) throw new Error(`No ETag returned for chunk ${currentPart}`);

        parts.push({ partNumber: currentPart, etag });
        currentPart++;

        // Update progress percentage
        const percent = Math.round(((currentPart - 1) / totalChunks) * 100);
        setProgress(percent);
      } catch (err: any) {
        console.error(err);
        setError(`Error uploading part ${currentPart}: ${err.message}. Retrying or pause.`);
        setUploading(false);
        // Save state so they can retry
        const updatedState = { ...state, parts, currentPart };
        setUploadState(updatedState);
        localStorage.setItem('lernio_active_upload', JSON.stringify(updatedState));
        return;
      }
    }

    // 3. Complete the upload
    setStatusText('Finalizing and stitching upload parts...');
    try {
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: state.key, uploadId: state.uploadId, parts }),
      });
      const completeData = await completeRes.json();

      if (!completeRes.ok) throw new Error(completeData.error || 'Stitching failed');

      setStatusText('Upload finished successfully!');
      setProgress(100);
      setUploading(false);
      localStorage.removeItem('lernio_active_upload');
      onSuccess(state.key);
    } catch (err: any) {
      console.error(err);
      setError(`Stitching failed: ${err.message}`);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);

      // If we had a saved state, verify if file names match
      if (uploadState && uploadState.filename !== selected.name) {
        setError(`Selected file name does not match incomplete upload. Resetting state.`);
        localStorage.removeItem('lernio_active_upload');
        setUploadState(null);
      }
    }
  };

  return (
    <div className="border border-surface-strong bg-surface-muted/50 rounded-radius-md p-space-4 space-y-space-3">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Video File Provider</h3>
        {uploadState && (
          <button
            onClick={resetUploader}
            className="text-[10px] text-red-500 hover:underline flex items-center space-x-0.5"
          >
            <X size={12} />
            <span>Cancel Active Session</span>
          </button>
        )}
      </div>

      <div className="space-y-space-2 text-xs">
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="w-full text-xs text-text-tertiary file:mr-space-2 file:py-1 file:px-2 file:rounded-radius-xs file:border file:border-surface-strong file:text-xs file:bg-white file:text-text-primary hover:file:bg-surface-strong cursor-pointer"
        />

        {file && (
          <div className="text-[10px] text-text-tertiary">
            File name: <span className="text-text-secondary font-medium">{file.name}</span> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </div>
        )}

        {/* Progress Display */}
        {(uploading || progress > 0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-tertiary font-medium">
              <span>{statusText}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-surface-strong h-2 rounded-radius-xs overflow-hidden">
              <div
                className="bg-surface-raised h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 p-space-2 rounded-radius-xs">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-space-2">
          {!uploadState ? (
            <button
              type="button"
              onClick={startNewUpload}
              disabled={!file || uploading}
              className="flex items-center space-x-1 bg-black text-white hover:bg-surface-strong hover:text-black font-semibold px-space-3 py-1.5 rounded-radius-xs disabled:opacity-50 transition-colors"
            >
              <Upload size={14} />
              <span>Start Upload</span>
            </button>
          ) : (
            <>
              {!uploading ? (
                <button
                  type="button"
                  onClick={resumeUpload}
                  disabled={!file}
                  className="flex items-center space-x-1 bg-surface-raised text-black font-semibold px-space-3 py-1.5 rounded-radius-xs disabled:opacity-50 transition-colors"
                >
                  <Play size={14} />
                  <span>Resume Upload</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaused(true)}
                  className="flex items-center space-x-1 bg-yellow-50 border border-yellow-200 text-yellow-700 font-semibold px-space-3 py-1.5 rounded-radius-xs transition-colors"
                >
                  <Pause size={14} />
                  <span>Pause Upload</span>
                </button>
              )}
            </>
          )}

          {uploading && (
            <span className="flex items-center text-[10px] text-text-tertiary animate-pulse">
              <Loader2 size={12} className="animate-spin mr-1" />
              Transferring data...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
