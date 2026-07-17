import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Grade, VideoVisibility } from '@/generated/client/enums';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

// Helper: check if a student account is currently active
function isAccountActive(activeFrom: Date | null, activeTo: Date | null): boolean {
  const now = new Date();
  if (activeFrom && now < activeFrom) return false;
  if (activeTo && now > activeTo) return false;
  return true;
}

// GET: List videos — filtered by student's access rules or admin
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

    // ADMIN: return all videos with optional grade filter
    if (user.role === 'ADMIN') {
      let whereClause: any = {};
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
          cloudflareR2ThumbnailKey: true,
          grade: true,
          visibility: true,
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
    }

    // STUDENT: enforce access rules
    const studentRecord = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        grade: true,
        activeFrom: true,
        activeTo: true,
        accessMode: true,
      },
    });

    if (!studentRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check account validity
    if (!isAccountActive(studentRecord.activeFrom, studentRecord.activeTo)) {
      return NextResponse.json({ error: 'account_inactive', message: 'Your account is not active. Please contact staff.' }, { status: 403 });
    }

    let videos;

    if (studentRecord.accessMode === 'CUSTOM') {
      // CUSTOM mode: only videos in their explicit list
      const customAccess = await db.customVideoAccess.findMany({
        where: { userId: user.id },
        include: {
          video: {
            include: {
              _count: {
                select: { likes: true, comments: true },
              },
            },
          },
        },
      });
      videos = customAccess.map((ca) => ca.video);
    } else {
      // GRADE mode: PUBLIC videos + GRADE videos matching student's grade
      const whereClause: any = {
        OR: [
          { visibility: VideoVisibility.PUBLIC },
          ...(studentRecord.grade
            ? [{ visibility: VideoVisibility.GRADE, grade: studentRecord.grade }]
            : []),
        ],
      };

      // Optional grade filter from query param (only applies within allowed scope)
      if (gradeParam && Object.values(Grade).includes(gradeParam as Grade)) {
        whereClause.grade = gradeParam as Grade;
      }

      videos = await db.video.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { likes: true, comments: true },
          },
        },
      });
    }

    return NextResponse.json({ videos });
  } catch (error: unknown) {
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
    const { title, description, cloudflareR2Key, cloudflareR2ThumbnailKey, grade, visibility } = await request.json();

    if (!title || !cloudflareR2Key) {
      return NextResponse.json({ error: 'Title and cloudflareR2Key are required' }, { status: 400 });
    }

    // Validate grade if provided
    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    // Validate visibility if provided
    const resolvedVisibility: VideoVisibility = visibility === 'GRADE' ? VideoVisibility.GRADE : VideoVisibility.PUBLIC;

    const video = await db.video.create({
      data: {
        title,
        description,
        cloudflareR2Key,
        cloudflareR2ThumbnailKey,
        grade: grade ? (grade as Grade) : null,
        visibility: resolvedVisibility,
      },
    });

    return NextResponse.json({ success: true, video });
  } catch (error: unknown) {
    console.error('Create video error:', error);
    return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
  }
}
