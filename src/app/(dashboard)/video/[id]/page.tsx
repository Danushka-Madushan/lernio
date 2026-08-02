import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import VideoDetails from '@/components/VideoDetails';
import { s3, bucketName } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { VideoVisibility } from '@/generated/client/enums';

const VideoPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    redirect(`/login?callbackUrl=/video/${id}`);
  }

  // 1. Fetch video details
  const video = await db.video.findUnique({
    where: { id },
    include: {
      comments: {
        include: {
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { likes: true },
      },
    },
  });

  if (!video) {
    notFound();
  }

  // 2. Students: enforce access rules before issuing any URL
  if (user.role === 'STUDENT') {
    const studentRecord = await db.user.findUnique({
      where: { id: user.id },
      select: { grade: true, activeFrom: true, activeTo: true, accessMode: true },
    });

    if (!studentRecord) notFound();

    const now = new Date();
    if (
      (studentRecord.activeFrom && now < studentRecord.activeFrom) ||
      (studentRecord.activeTo && now > studentRecord.activeTo)
    ) {
      // Redirect to login with a message rather than crashing
      redirect('/login?error=account_inactive');
    }

    if (studentRecord.accessMode === 'CUSTOM') {
      const customEntry = await db.customVideoAccess.findUnique({
        where: { userId_videoId: { userId: user.id, videoId: id } },
      });
      if (!customEntry) notFound();
    } else {
      // GRADE mode: GRADE-visibility videos must match the student's grade
      if (video.visibility === VideoVisibility.GRADE) {
        if (!studentRecord.grade || !video.grade || studentRecord.grade !== video.grade) {
          notFound();
        }
      }
    }
  }

  // 3. Increment view count (best-effort - don't fail the page on duplicate)
  try {
    await db.$transaction([
      db.view.create({
        data: { userId: user!.id, videoId: video.id },
      }),
      db.video.update({
        where: { id: video.id },
        data: { viewsCount: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    console.error('View tracking error:', err);
  }

  // 4. Check if current user already liked this video
  const userHasLiked = await db.like.findUnique({
    where: {
      userId_videoId: { userId: user!.id, videoId: video.id },
    },
  });

  // 5. Generate presigned URL server-side (valid 4 hours).
  //    Bytes flow R2 → browser directly; nothing transits the server.
  //    4-hour expiry covers any realistic educational video watch session
  //    without the URL going stale mid-playback. Auth is already enforced
  //    above before we reach this line — the URL is never exposed publicly.
  const presignedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucketName, Key: video.cloudflareR2Key }),
    { expiresIn: 60 * 60 * 4 } // 4 hours
  );

  const initialVideoData = {
    id: video.id,
    title: video.title,
    description: video.description,
    grade: video.grade,
    viewsCount: video.viewsCount + 1,
    likesCount: video._count.likes,
    createdAt: video.createdAt.toISOString(),
  };

  const initialComments = video.comments.map((c) => ({
    id: c.id,
    content: c.content,
    username: c.user.username,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-space-4">
      <VideoDetails
        video={initialVideoData}
        initialComments={initialComments}
        initialHasLiked={!!userHasLiked}
        currentUsername={user!.username}
        presignedUrl={presignedUrl}
      />
    </div>
  );
}

export default VideoPage;


