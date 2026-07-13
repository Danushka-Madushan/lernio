import React from 'react';
import { db, Grade } from '@/lib/db';
import Link from 'next/link';
import { Play, Heart, MessageSquare, Eye } from 'lucide-react';

const gradeMapping = [
  { label: 'Grade 6', value: Grade.GRADE_6 },
  { label: 'Grade 7', value: Grade.GRADE_7 },
  { label: 'Grade 8', value: Grade.GRADE_8 },
  { label: 'Grade 9', value: Grade.GRADE_9 },
  { label: 'Grade 10', value: Grade.GRADE_10 },
  { label: 'Grade 11', value: Grade.GRADE_11 },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeGrade = resolvedSearchParams.grade as Grade | undefined;

  let whereClause = {};
  if (activeGrade && Object.values(Grade).includes(activeGrade)) {
    whereClause = { grade: activeGrade };
  }

  const videos = await db.video.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  return (
    <div className="space-y-space-5">
      {/* Grade Selector */}
      <div className="flex flex-wrap gap-2 pb-space-2 border-b border-surface-strong">
        <Link
          href="/"
          className={`px-space-3 py-space-2 rounded-radius-xs text-xs font-semibold transition-all duration-instant outline-none focus-visible:ring-2 focus-visible:ring-surface-raised ${
            !activeGrade
              ? 'bg-black text-white'
              : 'bg-white text-text-primary border border-surface-strong hover:bg-surface-strong'
          }`}
        >
          All Grades
        </Link>
        {gradeMapping.map((g) => (
          <Link
            key={g.value}
            href={`/?grade=${g.value}`}
            className={`px-space-3 py-space-2 rounded-radius-xs text-xs font-semibold transition-all duration-instant outline-none focus-visible:ring-2 focus-visible:ring-surface-raised ${
              activeGrade === g.value
                ? 'bg-black text-white'
                : 'bg-white text-text-primary border border-surface-strong hover:bg-surface-strong'
            }`}
          >
            {g.label}
          </Link>
        ))}
      </div>

      {/* Video Feed */}
      {videos.length === 0 ? (
        <div className="text-center py-space-6 border border-dashed border-surface-strong bg-white rounded-radius-md">
          <p className="text-sm text-text-tertiary">No videos found for this grade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-4">
          {videos.map((vid) => (
            <div
              key={vid.id}
              className="flex flex-col bg-white rounded-radius-md border border-surface-strong overflow-hidden hover:shadow-md transition-all duration-instant"
            >
              <div className="relative aspect-video bg-[#0a0e12] flex items-center justify-center text-text-tertiary select-none">
                <Play size={40} className="opacity-80 text-white" />
                <span className="absolute bottom-2 right-2 bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-white">
                  {vid.grade.replace('GRADE_', 'Grade ')}
                </span>
              </div>
              <div className="p-space-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-semibold text-text-primary leading-tight mb-space-1 line-clamp-1">
                    {vid.title}
                  </h3>
                  <p className="text-xs text-text-tertiary line-clamp-2 mb-space-3">
                    {vid.description || 'No description provided.'}
                  </p>
                </div>
                <div className="flex justify-between items-center text-[11px] text-text-tertiary border-t border-surface-muted pt-space-2">
                  <div className="flex items-center space-x-space-2">
                    <span className="flex items-center space-x-0.5">
                      <Eye size={12} />
                      <span>{vid.viewsCount}</span>
                    </span>
                    <span className="flex items-center space-x-0.5">
                      <Heart size={12} />
                      <span>{vid._count.likes}</span>
                    </span>
                    <span className="flex items-center space-x-0.5">
                      <MessageSquare size={12} />
                      <span>{vid._count.comments}</span>
                    </span>
                  </div>
                  <Link
                    href={`/video/${vid.id}`}
                    className="bg-black text-white hover:bg-surface-raised hover:text-black font-semibold px-2.5 py-1 rounded text-[11px] transition-all duration-instant focus-visible:ring-1 focus-visible:ring-surface-raised outline-none"
                  >
                    Watch Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
