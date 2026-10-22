import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { extractYouTubeId } from '@/lib/youtube';
import { Grade, VideoVisibility } from '@/generated/client/enums';

// GET /api/live-classes - List live classes with role-based filtering & teacher isolation
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherFilter = searchParams.get('teacherId');
    const gradeFilter = searchParams.get('grade');

    if (user.role === 'STUDENT') {
      const studentRecord = await db.user.findUnique({
        where: { id: user.id },
        select: {
          grade: true,
          activeFrom: true,
          activeTo: true,
          teacherId: true,
        },
      });

      if (!studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
      }

      const now = new Date();
      if (
        (studentRecord.activeFrom && now < studentRecord.activeFrom) ||
        (studentRecord.activeTo && now > studentRecord.activeTo)
      ) {
        return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
      }

      // Strict Teacher Isolation: student only sees classes from their assigned teacher
      if (!studentRecord.teacherId) {
        return NextResponse.json({ classes: [] });
      }

      // Query classes matching teacher and grade visibility
      const classes = await db.youTubeClass.findMany({
        where: {
          teacherId: studentRecord.teacherId,
          OR: [
            { visibility: VideoVisibility.PUBLIC },
            {
              visibility: VideoVisibility.GRADE,
              grade: studentRecord.grade || undefined,
            },
          ],
        },
        select: {
          id: true,
          title: true,
          description: true,
          grade: true,
          visibility: true,
          viewsCount: true,
          createdAt: true,
          teacher: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({ classes });
    }

    // Teacher or Admin View
    const whereClause: {
      teacherId?: string;
      grade?: Grade;
    } = {};

    if (user.role === 'TEACHER') {
      // Teachers only see their own created classes
      whereClause.teacherId = user.id;
    } else if (user.role === 'ADMIN' && teacherFilter) {
      whereClause.teacherId = teacherFilter;
    }

    if (gradeFilter && Object.values(Grade).includes(gradeFilter as Grade)) {
      whereClause.grade = gradeFilter as Grade;
    }

    const classes = await db.youTubeClass.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error('Failed to fetch live classes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/live-classes - Create a new live YouTube class
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, youtubeUrl, grade, visibility, targetTeacherId } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      return NextResponse.json(
        { error: 'Valid YouTube URL or 11-character Video ID is required' },
        { status: 400 }
      );
    }

    const teacherId = user.role === 'ADMIN' && targetTeacherId ? targetTeacherId : user.id;

    const newClass = await db.youTubeClass.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        youtubeId,
        grade: grade && Object.values(Grade).includes(grade) ? (grade as Grade) : null,
        visibility: visibility === 'GRADE' ? VideoVisibility.GRADE : VideoVisibility.PUBLIC,
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ class: newClass }, { status: 201 });
  } catch (error) {
    console.error('Failed to create live class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
