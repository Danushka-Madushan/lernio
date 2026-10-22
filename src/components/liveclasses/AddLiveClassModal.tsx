'use client';

import { useState } from 'react';
import { Video, X, Loader2, Sparkles, AlertCircle, ImagePlus, Check } from 'lucide-react';
import { Button } from '@heroui/react';
import { Grade } from '@/generated/client/enums';
import { GRADE_LABELS } from '@/lib/constants';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';
import ThumbnailUploader from '@/components/ThumbnailUploader';

interface AddLiveClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allowedGrades?: Grade[] | null;
  gradeAliases?: Record<string, string> | null;
}

export default function AddLiveClassModal({
  isOpen,
  onClose,
  onSuccess,
  allowedGrades,
  gradeAliases,
}: AddLiveClassModalProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'GRADE'>('PUBLIC');
  const [thumbnailMode, setThumbnailMode] = useState<'YOUTUBE' | 'CUSTOM'>('YOUTUBE');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState<string>('');
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [infoFetched, setInfoFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedId = extractYouTubeId(youtubeUrl);
  const defaultYouTubeThumbnail = parsedId ? getYouTubeThumbnail(parsedId) : null;

  const handleGetInfo = async () => {
    if (!parsedId) {
      setError('Please enter a valid YouTube URL or 11-character video ID first');
      return;
    }

    setFetchingInfo(true);
    setError(null);

    try {
      const res = await fetch(`/api/live-classes/info?url=${encodeURIComponent(youtubeUrl.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.title) {
          setTitle(data.title);
        }
        setInfoFetched(true);
      } else {
        setError(data.error || 'Could not fetch video info from YouTube');
      }
    } catch {
      setError('Failed to connect to YouTube info service');
    } finally {
      setFetchingInfo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a class title');
      return;
    }

    if (!parsedId) {
      setError('Please provide a valid YouTube URL or 11-character video ID');
      return;
    }

    if (visibility === 'GRADE' && !grade) {
      setError('Please select a specific grade for "Target Grade Only" visibility');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          youtubeUrl: youtubeUrl.trim(),
          grade: grade || null,
          visibility,
          customThumbnailUrl: thumbnailMode === 'CUSTOM' ? customThumbnailUrl.trim() || null : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create live class');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const availableGrades = allowedGrades && allowedGrades.length > 0 ? allowedGrades : Object.values(Grade);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onClose()}
    >
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300">
        {/* Header */}
        <div className="bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video size={18} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Add New Live Class</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[82vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-xs text-[#c5221f]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* YouTube Link / ID with "Get Info" Button */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                YouTube URL or Video ID <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={youtubeUrl}
                  onChange={(e) => {
                    setYoutubeUrl(e.target.value);
                    setInfoFetched(false);
                  }}
                  placeholder="https://www.youtube.com/watch?v=... or Video ID"
                  disabled={loading}
                  className="flex-1 min-w-0 rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={handleGetInfo}
                  disabled={loading || fetchingInfo || !parsedId}
                  className="px-3.5 h-10.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Fetch video title from YouTube"
                >
                  {fetchingInfo ? (
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                  ) : infoFetched ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Sparkles size={14} className="text-blue-600" />
                  )}
                  <span>{fetchingInfo ? 'Fetching...' : infoFetched ? 'Updated' : 'Get Info'}</span>
                </button>
              </div>
              <p className="mt-1 text-[11px] text-[#5f6368]">
                Type or paste a video link or ID. Click <strong>Get Info</strong> to retrieve title automatically.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                Class Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mathematics Live Seminar - Unit 4"
                disabled={loading}
                className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Thumbnail Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                Cover Thumbnail
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setThumbnailMode('YOUTUBE')}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    thumbnailMode === 'YOUTUBE'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-gray-50'
                  }`}
                >
                  <Video size={13} />
                  <span>YouTube Default</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThumbnailMode('CUSTOM')}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    thumbnailMode === 'CUSTOM'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-gray-50'
                  }`}
                >
                  <ImagePlus size={13} />
                  <span>Custom Thumbnail</span>
                </button>
              </div>

              {thumbnailMode === 'YOUTUBE' ? (
                defaultYouTubeThumbnail ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultYouTubeThumbnail}
                      alt="YouTube Thumbnail Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-[11px] font-medium text-white/95">
                        YouTube Standard Thumbnail
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 text-center text-xs text-gray-400 bg-gray-50/60">
                    Enter a YouTube link or ID above to preview its cover
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-[#dadce0] p-3 bg-gray-50/40">
                  <ThumbnailUploader
                    onSuccess={(keyOrUrl) => setCustomThumbnailUrl(keyOrUrl)}
                    existingPreview={customThumbnailUrl || undefined}
                  />
                </div>
              )}
            </div>

            {/* Visibility Mode */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                Student Visibility
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    visibility === 'PUBLIC'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-gray-50'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>All My Students</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVisibility('GRADE');
                    if (!grade && availableGrades.length > 0) {
                      setGrade(availableGrades[0]);
                    }
                  }}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    visibility === 'GRADE'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-gray-50'
                  }`}
                >
                  <span>Target Grade Only</span>
                </button>
              </div>
            </div>

            {/* Target Grade */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                Target Grade {visibility === 'GRADE' ? <span className="text-red-500">*</span> : <span className="font-normal text-[#9aa0a6]">(Optional for All Students)</span>}
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade | '')}
                required={visibility === 'GRADE'}
                disabled={loading}
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20 ${
                  visibility === 'GRADE' && !grade ? 'border-red-300 ring-1 ring-red-300' : 'border-[#dadce0]'
                }`}
              >
                <option value="">
                  {visibility === 'GRADE' ? '-- Select a Specific Target Grade --' : 'All Grades (General / Seminar)'}
                </option>
                {availableGrades.map((g) => {
                  const customLabel = gradeAliases?.[g];
                  const standardLabel = GRADE_LABELS[g] || g;
                  return (
                    <option key={g} value={g}>
                      {customLabel ? `${customLabel} (${standardLabel})` : standardLabel}
                    </option>
                  );
                })}
              </select>
              {visibility === 'GRADE' && !grade && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  Please select a specific grade for target grade visibility.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                Description <span className="font-normal text-[#9aa0a6]">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key concepts, syllabus coverage, or session notes..."
                disabled={loading}
                className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                onPress={onClose}
                isDisabled={loading}
                className="text-xs font-semibold h-10 px-4 rounded-xl border border-[#dadce0] text-[#5f6368] hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isDisabled={loading || !title.trim() || !parsedId || (visibility === 'GRADE' && !grade)}
                className="text-xs font-semibold h-10 px-5 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : 'Create Live Class'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
