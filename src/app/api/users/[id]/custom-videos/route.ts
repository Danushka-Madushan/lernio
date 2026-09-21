import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

// GET: Return the list of videos in a student's custom access list
export async function GET(
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
    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, teacherId: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && student.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customAccess = await db.customVideoAccess.findMany({
      where: { userId: id },
      include: {
        video: {
          select: {
            id: true,
            title: true,
            grade: true,
            visibility: true,
            cloudflareR2ThumbnailKey: true,
            teacherId: true,
          },
        },
      },
    });

    const videoIds = customAccess.map((ca) => ca.videoId);
    const videos = customAccess.map((ca) => ca.video);

    return NextResponse.json({ videoIds, videos, teacherId: student.teacherId });
  } catch (error: unknown) {
    console.error('Get custom videos error:', error);
    return NextResponse.json({ error: 'Failed to retrieve custom video list' }, { status: 500 });
  }
}

// PUT: Replace the student's custom access list
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
    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, teacherId: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && student.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { videoIds } = await request.json();

    if (!Array.isArray(videoIds)) {
      return NextResponse.json({ error: 'videoIds must be an array' }, { status: 400 });
    }

    // If student has an assigned teacher, only assign videos from that teacher
    let allowedVideoIds = videoIds;
    if (videoIds.length > 0 && student.teacherId) {
      const validVideos = await db.video.findMany({
        where: {
          id: { in: videoIds },
          teacherId: student.teacherId,
        },
        select: { id: true },
      });
      allowedVideoIds = validVideos.map((v) => v.id);
    }

    // Replace all custom video access entries for this user atomically
    await db.$transaction([
      db.customVideoAccess.deleteMany({ where: { userId: id } }),
      ...(allowedVideoIds.length > 0
        ? [
            db.customVideoAccess.createMany({
              data: allowedVideoIds.map((videoId: string) => ({
                userId: id,
                videoId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, count: allowedVideoIds.length });
  } catch (error: unknown) {
    console.error('Set custom videos error:', error);
    return NextResponse.json({ error: 'Failed to update custom video list' }, { status: 500 });
  }
}
