'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Tv, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@heroui/react';
import ShieldedYouTubePlayer from '@/components/liveclasses/ShieldedYouTubePlayer';

interface LiveClassWatchClientProps {
  classId: string;
  title: string;
  description: string | null;
  teacherName?: string;
  ticket: string;
}

export default function LiveClassWatchClient({
  classId,
  title,
  description,
  teacherName,
  ticket,
}: LiveClassWatchClientProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Link
        href="/liveclasses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Live Classes
      </Link>

      {/* Main Preview Launch Stage */}
      <div className="relative aspect-video rounded-3xl bg-[#05070B] border border-gray-800 shadow-xl overflow-hidden flex items-center justify-center text-white">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-radial from-blue-950/20 via-black to-black opacity-90" />

        <div className="relative z-10 text-center px-6 max-w-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mb-4 shadow-lg backdrop-blur-md">
            <Tv size={36} />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
            {title}
          </h2>

          <p className="text-xs text-gray-400 mb-6 line-clamp-2">
            {description || 'Interactive shielded cinema stream curated by your teacher.'}
          </p>

          <Button
            size="lg"
            onPress={() => setIsPlaying(true)}
            className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play size={18} className="fill-current" />
            <span>Launch Cinema Player</span>
          </Button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-mono text-emerald-400">
            <ShieldCheck size={13} />
            <span>Encrypted & Shielded Stream Access</span>
          </div>
        </div>
      </div>

      {/* Metadata Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            <Sparkles size={12} /> Live Session
          </span>
          {teacherName && (
            <span className="text-xs text-gray-500">Teacher: {teacherName}</span>
          )}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {description && <p className="text-xs text-gray-600 leading-relaxed">{description}</p>}
      </div>

      {/* Active Fullscreen Shielded Player Session */}
      {isPlaying && (
        <ShieldedYouTubePlayer
          classId={classId}
          title={title}
          ticket={ticket}
          onClose={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
}
