'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tv,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Play,
  Calendar,
  Eye,
  GraduationCap,
  Sparkles,
  Loader2,
  Video,
} from 'lucide-react';
import { Button } from '@heroui/react';
import { Grade } from '@/generated/client/enums';
import { GRADE_LABELS } from '@/lib/constants';
import AddLiveClassModal from '@/components/liveclasses/AddLiveClassModal';
import EditLiveClassModal from '@/components/liveclasses/EditLiveClassModal';
import LiveClassDeleteConfirmModal from '@/components/liveclasses/LiveClassDeleteConfirmModal';
import ShieldedYouTubePlayer from '@/components/liveclasses/ShieldedYouTubePlayer';
import LoadingScreen from '@/components/LoadingScreen';

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  viewsCount: number;
  createdAt: string;
  teacher?: {
    id: string;
    username: string;
  } | null;
}

interface TeacherLiveClassesClientProps {
  teacherId: string;
  isAdmin: boolean;
  allowedGrades?: Grade[] | null;
  gradeAliases?: Record<string, string> | null;
}

export default function TeacherLiveClassesClient({
  teacherId,
  isAdmin,
  allowedGrades,
  gradeAliases,
}: TeacherLiveClassesClientProps) {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LiveClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveClass | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Active Cinema Session State
  const [activePlayback, setActivePlayback] = useState<{
    classId: string;
    title: string;
    ticket: string;
  } | null>(null);
  const [launchLoading, setLaunchLoading] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/live-classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
      showToast('Failed to load live classes', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/live-classes/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete class');
      }

      showToast(`"${deleteTarget.title}" deleted successfully`, 'ok');
      setDeleteTarget(null);
      fetchClasses();
    } catch (err: any) {
      showToast(err.message || 'Deletion failed', 'err');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLaunchCinema = async (c: LiveClass) => {
    setLaunchLoading(c.id);
    try {
      const res = await fetch(`/api/live-classes/${c.id}/ticket`);
      if (!res.ok) {
        throw new Error('Could not obtain playback ticket');
      }
      const data = await res.json();
      setActivePlayback({
        classId: c.id,
        title: data.title,
        ticket: data.ticket,
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to launch player', 'err');
    } finally {
      setLaunchLoading(null);
    }
  };

  // Filtered list
  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade = gradeFilter === 'ALL' || c.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const availableGrades = allowedGrades && allowedGrades.length > 0 ? allowedGrades : Object.values(Grade);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-100 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            toast.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Tv size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Live Classes Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage custom YouTube classes and shielded streams for your assigned students
          </p>
        </div>

        <Button
          onPress={() => setIsAddOpen(true)}
          className="text-xs font-semibold h-10 px-4 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700 flex items-center gap-1.5"
        >
          <Plus size={16} />
          <span>Add Live Class</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes by title or topic..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none hover:border-gray-300 focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400 shrink-0" />
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-700 outline-none hover:border-gray-300 focus:border-blue-500 transition-colors bg-white cursor-pointer"
          >
            <option value="ALL">All Grades</option>
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
      </div>

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-2xs p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Tv size={28} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No live classes found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery || gradeFilter !== 'ALL'
              ? 'No classes match your current search or grade filter.'
              : 'You have not added any live classes yet. Click below to add your first YouTube stream.'}
          </p>
          <Button
            onPress={() => setIsAddOpen(true)}
            className="text-xs font-semibold h-9 px-4 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700"
          >
            <Plus size={15} className="mr-1" />
            Add First Live Class
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((item) => {
            const gradeLabel = item.grade
              ? gradeAliases?.[item.grade] || GRADE_LABELS[item.grade] || item.grade
              : 'All Grades';

            const isLaunching = launchLoading === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-5 flex flex-col justify-between hover:border-blue-300 transition-all group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                      <GraduationCap size={12} />
                      <span>{gradeLabel}</span>
                    </span>

                    <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                      <Eye size={12} />
                      <span>{item.viewsCount} views</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  {item.description ? (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1">No description provided</p>
                  )}

                  {/* Stream Target Readout */}
                  <div className="mt-3.5 p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-600">
                    <span className="truncate">Key: {item.youtubeId}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Shielded
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    onPress={() => handleLaunchCinema(item)}
                    isDisabled={isLaunching}
                    className="text-xs font-semibold h-8 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5"
                  >
                    {isLaunching ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Play size={13} className="fill-current" />
                    )}
                    <span>Preview Stream</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditTarget(item)}
                      title="Edit Class"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      title="Delete Class"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddLiveClassModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => {
          showToast('Live class created successfully', 'ok');
          fetchClasses();
        }}
        allowedGrades={allowedGrades}
        gradeAliases={gradeAliases}
      />

      <EditLiveClassModal
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          showToast('Live class updated successfully', 'ok');
          fetchClasses();
        }}
        allowedGrades={allowedGrades}
        gradeAliases={gradeAliases}
      />

      <LiveClassDeleteConfirmModal
        target={deleteTarget}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Active Fullscreen Shielded Cinema Session */}
      {activePlayback && (
        <ShieldedYouTubePlayer
          classId={activePlayback.classId}
          title={activePlayback.title}
          ticket={activePlayback.ticket}
          onClose={() => setActivePlayback(null)}
        />
      )}
    </div>
  );
}
