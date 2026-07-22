import { db } from '@/lib/db';
import { Grade, VideoVisibility } from '@/generated/client/enums';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import Link from 'next/link';
import { Heart, MessageSquare, Eye } from 'lucide-react';
import AccountInactiveScreen from '@/components/AccountInactiveScreen';
import VideoThumbnail from '@/components/VideoThumbnail';
import { notoSans } from '@/lib/fonts';

const gradeMapping = [
  { label: 'Grade 6', value: Grade.GRADE_6 },
  { label: 'Grade 7', value: Grade.GRADE_7 },
  { label: 'Grade 8', value: Grade.GRADE_8 },
  { label: 'Grade 9', value: Grade.GRADE_9 },
  { label: 'Grade 10', value: Grade.GRADE_10 },
  { label: 'Grade 11', value: Grade.GRADE_11 },
];

function isAccountActive(activeFrom: Date | null, activeTo: Date | null): boolean {
  const now = new Date();
  if (activeFrom && now < activeFrom) return false;
  if (activeTo && now > activeTo) return false;
  return true;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeGrade = resolvedSearchParams.grade as Grade | undefined;

  // Get the logged-in user
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const sessionUser = token ? await verifyToken(token) : null;

  // For students: enforce account validity and access mode
  if (sessionUser && sessionUser.role === 'STUDENT') {
    const studentRecord = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        grade: true,
        activeFrom: true,
        activeTo: true,
        accessMode: true,
      },
    });

    if (!studentRecord || !isAccountActive(studentRecord.activeFrom, studentRecord.activeTo)) {
      return (
        <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <AccountInactiveScreen />
          </div>
        </div>
      );
    }

    // CUSTOM mode: show only assigned videos (no grade tabs)
    if (studentRecord.accessMode === 'CUSTOM') {
      const customAccess = await db.customVideoAccess.findMany({
        where: { userId: sessionUser.id },
        include: {
          video: {
            include: {
              _count: { select: { likes: true, comments: true } },
            },
          },
        },
      });
      const videos = customAccess.map((ca) => ca.video);

      return (
        <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* No grade tabs for custom mode */}
            <div className="border-b border-[#e8eaed] pb-5">
              <p className="text-sm text-[#5f6368]">Your assigned video library</p>
            </div>
            <VideoGrid videos={videos} />
          </div>
        </div>
      );
    }

    // GRADE mode: PUBLIC + grade-matched GRADE videos
    const whereClause: any = {
      OR: [
        { visibility: VideoVisibility.PUBLIC },
        ...(studentRecord.grade
          ? [{ visibility: VideoVisibility.GRADE, grade: studentRecord.grade }]
          : []),
      ],
    };

    if (activeGrade && Object.values(Grade).includes(activeGrade)) {
      whereClause.grade = activeGrade;
    }

    const videos = await db.video.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { likes: true, comments: true } } },
    });

    return (
      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <GradeTabs activeGrade={activeGrade} />
          <VideoGrid videos={videos} />
        </div>
      </div>
    );
  }

  // ADMIN or unauthenticated: show all videos with grade filter
  let whereClause: any = {};
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
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <GradeTabs activeGrade={activeGrade} />
        <VideoGrid videos={videos} />
      </div>
    </div>
  );
}

// ── Grade Tabs ──────────────────────────────────────────────────────────────────

function GradeTabs({ activeGrade }: { activeGrade?: Grade }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[#e8eaed] pb-5">
      <Link
        href="/"
        className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          !activeGrade
            ? 'bg-blue-500 text-white shadow-sm'
            : 'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4]'
        }`}
      >
        All Grades
      </Link>
      {gradeMapping.map((g) => (
        <Link
          key={g.value}
          href={`/?grade=${g.value}`}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
            activeGrade === g.value
              ? 'bg-blue-500 text-white shadow-sm'
              : 'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4]'
          }`}
        >
          {g.label}
        </Link>
      ))}
    </div>
  );
}

// ── Video Grid ──────────────────────────────────────────────────────────────────

type VideoWithCounts = {
  id: string;
  title: string;
  description: string | null;
  grade: Grade | null;
  cloudflareR2ThumbnailKey: string | null;
  viewsCount: number;
  _count: { likes: number; comments: number };
};

function VideoGrid({ videos }: { videos: VideoWithCounts[] }) {
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
