import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import VideoDetails from '@/components/VideoDetails';

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  // 2. Increment view count (best-effort — don't fail the page on duplicate)
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

  // 3. Check if current user already liked this video
  const userHasLiked = await db.like.findUnique({
    where: {
      userId_videoId: { userId: user!.id, videoId: video.id },
    },
  });

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
      />
    </div>
  );
}
