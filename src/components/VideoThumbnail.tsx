'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play, Loader2 } from 'lucide-react';
import { Grade } from '@/generated/client/enums';

type ThumbnailStatus = 'loading' | 'loaded' | 'error';

type VideoThumbnailProps = {
  videoId: string;
  title: string;
  grade: Grade | null;
  hasThumbnail: boolean;
  showGrade?: boolean;
};

export default function VideoThumbnail({ videoId, title, grade, hasThumbnail, showGrade }: VideoThumbnailProps) {
  // No thumbnail key at all -> skip straight to the fallback, no need to fake a loading state.
  const [status, setStatus] = useState<ThumbnailStatus>(hasThumbnail ? 'loading' : 'error');

  const isPending = status === 'loading';
  const showImage = hasThumbnail && status !== 'error';

  return (
    <Link
      href={`/video/${videoId}`}
      className="group/thumb relative aspect-video select-none overflow-hidden bg-[#202124] flex items-center justify-center text-[#9aa0a6]"
    >
      {/* Fallback gradient — shown while the thumbnail is loading (pulsing) and permanently if there is none/it failed */}
      {(!showImage || isPending) && (
        <div
          className={`absolute inset-0 bg-linear-to-br from-[#3c4043] to-[#202124] ${
            isPending ? 'animate-pulse' : ''
          }`}
        />
      )}

      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/videos/${videoId}/thumbnail`}
          alt={title}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 group-hover/thumb:scale-105 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Loading feedback while the real thumbnail is being fetched */}
      {isPending && (
        <Loader2 size={28} className="absolute animate-spin text-white/70" aria-label="Loading thumbnail" />
      )}

      {/* Play icon overlays — only once we have a final visual (loaded image or fallback), so they don't flash over the spinner */}
      {!isPending && (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover/thumb:opacity-100">
            <Play size={36} className="fill-white text-white" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 group-hover/thumb:opacity-0">
            <Play size={32} className="text-white opacity-80" />
          </div>
        </>
      )}

      {grade && showGrade && (
        <span className="absolute bottom-2 right-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
          {grade.replace('GRADE_', 'Grade ')}
        </span>
      )}
    </Link>
  );
}
