"use client";

import { GRADE_COLORS, GRADE_LABELS } from '@/lib/constants';
import { Grade } from '@/lib/db';
import { notoSans } from '@/lib/fonts';
import { Button } from '@heroui/react';
import { Check, Film, Globe, Loader2, Lock, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type AccessMode = 'GRADE' | 'CUSTOM';

interface Student {
  id: string;
  username: string;
  grade: Grade | null;
  activeFrom: string | null;
  activeTo: string | null;
  accessMode: AccessMode;
  createdAt: string;
}

interface VideoItem {
  id: string;
  title: string;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  cloudflareR2ThumbnailKey: string | null;
}

const CustomVideoPickerModal = ({ student, onSave, onCancel }: {
  student: Student;
  onSave: (videoIds: string[]) => void;
  onCancel: () => void;
}) => {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [videosRes, customRes] = await Promise.all([
          fetch('/api/videos'),
          fetch(`/api/users/${student.id}/custom-videos`),
        ]);
        const videosData = await videosRes.json();
        const customData = await customRes.json();
        setAllVideos(videosData.videos || []);
        setSelectedIds(new Set(customData.videoIds || []));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [student.id]);

  const toggleVideo = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(Array.from(selectedIds));
    setSaving(false);
  };

  const filtered = allVideos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !saving && onCancel()}>
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="relative bg-linear-to-br from-[#6d28d9] to-[#4c1d95] px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Film size={16} className="text-white" />
              <div>
                <span className="text-[15px] font-semibold text-white">Custom Video Access</span>
                <p className="text-[11px] text-purple-200 mt-0.5">{student.username}</p>
              </div>
            </div>
            <button type="button" onClick={onCancel} disabled={saving} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2 shrink-0 border-b border-[#e8eaed]">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos…"
              className="w-full rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-4 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-[#6d28d9]/20" />
          </div>
          <p className="mt-2 text-[11px] text-[#9aa0a6]">
            {selectedIds.size} of {allVideos.length} videos selected
          </p>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#6d28d9]" size={22} /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#9aa0a6]">No videos found.</p>
          ) : (
            <div className="space-y-1.5 py-2">
              {filtered.map((video) => (
                <button key={video.id} type="button" onClick={() => toggleVideo(video.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${selectedIds.has(video.id)
                    ? 'border-[#6d28d9]/30 bg-purple-50'
                    : 'border-[#e8eaed] bg-white hover:bg-[#f8f9fa]'
                    }`}>
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${selectedIds.has(video.id) ? 'border-[#6d28d9] bg-[#6d28d9]' : 'border-[#dadce0] bg-white'
                    }`}>
                    {selectedIds.has(video.id) && <Check size={11} className="text-white" />}
                  </div>
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e8eaed] bg-[#202124]">
                    {video.cloudflareR2ThumbnailKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/videos/${video.id}/thumbnail`} alt={video.title} className="h-full w-full object-cover" />
                    ) : (
                      <Film size={10} className="text-[#9aa0a6] opacity-50" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[13px] font-medium text-[#202124] ${notoSans.className}`}>
                      {video.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {video.grade && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${GRADE_COLORS[video.grade]}`}>
                          {GRADE_LABELS[video.grade]}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${video.visibility === 'PUBLIC' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                        {video.visibility === 'PUBLIC' ? <Globe size={9} /> : <Lock size={9} />}
                        {video.visibility === 'PUBLIC' ? 'Public' : 'Grade'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4 shrink-0">
          <span className="text-[12px] text-[#5f6368]">{selectedIds.size} videos selected</span>
          <div className="flex gap-2.5">
            <Button type="button" variant='outline' onPress={onCancel} isDisabled={saving}>
              Cancel
            </Button>
            <Button isPending={saving} variant='primary' className="bg-[#6d28d9]" onPress={handleSave} isDisabled={saving} >
              {({ isPending }) => (
                <>
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Access List
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomVideoPickerModal;
