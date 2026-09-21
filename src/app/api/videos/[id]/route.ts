import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { s3, bucketName } from '@/lib/r2';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Grade, VideoVisibility } from '@/generated/client/enums';

// Helper: check if a student account is currently active
function isAccountActive(activeFrom: Date | null, activeTo: Date | null): boolean {
  const now = new Date();
  if (activeFrom && now < activeFrom) return false;
  if (activeTo && now > activeTo) return false;
  return true;
}

// GET: Retrieve a video, enforce access rules, increment views, return pre-signed URL
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

    // 2. For teachers: check video ownership
    if (user.role === 'TEACHER' && video.teacherId !== user.id) {
      return NextResponse.json({ error: 'Access denied to this video' }, { status: 403 });
    }

    // 3. For students: enforce access rules and teacher isolation
    if (user.role === 'STUDENT') {
      const studentRecord = await db.user.findUnique({
        where: { id: user.id },
        select: {
          grade: true,
          activeFrom: true,
          activeTo: true,
          accessMode: true,
          teacherId: true,
        },
      });

      if (!studentRecord) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Account validity check
      if (!isAccountActive(studentRecord.activeFrom, studentRecord.activeTo)) {
        return NextResponse.json(
          { error: 'account_inactive', message: 'Your account is not active. Please contact staff.' },
          { status: 403 }
        );
      }

      // Strict Teacher isolation: video must belong to student's assigned teacher
      if (!studentRecord.teacherId || video.teacherId !== studentRecord.teacherId) {
        return NextResponse.json({ error: 'Access denied to this video' }, { status: 403 });
      }

      // Access mode check
      if (studentRecord.accessMode === 'CUSTOM') {
        // Must be in their custom list
        const customEntry = await db.customVideoAccess.findUnique({
          where: { userId_videoId: { userId: user.id, videoId: id } },
        });
        if (!customEntry) {
          return NextResponse.json({ error: 'Access denied to this video' }, { status: 403 });
        }
      } else {
        // GRADE mode
        if (video.visibility === VideoVisibility.GRADE) {
          // Must have a matching grade
          if (!studentRecord.grade || !video.grade || studentRecord.grade !== video.grade) {
            return NextResponse.json({ error: 'Access denied to this video' }, { status: 403 });
          }
        }
        // PUBLIC videos are always accessible in GRADE mode (within their teacher)
      }
    }

    // 4. Increment View Count & Track View
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
      console.warn('View tracking transaction issue:', viewErr);
    }

    // 5. Generate presigned URL (valid for 5 minutes)
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: video.cloudflareR2Key,
    });
    const presignedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });

    // 6. Check if current user liked this video
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
        viewsCount: video.viewsCount + 1,
      },
      presignedUrl,
      hasLiked: !!userHasLiked,
    });
  } catch (error: unknown) {
    console.error('Retrieve video details error:', error);
    return NextResponse.json({ error: 'Failed to retrieve video details' }, { status: 500 });
  }
}

// PUT: Update video metadata (ADMIN or TEACHER who owns the video)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const existingVideo = await db.video.findUnique({ where: { id } });
    if (!existingVideo) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && existingVideo.teacherId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own videos' },
        { status: 403 }
      );
    }

    const { title, description, grade, cloudflareR2ThumbnailKey, visibility } =
      await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Validate grade if provided
    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    const updateData: any = {
      title,
      description,
      grade: grade ? (grade as Grade) : null,
      ...(cloudflareR2ThumbnailKey !== undefined ? { cloudflareR2ThumbnailKey } : {}),
    };

    if (visibility !== undefined) {
      updateData.visibility =
        visibility === 'GRADE' ? VideoVisibility.GRADE : VideoVisibility.PUBLIC;
    }

    const updatedVideo = await db.video.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, video: updatedVideo });
  } catch (error: unknown) {
    console.error('Update video error:', error);
    return NextResponse.json({ error: 'Failed to update video metadata' }, { status: 500 });
  }
}

// DELETE: Delete video from R2 and DB (ADMIN or TEACHER who owns the video)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Get video record to locate Cloudflare R2 Key and verify ownership
    const video = await db.video.findUnique({
      where: { id },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && video.teacherId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own videos' },
        { status: 403 }
      );
    }

    // 2. Delete file and thumbnail from Cloudflare R2
    try {
      if (video.cloudflareR2Key && !video.cloudflareR2Key.startsWith('http')) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: video.cloudflareR2Key,
        });
        await s3.send(deleteCommand);
      }

      if (video.cloudflareR2ThumbnailKey && !video.cloudflareR2ThumbnailKey.startsWith('http')) {
        const deleteThumbCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: video.cloudflareR2ThumbnailKey,
        });
        await s3.send(deleteThumbCommand);
      }
    } catch (r2Err) {
      console.error('Failed to delete file from R2 bucket:', r2Err);
    }

    // 3. Delete database record
    await db.video.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete video error:', error);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
