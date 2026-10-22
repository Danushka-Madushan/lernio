'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Tv,
  Play,
  Calendar,
  Eye,
  GraduationCap,
  Sparkles,
  Loader2,
  User,
  Search,
} from 'lucide-react';
import { Button } from '@heroui/react';
import { Grade } from '@/generated/client/enums';
import { GRADE_LABELS } from '@/lib/constants';
import ShieldedYouTubePlayer from '@/components/liveclasses/ShieldedYouTubePlayer';
import LoadingScreen from '@/components/LoadingScreen';

interface StudentLiveClass {
  id: string;
  title: string;
  description: string | null;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  viewsCount: number;
  createdAt: string;
  teacher?: {
    id: string;
    username: string;
  } | null;
}

export default function StudentLiveClassesClient() {
  const [classes, setClasses] = useState<StudentLiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlayback, setActivePlayback] = useState<{
    classId: string;
    title: string;
    ticket: string;
  } | null>(null);
  const [launchLoading, setLaunchLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/live-classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load live classes');
      }
    } catch (err) {
      console.error('Failed to fetch student live classes:', err);
      setError('Connection error loading classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleWatchClass = async (item: StudentLiveClass) => {
    setLaunchLoading(item.id);
    setError(null);

    try {
      // 1. Obtain ephemeral playback ticket via authenticated handshake
      const res = await fetch(`/api/live-classes/${item.id}/ticket`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to authorize live stream');
      }

      const data = await res.json();

      // 2. Launch Shielded Cinema with the ticket (raw video ID is kept private!)
      setActivePlayback({
        classId: item.id,
        title: data.title || item.title,
        ticket: data.ticket,
      });
    } catch (err: any) {
      setError(err.message || 'Could not launch class stream');
    } finally {
      setLaunchLoading(null);
    }
  };

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-3 text-blue-100">
            <Sparkles size={13} />
            <span>Interactive Live Portal</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Live Stream Classes
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed">
            Access secure, high-definition online class streams curated directly by your teacher.
            All streams run in cinema view with distraction-free playback.
          </p>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Search Header */}
      {classes.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search available classes..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-900 outline-none hover:border-gray-300 focus:border-blue-500 transition-colors"
            />
          </div>
          <span className="text-xs font-medium text-gray-500 shrink-0">
            {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} available
          </span>
        </div>
      )}

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-2xs p-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Tv size={28} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No live classes scheduled</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? 'No classes match your search query.'
              : 'Your teacher has not published any live classes for your grade yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((item) => {
            const gradeLabel = item.grade ? GRADE_LABELS[item.grade] || item.grade : 'General';
            const isWatching = launchLoading === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-gray-200 shadow-2xs p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div>
                  {/* Badges */}
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

                  {/* Title */}
                  <h3 className="font-bold text-gray-900 text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  {item.description ? (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1">Special Live Session</p>
                  )}

                  {/* Teacher Info */}
                  {item.teacher && (
                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100 text-xs text-gray-600">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {item.teacher.username.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate">Teacher: {item.teacher.username}</span>
                    </div>
                  )}
                </div>

                {/* Big Watch Button */}
                <div className="mt-5 pt-3">
                  <Button
                    onPress={() => handleWatchClass(item)}
                    isDisabled={isWatching}
                    className="w-full text-xs font-bold h-11 px-4 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isWatching ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Securing Stream...</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} className="fill-current" />
                        <span>Watch Class Now</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
