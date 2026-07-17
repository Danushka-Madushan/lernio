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

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
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
          },
        },
      },
    });

    const videoIds = customAccess.map((ca) => ca.videoId);
    const videos = customAccess.map((ca) => ca.video);

    return NextResponse.json({ videoIds, videos });
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

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { videoIds } = await request.json();

    if (!Array.isArray(videoIds)) {
      return NextResponse.json({ error: 'videoIds must be an array' }, { status: 400 });
    }

    // Replace all custom video access entries for this user atomically
    await db.$transaction([
      db.customVideoAccess.deleteMany({ where: { userId: id } }),
      ...(videoIds.length > 0
        ? [
            db.customVideoAccess.createMany({
              data: videoIds.map((videoId: string) => ({
                userId: id,
                videoId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, count: videoIds.length });
  } catch (error: unknown) {
    console.error('Set custom videos error:', error);
    return NextResponse.json({ error: 'Failed to update custom video list' }, { status: 500 });
  }
}
