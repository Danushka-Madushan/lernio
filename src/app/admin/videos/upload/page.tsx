'use client';

import { useState, useCallback } from 'react';
import ResumableUploader from '@/components/ResumableUploader';
import ThumbnailUploader from '@/components/ThumbnailUploader';
import { Plus, Loader2, CheckCircle2, Film, ArrowLeft } from 'lucide-react';
import { Grade } from '@/generated/client/enums';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notoSans } from '@/lib/fonts';
import { Button } from '@heroui/react';

export default function VideoUploadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'GRADE'>('PUBLIC');
  const [cloudflareR2Key, setCloudflareR2Key] = useState('');
  const [thumbnailKey, setThumbnailKey] = useState('');

  const handleUploadSuccess = useCallback((r2Key: string) => {
    setCloudflareR2Key(r2Key);
    setError('');
    setSuccess('');
  }, []);

  const handleThumbnailSuccess = useCallback((url: string) => {
    setThumbnailKey(url);
  }, []);

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !cloudflareR2Key) {
      setError('Title and a video file are required.');
      return;
    }

    if (visibility === 'GRADE' && !grade) {
      setError('Grade band is required when visibility is set to Grade Only.');
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
          grade: grade || null,
          cloudflareR2Key,
          cloudflareR2ThumbnailKey: thumbnailKey || null,
          visibility,
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
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-[#5f6368]">
          <Link href="/admin/videos" className="flex items-center gap-1 transition-colors hover:text-[#1a73e8]">
            <ArrowLeft size={12} />
            Video Catalog
          </Link>
          <span className="text-[#dadce0]">/</span>
          <span className="font-medium text-[#202124]">Upload New Video</span>
        </div>

        <div className="space-y-5 rounded-2xl bg-white p-7 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f0fe]">
              <Film size={18} className="text-[#1a73e8]" />
            </div>
            <div>
              <h1 className="text-[15px] font-medium text-[#202124]">Publish Educational Video</h1>
              <p className="text-xs text-[#5f6368]">Upload the video file first, then fill in metadata and publish.</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">
              <CheckCircle2 size={15} />
              {success}
            </div>
          )}

          {/* Step 1 – Video File */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a73e8] text-[10px] font-semibold text-white">1</span>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                Upload Video File
              </p>
            </div>
            {!cloudflareR2Key ? (
              <ResumableUploader onSuccess={handleUploadSuccess} />
            ) : (
              <div className="flex items-start space-x-2.5 rounded-lg border border-[#ceead6] bg-[#e6f4ea] p-3.5 text-xs text-[#137333]">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold">File staged in Cloudflare R2</span>
                  <span className="mt-0.5 block break-all text-[10px] text-[#1e8e3e]">{cloudflareR2Key}</span>
                </div>
                <button
                  onClick={() => setCloudflareR2Key('')}
                  className="shrink-0 text-[10px] font-medium text-[#d93025] hover:underline"
                >
                  Replace
                </button>
              </div>
            )}
          </div>

          {/* Step 2 – Metadata */}
          <div className="space-y-4 border-t border-[#e8eaed] pt-5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a73e8] text-[10px] font-semibold text-white">2</span>
              <p className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                Video Details
              </p>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]" htmlFor="upload-title">
                  Video Title <span className="text-[#d93025]">*</span>
                </label>
                <input
                  id="upload-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                  placeholder="e.g. Grade 10 Math – Lesson 1: Algebra Basics"
                  className={`w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all duration-150  hover:border-[#c4c7cc]  focus:ring-2 focus:ring-[#1a73e8]/20 ${notoSans.className}`}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]" htmlFor="upload-description">
                  Description <span className="font-normal text-[#9aa0a6]">(optional)</span>
                </label>
                <textarea
                  id="upload-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={saving}
                  placeholder="Brief overview of what this lesson covers…"
                  rows={3}
                  className={`w-full resize-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all duration-150  hover:border-[#c4c7cc]  focus:ring-2 focus:ring-[#1a73e8]/20 ${notoSans.className}`}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">
                  Cover Thumbnail <span className="font-normal text-[#9aa0a6]">(optional — JPG/PNG, 16:9)</span>
                </label>
                <ThumbnailUploader onSuccess={handleThumbnailSuccess} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]" htmlFor="upload-grade">
                    Grade Band{' '}
                    {visibility === 'GRADE' ? (
                      <span className="text-[#d93025]">*</span>
                    ) : (
                      <span className="font-normal text-[#9aa0a6]">(optional)</span>
                    )}
                  </label>
                  <select
                    id="upload-grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as Grade | '')}
                    disabled={saving}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc]  focus:ring-2 focus:ring-[#1a73e8]/20"
                  >
                    <option value="">— No grade —</option>
                    {Object.values(Grade).map((g) => (
                      <option key={g} value={g}>
                        {g.replace('GRADE_', 'Grade ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]" htmlFor="upload-visibility">
                    Visibility <span className="text-[#d93025]">*</span>
                  </label>
                  <select
                    id="upload-visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'GRADE')}
                    disabled={saving}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc]  focus:ring-2 focus:ring-[#1a73e8]/20"
                  >
                    <option value="PUBLIC">🌐 Public — All students can see</option>
                    <option value="GRADE">🔒 Grade Only — Matching grade required</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                isDisabled={saving || !cloudflareR2Key}
                fullWidth
              >
                {saving ? (
                  <><Loader2 className="animate-spin" size={16} /><span>Publishing…</span></>
                ) : (
                  <><Plus size={16} /><span>Publish Video</span></>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
