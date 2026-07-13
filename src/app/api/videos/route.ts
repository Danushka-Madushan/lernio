import { NextResponse } from 'next/server';
import { db, Grade } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

// GET: List all videos, optionally filtered by Grade
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gradeParam = searchParams.get('grade');

    let whereClause = {};
    if (gradeParam) {
      if (Object.values(Grade).includes(gradeParam as Grade)) {
        whereClause = { grade: gradeParam as Grade };
      } else {
        return NextResponse.json({ error: 'Invalid grade filter' }, { status: 400 });
      }
    }

    const videos = await db.video.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        cloudflareR2Key: true,
        grade: true,
        viewsCount: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json({ videos });
  } catch (error: any) {
    console.error('List videos error:', error);
    return NextResponse.json({ error: 'Failed to retrieve videos' }, { status: 500 });
  }
}

// POST: Save video metadata after successful upload
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, description, cloudflareR2Key, grade } = await request.json();

    if (!title || !cloudflareR2Key || !grade) {
      return NextResponse.json({ error: 'Title, cloudflareR2Key, and grade are required' }, { status: 400 });
    }

    if (!Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    const video = await db.video.create({
      data: {
        title,
        description,
        cloudflareR2Key,
        grade: grade as Grade,
      },
    });

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('Create video error:', error);
    return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
  }
}
