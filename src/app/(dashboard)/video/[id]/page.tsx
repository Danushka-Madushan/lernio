import React from 'react';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { s3, bucketName } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

  // 1. Fetch Video details
  const video = await db.video.findUnique({
    where: { id },
    include: {
      comments: {
        include: {
          user: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          likes: true,
        },
      },
    },
  });

  if (!video) {
    notFound();
  }

  // 2. Increment view count in Supabase
  try {
    await db.$transaction([
      db.view.create({
        data: {
          userId: user.id,
          videoId: video.id,
        },
      }),
      db.video.update({
        where: { id: video.id },
        data: {
          viewsCount: { increment: 1 },
        },
      }),
    ]);
  } catch (err) {
    console.error('Failed to log view in transaction:', err);
  }

  // 3. Generate presigned URL (valid for 5 minutes)
  let presignedUrl = '';
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: video.cloudflareR2Key,
    });
    presignedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });
  } catch (err) {
    console.error('Failed to sign play URL from R2:', err);
  }

  // 4. Check if current user liked this video
  const userHasLiked = await db.like.findUnique({
    where: {
      userId_videoId: {
        userId: user.id,
        videoId: video.id,
      },
    },
  });

  // Structure initial data payload
  const initialVideoData = {
    id: video.id,
    title: video.title,
    description: video.description,
    grade: video.grade,
    viewsCount: video.viewsCount + 1, // Add the current view
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
        presignedUrl={presignedUrl}
        currentUsername={user.username}
      />
    </div>
  );
}
