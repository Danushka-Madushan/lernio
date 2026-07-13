import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if like exists
    const existingLike = await db.like.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId,
        },
      },
    });

    let liked = false;

    if (existingLike) {
      // Remove Like
      await db.like.delete({
        where: {
          userId_videoId: {
            userId: user.id,
            videoId,
          },
        },
      });
      liked = false;
    } else {
      // Add Like
      await db.like.create({
        data: {
          userId: user.id,
          videoId,
        },
      });
      liked = true;
    }

    const likesCount = await db.like.count({
      where: { videoId },
    });

    return NextResponse.json({ success: true, likesCount, hasLiked: liked });
  } catch (error: any) {
    console.error('Toggle like error:', error);
    return NextResponse.json({ error: 'Failed to process like action' }, { status: 500 });
  }
}
