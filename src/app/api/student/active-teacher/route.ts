import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

// GET: Return student's assigned teachers and currently selected active teacher
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const enrollments = await db.studentTeacher.findMany({
      where: { studentId: user.id },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            allowedGrades: true,
            gradeAliases: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const teachers = enrollments
      .map((e) => e.teacher)
      .filter(Boolean);

    const activeTeacherId = cookieStore.get('active_teacher_id')?.value || null;

    return NextResponse.json({
      teachers,
      activeTeacherId,
    });
  } catch (error: unknown) {
    console.error('Failed to get assigned teachers:', error);
    return NextResponse.json({ error: 'Failed to retrieve teachers' }, { status: 500 });
  }
}

// POST: Select active teacher for the student's session
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { teacherId } = body;

    if (!teacherId || typeof teacherId !== 'string') {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
    }

    // Verify student is enrolled with this teacher
    const enrollment = await db.studentTeacher.findUnique({
      where: {
        studentId_teacherId: {
          studentId: user.id,
          teacherId,
        },
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

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled with this teacher.' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      activeTeacher: enrollment.teacher,
    });

    // Set active_teacher_id cookie
    response.cookies.set('active_teacher_id', teacherId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: unknown) {
    console.error('Set active teacher error:', error);
    return NextResponse.json({ error: 'Failed to set active teacher' }, { status: 500 });
  }
}
