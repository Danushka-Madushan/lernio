import { GRADE_LABELS } from '@/lib/constants';
import { Grade } from '@/lib/db';
import { Check, ChevronDown, Loader2, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import ThumbnailUploader from './ThumbnailUploader';
import { Button } from '@heroui/react';

// ─── EditVideoModal ───────────────────────────────────────────────────────────
interface Video {
  id: string;
  title: string;
  description: string | null;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  viewsCount: number;
  cloudflareR2ThumbnailKey: string | null;
  createdAt: string;
  _count: {
    likes: number;
    comments: number;
  };
}

const EditVideoModal = ({
  video,
  loading,
  onConfirm,
  onCancel,
}: {
  video: Video;
  loading: boolean;
  onConfirm: (data: {
    title: string;
    description: string | null;
    grade: Grade | null;
    cloudflareR2ThumbnailKey: string | null;
    visibility: 'PUBLIC' | 'GRADE';
  }) => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? '');
  const [grade, setGrade] = useState<Grade | ''>(video.grade ?? '');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'GRADE'>(video.visibility);
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(video.cloudflareR2ThumbnailKey);

  const handleThumbnailSuccess = (url: string) => {
    setThumbnailKey(url || null);
  };

  const handleConfirm = () => {
    if (!title.trim()) return;
    onConfirm({
      title: title.trim(),
      description: description.trim() || null,
      grade: grade ? (grade as Grade) : null,
      cloudflareR2ThumbnailKey: thumbnailKey,
      visibility,
    });
  };

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">

        {/* Header */}
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Pencil size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Edit Video Metadata</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Landscape Two-Column Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-5 bg-white">

          {/* Left Column: Metadata Inputs */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Title</label>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading}
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                placeholder="Video title" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Description <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} disabled={loading}
                placeholder="Provide a short description..."
                className="w-full resize-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm text-[#5f6368] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {/* Right Column: Dropdowns & Cover Art */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade</label>
                <div className="relative">
                  <select value={grade} onChange={(e) => setGrade(e.target.value as Grade | '')} disabled={loading}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 pr-7 text-sm text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="">- No grade -</option>
                    {Object.entries(GRADE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Visibility</label>
                <div className="relative">
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'GRADE')} disabled={loading}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 pr-7 text-sm text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="PUBLIC">Public</option>
                    <option value="GRADE">Grade Only</option>
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5f6368]">Cover Thumbnail</p>
              <ThumbnailUploader onSuccess={handleThumbnailSuccess} existingPreview={video.cloudflareR2ThumbnailKey ? `/api/videos/${video.id}/thumbnail` : undefined} />
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} onPress={handleConfirm} isDisabled={loading} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Changes
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}

export default EditVideoModal;
