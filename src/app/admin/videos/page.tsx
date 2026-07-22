'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Pencil,
  Film,
  Loader2,
  Plus,
  Check,
  X,
  Eye,
  ChevronDown,
  Globe,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Grade } from '@/generated/client/enums';
import ThumbnailUploader from '@/components/ThumbnailUploader';
import { notoSans } from '@/lib/fonts';
import VideoThumbnail from '@/components/VideoThumbnail';
import CloudflareR2Widget from '@/components/CloudflareR2Widget';
import { Button } from '@heroui/react';

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

const GRADE_LABELS: Record<Grade, string> = {
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
};

// ─── EditVideoModal ───────────────────────────────────────────────────────────

function EditVideoModal({
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
}) {
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
                    <option value="">— No grade —</option>
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

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ target, loading, onConfirm, onCancel }: {
  target: Video; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-red-500 via-[#c5221f] to-[#b31412] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash2 size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Delete Video</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div>
              <p className="text-[13px] font-semibold text-[#b31412]">This action is irreversible</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                Are you sure you want to permanently delete <span className="font-semibold">{target.title}</span>? This removes the database record AND the Cloudflare R2 file. This cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} variant='danger' onPress={onConfirm} isDisabled={loading} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Video
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function VideosAdminPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Dedicated Edit Modal State
  const [editTarget, setEditTarget] = useState<Video | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Dedicated Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      if (res.ok) setVideos(data.videos);
      else showToast(data.error || 'Failed to load catalog', 'err');
    } catch {
      showToast('Connection error fetching catalog', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleEditConfirm = async (
    data: { title: string; description: string | null; grade: Grade | null; cloudflareR2ThumbnailKey: string | null; visibility: 'PUBLIC' | 'GRADE' }
  ) => {
    if (!editTarget) return;
    setEditLoading(true);

    try {
      const res = await fetch(`/api/videos/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === editTarget.id
              ? {
                ...v,
                title: data.title,
                description: data.description,
                grade: data.grade,
                cloudflareR2ThumbnailKey: data.cloudflareR2ThumbnailKey,
                visibility: data.visibility,
              }
              : v
          )
        );
        showToast(`"${data.title}" updated.`);
        setEditTarget(null);
      } else {
        showToast(json.error || 'Failed to update video.', 'err');
      }
    } catch {
      showToast('Connection error while saving.', 'err');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/videos/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== deleteTarget.id));
        showToast(`"${deleteTarget.title}" deleted.`);
      } else {
        const json = await res.json();
        showToast(json.error || 'Failed to delete.', 'err');
      }
    } catch {
      showToast('Connection error while deleting.', 'err');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
      {/* Edit Form Modal */}
      {editTarget && (
        <EditVideoModal
          video={editTarget}
          loading={editLoading}
          onConfirm={handleEditConfirm}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          target={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe]">
                <Film size={17} className="text-blue-500" />
              </div>
              <div>
                <h1 className="text-[15px] font-medium text-[#202124]">Video Catalog</h1>
              </div>
              {!loading && (
                <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                  {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                </span>
              )}
            </div>

          {/* Wrap the Widget and Upload button in a gap-3 container so they float right together */}
            <div className="flex items-center gap-3">
              <CloudflareR2Widget />

              <Link
                href="/admin/videos/upload"
                className="flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md"
              >
                <Plus size={15} />
                Upload New Video
              </Link>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div
              className={`rounded-lg border px-3.5 py-2.5 text-[13px] leading-5 ${toast.type === 'ok'
                ? 'border-[#ceead6] bg-[#e6f4ea] text-[#137333]'
                : 'border-[#fad2cf] bg-[#fce8e6] text-[#c5221f]'
                }`}
            >
              {toast.msg}
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-blue-500" size={26} />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                  <Film size={20} className="text-[#9aa0a6]" />
                </div>
                <p className="text-sm text-[#5f6368]">No videos published yet.</p>
                <Link
                  href="/admin/videos/upload"
                  className="text-sm font-medium text-blue-500 hover:underline"
                >
                  Upload your first video →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e8eaed] bg-[#f8f9fa]">
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Lesson Title</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Visibility</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        <span className="flex items-center gap-1"><Eye size={11} /> Views</span>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Likes</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Comments</th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Published</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f4]">
                    {videos.map((video) => (
                      <tr
                        key={video.id}
                        className="group transition-colors duration-100 hover:bg-[#f8f9fa]"
                      >
                        <td className="max-w-xs px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className="relative w-30 shrink-0 aspect-video overflow-hidden rounded-md border border-[#e8eaed] bg-[#202124]">
                              <VideoThumbnail
                                videoId={video.id}
                                title={video.title}
                                grade={video.grade}
                                hasThumbnail={!!video.cloudflareR2ThumbnailKey}
                                showGrade={false}
                              />
                            </div>
                            <div className="min-w-0">
                              <span className={`block truncate text-wrap font-medium text-[#202124] ${notoSans.className}`}>
                                {video.title}
                              </span>
                              {video.description && (
                                <span className={`mt-0.5 block truncate text-[11px] text-[#5f6368] ${notoSans.className}`}>
                                  {video.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Grade badge */}
                        <td className="px-4 py-3">
                          {video.grade ? (
                            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[11px] font-medium text-blue-500">
                              {GRADE_LABELS[video.grade]}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#9aa0a6]">—</span>
                          )}
                        </td>

                        {/* Visibility badge */}
                        <td className="px-4 py-3">
                          {video.visibility === 'PUBLIC' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] font-medium text-[#137333]">
                              <Globe size={10} />
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-medium text-[#92400e]">
                              <Lock size={10} />
                              Grade Only
                            </span>
                          )}
                        </td>

                        {/* Views */}
                        <td className="px-4 py-3 text-[#5f6368]">
                          {video.viewsCount.toLocaleString()}
                        </td>

                        {/* Likes */}
                        <td className="px-4 py-3 text-[#5f6368]">
                          {video._count.likes.toLocaleString()}
                        </td>

                        {/* Comments */}
                        <td className="px-4 py-3 text-[#5f6368]">
                          {video._count.comments.toLocaleString()}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-[#5f6368]">
                          {new Date(video.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditTarget(video)}
                              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-blue-500 transition-colors hover:bg-blue-100"
                              title="Edit video metadata"
                            >
                              <Pencil size={11} />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(video)}
                              className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-100"
                              title="Delete video"
                            >
                              <Trash2 size={11} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
