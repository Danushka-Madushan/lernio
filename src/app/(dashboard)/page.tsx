import { db } from '@/lib/db';
import { Grade, VideoVisibility } from '@/generated/client/enums';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import AccountInactiveScreen from '@/components/AccountInactiveScreen';
import GradeTabs from '@/components/GradeTabs';
import VideoGrid from '@/components/VideoGrid';

const isAccountActive = (activeFrom: Date | null, activeTo: Date | null): boolean => {
  const now = new Date();
  if (activeFrom && now < activeFrom) return false;
  if (activeTo && now > activeTo) return false;
  return true;
};

const DashboardPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) => {
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

export default DashboardPage;
