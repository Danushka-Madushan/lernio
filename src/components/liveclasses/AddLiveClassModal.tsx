'use client';

import { useState } from 'react';
import { Video, X, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@heroui/react';
import { Grade } from '@/generated/client/enums';
import { GRADE_LABELS } from '@/lib/constants';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [grade, setGrade] = useState<Grade | ''>('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'GRADE'>('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedId = extractYouTubeId(youtubeUrl);
  const previewThumbnail = parsedId ? getYouTubeThumbnail(parsedId) : null;

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
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-xs text-[#c5221f]">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* YouTube Link / ID with Live Validation Preview */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                YouTube URL or Video ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or Video ID"
                disabled={loading}
                className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm font-mono text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="mt-1 text-[11px] text-[#5f6368]">
                Supports any standard YouTube URL, live stream, shorts, or 11-char ID. Students will never see this URL.
              </p>

              {parsedId && (
                <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                  {previewThumbnail && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewThumbnail}
                      alt="Stream Preview"
                      className="w-20 h-12 object-cover rounded-lg border border-blue-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                      <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
                      <span>Valid Stream Target</span>
                    </div>
                    <p className="text-[11px] font-mono text-blue-900 mt-0.5">
                      Stream Key: {parsedId}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Grade Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#5f6368]">
                Target Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade | '')}
                disabled={loading}
                className="w-full rounded-xl border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Grades (General / Seminar)</option>
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
                  onClick={() => setVisibility('GRADE')}
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
                isDisabled={loading || !title.trim() || !parsedId}
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
