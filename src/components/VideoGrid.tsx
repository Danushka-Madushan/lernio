// ── Video Grid ──────────────────────────────────────────────────────────────────

import { Grade } from '@/lib/db';
import VideoThumbnail from './VideoThumbnail';
import Link from 'next/link';
import { notoSans } from '@/lib/fonts';
import { Eye, Heart, MessageSquare } from 'lucide-react';

type VideoWithCounts = {
  id: string;
  title: string;
  description: string | null;
  grade: Grade | null;
  cloudflareR2ThumbnailKey: string | null;
  viewsCount: number;
  _count: { likes: number; comments: number };
};

const VideoGrid = ({ videos }: { videos: VideoWithCounts[] }) => {
  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#dadce0] bg-white py-16 text-center">
        <p className="text-sm text-[#5f6368]">No videos found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {videos.map((vid) => (
        <div
          key={vid.id}
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] transition-shadow duration-150 hover:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
        >
          <VideoThumbnail
            videoId={vid.id}
            title={vid.title}
            grade={vid.grade}
            hasThumbnail={!!vid.cloudflareR2ThumbnailKey}
          />
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <h3 className="mb-1 line-clamp-1 text-[15px] font-medium leading-tight text-[#202124] transition-colors hover:text-blue-500">
                <Link className={notoSans.className} href={`/video/${vid.id}`}>
                  {vid.title}
                </Link>
              </h3>
              <p className={`mb-3 line-clamp-2 text-xs text-[#5f6368] ${notoSans.className}`}>
                {vid.description || 'No description provided.'}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-[#f1f3f4] pt-3 text-[11px] text-[#5f6368]">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Eye size={12} />
                  <span>{vid.viewsCount}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Heart size={12} />
                  <span>{vid._count.likes}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MessageSquare size={12} />
                  <span>{vid._count.comments}</span>
                </span>
              </div>
              <Link
                href={`/video/${vid.id}`}
                className="rounded-full bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white outline-none transition-all duration-150 hover:bg-[#1765cc] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500/40"
              >
                Watch Now
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default VideoGrid;
