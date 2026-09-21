'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Pencil,
  Film,
  Loader2,
  Plus,
  Eye,
  Globe,
  Lock,
  ChevronDown,
  UserCheck,
  Search,
  X,
} from 'lucide-react';
import { Grade } from '@/generated/client/enums';
import { notoSans } from '@/lib/fonts';
import VideoThumbnail from '@/components/VideoThumbnail';
import CloudflareR2Widget from '@/components/CloudflareR2Widget';
import { GRADE_LABELS } from '@/lib/constants';
import EditVideoModal from '@/components/EditVideoModal';
import VideoDeleteConfirmModal from '@/components/VideoDeleteConfirmModal';
import { triggerUnauthorized } from '@/lib/utils';

interface TeacherOption {
  id: string;
  username: string;
  role: string;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  viewsCount: number;
  cloudflareR2ThumbnailKey: string | null;
  teacherId?: string | null;
  teacher?: { id: string; username: string } | null;
  createdAt: string;
  _count: {
    likes: number;
    comments: number;
  };
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const VideosAdminPage = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Admin & Teachers state
  const [isAdmin, setIsAdmin] = useState(false);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchRoleAndTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/teachers');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(true);
        setTeachers(data.teachers || []);
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      if (res.ok) {
        setVideos(data.videos);
      } else if (res.status === 401) {
        triggerUnauthorized();
      } else {
        showToast(data.error || 'Failed to load catalog', 'err');
      }
    } catch {
      showToast('Connection error fetching catalog', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoleAndTeachers();
    fetchVideos();
  }, [fetchRoleAndTeachers, fetchVideos]);

  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return videos.filter((v) => {
      const matchSearch = q
        ? v.title.toLowerCase().includes(q) || (v.description && v.description.toLowerCase().includes(q))
        : true;
      const matchTeacher = teacherFilter
        ? v.teacherId === teacherFilter || v.teacher?.id === teacherFilter
        : true;
      return matchSearch && matchTeacher;
    });
  }, [videos, searchQuery, teacherFilter]);

  const handleEditConfirm = async (
    data: {
      title: string;
      description: string | null;
      grade: Grade | null;
      cloudflareR2ThumbnailKey: string | null;
      visibility: 'PUBLIC' | 'GRADE';
    }
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
      } else if (res.status === 401) {
        triggerUnauthorized();
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
      } else if (res.status === 401) {
        triggerUnauthorized();
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
        <VideoDeleteConfirmModal
          target={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe]">
                <Film size={17} className="text-blue-500" />
              </div>
              <div>
                <h1 className="text-[15px] font-medium text-[#202124]">
                  {isAdmin ? 'Video Catalog' : 'My Video Catalog'}
                </h1>
              </div>
              {!loading && (
                <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                  {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                </span>
              )}
            </div>

            {/* Filter and action tools */}
            <div className="flex items-center gap-3 flex-wrap">
              {isAdmin && teachers.length > 0 && (
                <div className="relative">
                  <select
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="appearance-none rounded-full border border-[#dadce0] bg-white py-1.5 pl-3 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">All Teachers</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.username} {t.role === 'ADMIN' ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={12}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]"
                  />
                </div>
              )}

              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog…"
                  className="w-40 sm:w-48 rounded-full border border-[#dadce0] bg-white py-1.5 pl-8 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#202124]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

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
                <Loader2 className="animate-spin text-blue-500" size={26} />
              </div>
            ) : filteredVideos.length === 0 ? (
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
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Lesson Title
                      </th>
                      {isAdmin && (
                        <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Teacher
                        </th>
                      )}
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Grade
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Visibility
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        <span className="flex items-center gap-1">
                          <Eye size={11} /> Views
                        </span>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Published
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f4]">
                    {filteredVideos.map((video) => (
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
                              <span
                                className={`block truncate text-wrap font-medium text-[#202124] ${notoSans.className}`}
                              >
                                {video.title}
                              </span>
                              {video.description && (
                                <span
                                  className={`mt-0.5 block truncate text-[11px] text-[#5f6368] ${notoSans.className}`}
                                >
                                  {video.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Teacher column (Admin only) */}
                        {isAdmin && (
                          <td className="px-4 py-3">
                            {video.teacher ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-100">
                                <UserCheck size={10} /> {video.teacher.username}
                              </span>
                            ) : (
                              <span className="text-[11px] text-[#9aa0a6]">-</span>
                            )}
                          </td>
                        )}

                        {/* Grade badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {video.grade ? (
                            <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[11px] font-medium text-blue-500">
                              {GRADE_LABELS[video.grade]}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#9aa0a6]">-</span>
                          )}
                        </td>

                        {/* Visibility badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
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
};

export default VideosAdminPage;
