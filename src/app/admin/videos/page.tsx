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
} from 'lucide-react';
import { Grade } from '@/generated/client/enums';
import ThumbnailUploader from '@/components/ThumbnailUploader';

interface Video {
  id: string;
  title: string;
  description: string | null;
  grade: Grade;
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
  onSave: (id: string, data: { title: string; description: string | null; grade: Grade; cloudflareR2ThumbnailKey: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description ?? '');
  const [grade, setGrade] = useState<Grade>(video.grade);
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
      grade,
      cloudflareR2ThumbnailKey: thumbnailKey,
    });
    setSaving(false);
  };

  return (
    <tr className="bg-surface-muted/40 border-b border-surface-strong">
      {/* Title & Description & Thumbnail edit */}
      <td className="py-3 px-3" colSpan={1}>
        <div className="space-y-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs border border-surface-strong rounded px-2 py-1 outline-none focus:ring-1 focus:ring-black bg-white"
            placeholder="Video title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Description (optional)"
            className="w-full text-xs border border-surface-strong rounded px-2 py-1 outline-none focus:ring-1 focus:ring-black bg-white resize-none text-text-tertiary"
          />
          {/* Thumbnail editor inside row */}
          <div className="pt-1 space-y-1">
            <p className="text-[10px] font-semibold text-text-tertiary uppercase">Cover Thumbnail</p>
            <ThumbnailUploader
              onSuccess={handleThumbnailSuccess}
              existingPreview={video.cloudflareR2ThumbnailKey ? `/api/videos/${video.id}/thumbnail` : undefined}
            />
          </div>
        </div>
      </td>

      {/* Grade */}
      <td className="py-3 px-3 vertical-align-top">
        <div className="relative mt-0.5">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value as Grade)}
            className="appearance-none w-full text-xs border border-surface-strong rounded px-2 py-1 pr-6 outline-none focus:ring-1 focus:ring-black bg-white"
          >
            {Object.entries(GRADE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
        </div>
      </td>

      {/* Views */}
      <td className="py-3 px-3 text-xs text-text-tertiary">{video.viewsCount.toLocaleString()}</td>

      {/* Date */}
      <td className="py-3 px-3 text-xs text-text-tertiary">
        {new Date(video.createdAt).toLocaleDateString()}
      </td>

      {/* Actions */}
      <td className="py-3 px-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1 text-[11px] bg-black text-white px-2 py-1 rounded hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
            Save
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex items-center gap-1 text-[11px] text-text-tertiary border border-surface-strong px-2 py-1 rounded hover:text-text-primary hover:border-surface-raised transition-colors"
          >
            <X size={10} />
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
    data: { title: string; description: string | null; grade: Grade; cloudflareR2ThumbnailKey: string | null }
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
    <div className="space-y-space-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-text-tertiary" />
          <h1 className="text-sm font-semibold text-text-primary">Video Catalog</h1>
          {!loading && (
            <span className="text-[11px] text-text-tertiary bg-surface-muted px-2 py-0.5 rounded-full">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'}
            </span>
          )}
        </div>
        <Link
          href="/admin/videos/upload"
          className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-1.5 rounded-radius-xs transition-colors"
        >
          <Plus size={13} />
          Upload New Video
        </Link>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`text-xs px-space-3 py-space-2 rounded-radius-xs border ${
            toast.type === 'ok'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-radius-md border border-surface-strong overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-text-tertiary" size={24} />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-tertiary">
            <Film size={32} className="opacity-30" />
            <p className="text-xs">No videos published yet.</p>
            <Link
              href="/admin/videos/upload"
              className="text-xs text-surface-raised underline hover:text-black"
            >
              Upload your first video →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-strong bg-surface-muted/40 text-text-tertiary text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-medium">Lesson Title</th>
                  <th className="py-2.5 px-3 font-medium">Grade</th>
                  <th className="py-2.5 px-3 font-medium">
                    <span className="flex items-center gap-1"><Eye size={10} /> Views</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium">Published</th>
                  <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-muted">
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
                      className="hover:bg-surface-muted/30 transition-colors group"
                    >
                      {/* Title + description + Thumbnail Icon/Image */}
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="flex items-center space-x-2">
                          {/* Small thumbnail in admin panel catalog list */}
                          <div className="w-10 h-6 shrink-0 bg-neutral-800 rounded border border-surface-strong overflow-hidden flex items-center justify-center text-text-tertiary">
                            {video.cloudflareR2ThumbnailKey ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/videos/${video.id}/thumbnail`}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={10} className="opacity-45" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-text-primary truncate block">
                              {video.title}
                            </span>
                            {video.description && (
                              <span className="text-[11px] text-text-tertiary truncate block mt-0.5">
                                {video.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Grade badge */}
                      <td className="py-2.5 px-3">
                        <span className="bg-surface-strong text-text-secondary px-2 py-0.5 rounded text-[11px] font-medium">
                          {GRADE_LABELS[video.grade]}
                        </span>
                      </td>

                      {/* Views */}
                      <td className="py-2.5 px-3 text-text-secondary">
                        {video.viewsCount.toLocaleString()}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-text-tertiary">
                        {new Date(video.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingId(video.id)}
                            className="flex items-center gap-1 text-[11px] text-text-secondary border border-surface-strong px-2 py-1 rounded hover:border-black hover:text-text-primary transition-colors"
                            title="Edit video metadata"
                          >
                            <Pencil size={10} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(video)}
                            disabled={deletingId === video.id}
                            className="flex items-center gap-1 text-[11px] text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50"
                            title="Delete video"
                          >
                            {deletingId === video.id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Trash2 size={10} />
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
  );
}
