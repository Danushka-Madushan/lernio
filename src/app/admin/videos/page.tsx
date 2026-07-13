'use client';

import React, { useState, useEffect } from 'react';
import ResumableUploader from '@/components/ResumableUploader';
import { Plus, Trash, Film, Loader2, CheckCircle2 } from 'lucide-react';
import { Grade } from '@/generated/client/enums';

interface Video {
  id: string;
  title: string;
  grade: string;
  cloudflareR2Key: string;
  viewsCount: number;
  createdAt: string;
}

export default function VideosAdminPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<Grade>(Grade.GRADE_6);
  const [cloudflareR2Key, setCloudflareR2Key] = useState('');

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/videos');
      const data = await res.json();
      if (res.ok) {
        setVideos(data.videos);
      } else {
        setError(data.error || 'Failed to fetch video catalog');
      }
    } catch (err) {
      setError('Connection error fetching video catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleUploadSuccess = (r2Key: string) => {
    setCloudflareR2Key(r2Key);
    setSuccess('Video file uploaded to Cloudflare R2! Provide meta and save.');
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !cloudflareR2Key || !grade) {
      setError('Title, grade, and video file are required.');
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
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Video metadata for '${title}' saved successfully.`);
        setTitle('');
        setDescription('');
        setCloudflareR2Key('');
        fetchVideos();
      } else {
        setError(data.error || 'Failed to save video metadata');
      }
    } catch (err) {
      setError('Connection error saving video details');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete: ${videoTitle}? (This deletes database entries and the R2 source file)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Video '${videoTitle}' deleted.`);
        fetchVideos();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete video');
      }
    } catch (err) {
      alert('Connection error deleting video');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-4">
      {/* Left panel: Add Video */}
      <div className="bg-white p-space-4 rounded-radius-md border border-surface-strong space-y-space-3 lg:col-span-1 h-fit">
        <h2 className="text-md font-semibold text-text-primary flex items-center space-x-1">
          <Film size={18} />
          <span>Publish Educational Video</span>
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-radius-xs p-space-2 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-radius-xs p-space-2 text-xs">
            {success}
          </div>
        )}

        {/* 1. File Uploader first */}
        {!cloudflareR2Key ? (
          <ResumableUploader onSuccess={handleUploadSuccess} />
        ) : (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-radius-xs p-space-3 text-xs flex items-center space-x-2">
            <CheckCircle2 size={16} />
            <div className="flex-1">
              <span className="font-semibold block">File successfully staged</span>
              <span className="block text-[10px] break-all">{cloudflareR2Key}</span>
            </div>
            <button
              onClick={() => setCloudflareR2Key('')}
              className="text-[10px] text-red-500 underline"
            >
              Reset
            </button>
          </div>
        )}

        {/* 2. Metadata details */}
        <form onSubmit={handleSaveVideo} className="space-y-space-3 pt-space-2 border-t border-surface-strong/30">
          <div>
            <label className="block text-xs text-text-tertiary mb-1" htmlFor="title">
              Video Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              placeholder="e.g. Grade 10 Math - Lesson 1"
              className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-text-tertiary mb-1" htmlFor="description">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              placeholder="Provide a short overview"
              rows={3}
              className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-text-tertiary mb-1" htmlFor="grade">
              Assign Grade Band
            </label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value as Grade)}
              disabled={saving}
              className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black"
            >
              <option value={Grade.GRADE_6}>Grade 6</option>
              <option value={Grade.GRADE_7}>Grade 7</option>
              <option value={Grade.GRADE_8}>Grade 8</option>
              <option value={Grade.GRADE_9}>Grade 9</option>
              <option value={Grade.GRADE_10}>Grade 10</option>
              <option value={Grade.GRADE_11}>Grade 11</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || !cloudflareR2Key}
            className="w-full flex justify-center items-center space-x-1 bg-black hover:bg-surface-strong hover:text-black text-white text-xs font-semibold py-space-2 rounded-radius-xs transition-colors duration-instant disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <>
                <Plus size={14} />
                <span>Save & Publish Video</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right panel: Videos list */}
      <div className="bg-white p-space-4 rounded-radius-md border border-surface-strong lg:col-span-2 space-y-space-3">
        <h2 className="text-md font-semibold text-text-primary">Staged Video Catalog</h2>

        {loading ? (
          <div className="flex justify-center py-space-6">
            <Loader2 className="animate-spin text-text-tertiary" size={24} />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-xs text-text-tertiary py-space-4 text-center">No video lessons published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-strong text-text-tertiary">
                  <th className="py-2">Lesson Title</th>
                  <th className="py-2">Grade</th>
                  <th className="py-2">Views</th>
                  <th className="py-2">Published On</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-muted">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-surface-muted/55">
                    <td className="py-2 font-medium text-text-primary">{video.title}</td>
                    <td className="py-2">
                      <span className="bg-surface-strong px-2 py-0.5 rounded text-[10px]">
                        {video.grade.replace('GRADE_', 'Grade ')}
                      </span>
                    </td>
                    <td className="py-2 text-text-secondary">{video.viewsCount}</td>
                    <td className="py-2 text-text-tertiary">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleDeleteVideo(video.id, video.title)}
                        className="inline-flex items-center space-x-0.5 text-red-500 hover:text-red-700 hover:underline"
                        title="Delete Video"
                      >
                        <Trash size={12} />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
