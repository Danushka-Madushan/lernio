'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Image as ImageIcon,
  Globe,
  Lock,
} from 'lucide-react';
import { Grade } from '@/generated/client/enums';
import ThumbnailUploader from '@/components/ThumbnailUploader';

interface Video {
  id: string;
  title: string;
  description: string | null;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  viewsCount: number;
  cloudflareR2ThumbnailKey: string | null;
  createdAt: string;
}

const GRADE_LABELS: Record<Grade, string> = {
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
};

// ── Inline Edit Row ────────────────────────────────────────────────────────────
function EditableRow({
  video,
  onSave,
  onCancel,
}: {
  video: Video;
  onSave: (id: string, data: { title: string; description: string | null; grade: Grade | null; cloudflareR2ThumbnailKey: string | null; visibility: 'PUBLIC' | 'GRADE' }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? '');
  const [grade, setGrade] = useState<Grade | ''>(video.grade ?? '');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'GRADE'>(video.visibility);
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(video.cloudflareR2ThumbnailKey);
  const [saving, setSaving] = useState(false);

  const handleThumbnailSuccess = (url: string) => {
    setThumbnailKey(url || null);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(video.id, {
      title: title.trim(),
      description: description.trim() || null,
      grade: grade ? (grade as Grade) : null,
      cloudflareR2ThumbnailKey: thumbnailKey,
      visibility,
    });
    setSaving(false);
  };

  return (
    <tr className="bg-[#f8f9fa]">
      {/* Title & Description & Thumbnail edit */}
      <td className="py-4 px-4" colSpan={1}>
        <div className="space-y-2.5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-xs text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
            placeholder="Video title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Description (optional)"
            className="w-full resize-none rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-xs text-[#5f6368] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
          />
          {/* Thumbnail editor inside row */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5f6368]">Cover Thumbnail</p>
            <ThumbnailUploader
              onSuccess={handleThumbnailSuccess}
              existingPreview={video.cloudflareR2ThumbnailKey ? `/api/videos/${video.id}/thumbnail` : undefined}
            />
          </div>
        </div>
      </td>

      {/* Grade */}
      <td className="vertical-align-top py-4 px-4">
        <div className="relative mt-0.5">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade | '')}
            className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3 py-2 pr-7 text-xs text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
          >
            <option value="">— No grade —</option>
            {Object.entries(GRADE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
        </div>
      </td>

      {/* Visibility */}
      <td className="vertical-align-top py-4 px-4">
        <div className="relative mt-0.5">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'GRADE')}
            className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3 py-2 pr-7 text-xs text-[#202124] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
          >
            <option value="PUBLIC">Public</option>
            <option value="GRADE">Grade Only</option>
          </select>
          <ChevronDown size={11} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
        </div>
      </td>

      {/* Views */}
      <td className="py-4 px-4 text-xs text-[#5f6368]">{video.viewsCount.toLocaleString()}</td>

      {/* Date */}
      <td className="py-4 px-4 text-xs text-[#5f6368]">
        {new Date(video.createdAt).toLocaleDateString()}
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 rounded-full bg-[#1a73e8] px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:bg-[#c4c7cc]"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
          >
            <X size={11} />
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function VideosAdminPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleSave = async (
    id: string,
    data: { title: string; description: string | null; grade: Grade | null; cloudflareR2ThumbnailKey: string | null; visibility: 'PUBLIC' | 'GRADE' }
  ) => {
    try {
      const res = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === id
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
        setEditingId(null);
        showToast(`"${data.title}" updated.`);
      } else {
        showToast(json.error || 'Failed to update video.', 'err');
      }
    } catch {
      showToast('Connection error while saving.', 'err');
    }
  };

  const handleDelete = async (video: Video) => {
    if (
      !confirm(
        `Permanently delete "${video.title}"?\n\nThis removes the database record AND the Cloudflare R2 file. This cannot be undone.`
      )
    )
      return;

    setDeletingId(video.id);
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== video.id));
        showToast(`"${video.title}" deleted.`);
      } else {
        const json = await res.json();
        showToast(json.error || 'Failed to delete.', 'err');
      }
    } catch {
      showToast('Connection error while deleting.', 'err');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe]">
              <Film size={17} className="text-[#1a73e8]" />
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
          <Link
            href="/admin/videos/upload"
            className="flex items-center gap-1.5 rounded-full bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md active:bg-[#185abc]"
          >
            <Plus size={15} />
            Upload New Video
          </Link>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-lg border px-3.5 py-2.5 text-[13px] leading-5 ${
              toast.type === 'ok'
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
              <Loader2 className="animate-spin text-[#1a73e8]" size={26} />
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                <Film size={20} className="text-[#9aa0a6]" />
              </div>
              <p className="text-sm text-[#5f6368]">No videos published yet.</p>
              <Link
                href="/admin/videos/upload"
                className="text-sm font-medium text-[#1a73e8] hover:underline"
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
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Published</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f3f4]">
                  {videos.map((video) =>
                    editingId === video.id ? (
                      <EditableRow
                        key={video.id}
                        video={video}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <tr
                        key={video.id}
                        className="group transition-colors duration-100 hover:bg-[#f8f9fa]"
                      >
                        {/* Title + description + Thumbnail Icon/Image */}
                        <td className="max-w-xs px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {/* Small thumbnail in admin panel catalog list */}
                            <div className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e8eaed] bg-[#202124] text-[#9aa0a6]">
                              {video.cloudflareR2ThumbnailKey ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`/api/videos/${video.id}/thumbnail`}
                                  alt={video.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImageIcon size={12} className="opacity-50" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate font-medium text-[#202124]">
                                {video.title}
                              </span>
                              {video.description && (
                                <span className="mt-0.5 block truncate text-[11px] text-[#5f6368]">
                                  {video.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Grade badge */}
                        <td className="px-4 py-3">
                          {video.grade ? (
                            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[11px] font-medium text-[#1a73e8]">
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
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                            <button
                              onClick={() => setEditingId(video.id)}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]"
                              title="Edit video metadata"
                            >
                              <Pencil size={11} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(video)}
                              disabled={deletingId === video.id}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-[#d93025] transition-colors hover:bg-[#fce8e6] disabled:opacity-50"
                              title="Delete video"
                            >
                              {deletingId === video.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Trash2 size={11} />
                              )}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
