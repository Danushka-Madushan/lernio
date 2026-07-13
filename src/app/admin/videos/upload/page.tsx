'use client';

import React, { useState, useCallback } from 'react';
import ResumableUploader from '@/components/ResumableUploader';
import { Plus, Loader2, CheckCircle2, Film, ArrowLeft } from 'lucide-react';
import { Grade } from '@/generated/client/enums';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VideoUploadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<Grade>(Grade.GRADE_6);
  const [cloudflareR2Key, setCloudflareR2Key] = useState('');
  const [thumbnailKey, setThumbnailKey] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  const handleUploadSuccess = useCallback((r2Key: string) => {
    setCloudflareR2Key(r2Key);
    setError('');
    setSuccess('');
  }, []);

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side preview
    const previewUrl = URL.createObjectURL(file);
    setThumbnailPreview(previewUrl);
    setThumbnailUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/thumbnail', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setThumbnailKey(data.key);
      } else {
        setError(data.error || 'Failed to upload thumbnail image.');
        setThumbnailPreview('');
      }
    } catch {
      setError('Connection error uploading thumbnail.');
      setThumbnailPreview('');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !cloudflareR2Key || !grade) {
      setError('Title, grade, and a video file are required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          grade,
          cloudflareR2Key,
          cloudflareR2ThumbnailKey: thumbnailKey || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`"${title}" published successfully! Redirecting to catalog…`);
        setTimeout(() => router.push('/admin/videos'), 1500);
      } else {
        setError(data.error || 'Failed to save video metadata.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-space-4">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-text-tertiary">
        <Link href="/admin/videos" className="hover:text-text-primary flex items-center gap-1 transition-colors">
          <ArrowLeft size={12} />
          Video Catalog
        </Link>
        <span>/</span>
        <span className="text-text-primary font-medium">Upload New Video</span>
      </div>

      <div className="bg-white p-space-5 rounded-radius-md border border-surface-strong space-y-space-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-radius-xs bg-black flex items-center justify-center">
            <Film size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">Publish Educational Video</h1>
            <p className="text-xs text-text-tertiary">Upload the video file first, then fill in metadata and publish.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-radius-xs p-space-2 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-radius-xs p-space-2 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} />
            {success}
          </div>
        )}

        {/* Step 1 – File Upload */}
        <div className="space-y-space-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Step 1 — Upload Video File
          </p>
          {!cloudflareR2Key ? (
            <ResumableUploader onSuccess={handleUploadSuccess} />
          ) : (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-radius-xs p-space-3 text-xs flex items-start space-x-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold block">File staged in Cloudflare R2</span>
                <span className="block text-[10px] break-all text-green-600 mt-0.5">{cloudflareR2Key}</span>
              </div>
              <button
                onClick={() => setCloudflareR2Key('')}
                className="text-[10px] text-red-500 underline hover:text-red-700 shrink-0"
              >
                Replace
              </button>
            </div>
          )}
        </div>

        {/* Step 2 – Metadata */}
        <div className="space-y-space-3 pt-space-2 border-t border-surface-strong/40">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Step 2 — Video Details
          </p>

          <form onSubmit={handleSaveVideo} className="space-y-space-3">
            <div>
              <label className="block text-xs text-text-tertiary mb-1" htmlFor="upload-title">
                Video Title <span className="text-red-400">*</span>
              </label>
              <input
                id="upload-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
                placeholder="e.g. Grade 10 Math – Lesson 1: Algebra Basics"
                className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black disabled:opacity-60"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1" htmlFor="upload-description">
                Description <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <textarea
                id="upload-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                placeholder="Brief overview of what this lesson covers…"
                rows={3}
                className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black resize-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1" htmlFor="upload-thumbnail">
                Cover Thumbnail <span className="text-text-tertiary font-normal">(optional)</span>
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="upload-thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  disabled={saving || thumbnailUploading}
                  className="text-xs text-text-tertiary file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-surface-strong file:text-xs file:bg-white file:text-text-primary hover:file:bg-surface-strong cursor-pointer"
                />
                {thumbnailUploading && <Loader2 className="animate-spin text-text-tertiary" size={14} />}
              </div>
              {thumbnailPreview && (
                <div className="mt-2 relative w-32 aspect-video rounded border border-surface-strong overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1" htmlFor="upload-grade">
                Grade Band <span className="text-red-400">*</span>
              </label>
              <select
                id="upload-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
                disabled={saving}
                className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black"
              >
                {Object.values(Grade).map((g) => (
                  <option key={g} value={g}>
                    {g.replace('GRADE_', 'Grade ')}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving || !cloudflareR2Key}
              className="w-full flex justify-center items-center gap-2 bg-black hover:bg-neutral-800 text-white text-xs font-semibold py-space-2 rounded-radius-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 className="animate-spin" size={14} /><span>Publishing…</span></>
              ) : (
                <><Plus size={14} /><span>Publish Video</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
