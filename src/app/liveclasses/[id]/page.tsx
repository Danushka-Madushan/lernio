import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { signPlaybackTicket } from '@/lib/youtube';
import { VideoVisibility } from '@/generated/client/enums';
import LiveClassWatchClient from './LiveClassWatchClient';

export default async function LiveClassWatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    redirect(`/login?callbackUrl=/liveclasses/${id}`);
  }

  const liveClass = await db.youTubeClass.findUnique({
    where: { id },
    include: {
      teacher: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!liveClass) {
    notFound();
  }

  // Permission Checks
  if (user.role === 'STUDENT') {
    const studentRecord = await db.user.findUnique({
      where: { id: user.id },
      select: {
        grade: true,
        activeFrom: true,
        activeTo: true,
        teacherId: true,
      },
    });

    if (!studentRecord) notFound();

    const now = new Date();
    if (
      (studentRecord.activeFrom && now < studentRecord.activeFrom) ||
      (studentRecord.activeTo && now > studentRecord.activeTo)
    ) {
      redirect('/login?error=account_inactive');
    }

    // Strict Teacher Isolation
    if (liveClass.teacherId !== studentRecord.teacherId) {
      notFound();
    }

    // Grade visibility
    if (
      liveClass.visibility === VideoVisibility.GRADE &&
      liveClass.grade !== studentRecord.grade
    ) {
      notFound();
    }
  } else if (user.role === 'TEACHER' && liveClass.teacherId !== user.id) {
    notFound();
  }

  // Issue ephemeral ticket for player
  const ticket = await signPlaybackTicket({
    classId: liveClass.id,
    userId: user.id,
    youtubeId: liveClass.youtubeId,
    role: user.role,
  });

  return (
    <LiveClassWatchClient
      classId={liveClass.id}
      title={liveClass.title}
      description={liveClass.description}
      teacherName={liveClass.teacher?.username}
      ticket={ticket}
    />
  );
}
