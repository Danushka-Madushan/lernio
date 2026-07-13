import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { s3, bucketName } from '@/lib/r2';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// GET: Retrieve a video, increment views, check like status, and return pre-signed play URL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch Video
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
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // 2. Increment View Count & Track View
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
    } catch (viewErr) {
      // Non-blocking log, if they double click/reload quickly, it might trigger transaction collision
      console.warn('View tracking transaction issue:', viewErr);
    }

    // 3. Generate presigned URL (valid for 5 minutes)
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: video.cloudflareR2Key,
    });
    const presignedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });

    // 4. Check if current user liked this video
    const userHasLiked = await db.like.findUnique({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId: video.id,
        },
      },
    });

    return NextResponse.json({
      video: {
        ...video,
        viewsCount: video.viewsCount + 1, // Reflect the current view in payload
      },
      presignedUrl,
      hasLiked: !!userHasLiked,
    });
  } catch (error: any) {
    console.error('Retrieve video details error:', error);
    return NextResponse.json({ error: 'Failed to retrieve video details' }, { status: 500 });
  }
}

// PUT: Update video metadata (ADMIN only)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, description, grade, cloudflareR2ThumbnailKey } = await request.json();

    if (!title || !grade) {
      return NextResponse.json({ error: 'Title and grade are required' }, { status: 400 });
    }

    const updatedVideo = await db.video.update({
      where: { id },
      data: {
        title,
        description,
        grade,
        ...(cloudflareR2ThumbnailKey !== undefined ? { cloudflareR2ThumbnailKey } : {}),
      },
    });

    return NextResponse.json({ success: true, video: updatedVideo });
  } catch (error: any) {
    console.error('Update video error:', error);
    return NextResponse.json({ error: 'Failed to update video metadata' }, { status: 500 });
  }
}

// DELETE: Delete video from R2 and Supabase (ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Get video record to locate Cloudflare R2 Key
    const video = await db.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // 2. Delete file from Cloudflare R2
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: video.cloudflareR2Key,
      });
      await s3.send(deleteCommand);
    } catch (r2Err) {
      console.error('Failed to delete file from R2 bucket:', r2Err);
      // Continue deleting DB entry even if R2 deletion failed (to prevent state inconsistency)
    }

    // 3. Delete database record (cascading deletes comments, likes, views automatically via schema cascade relation)
    await db.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('Delete video error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
