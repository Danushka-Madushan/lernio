import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

function isAccountActive(activeFrom: Date | null, activeTo: Date | null): boolean {
  const now = new Date();
  if (activeFrom && now < activeFrom) return false;
  if (activeTo && now > activeTo) return false;
  return true;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const student = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!isAccountActive(student.activeFrom, student.activeTo)) {
      return NextResponse.json(
        { error: 'account_inactive', message: 'Your account is not active. Please contact staff.' },
        { status: 403 }
      );
    }

    // Resolve active teacher from cookie or student's enrollments
    const activeTeacherCookie = cookieStore.get('active_teacher_id')?.value;
    let effectiveTeacherId: string | null = null;

    if (activeTeacherCookie) {
      const match = await db.studentTeacher.findUnique({
        where: {
          studentId_teacherId: {
            studentId: user.id,
            teacherId: activeTeacherCookie,
          },
        },
      });
      if (match) {
        effectiveTeacherId = activeTeacherCookie;
      }
    }

    if (!effectiveTeacherId) {
      const firstEnrollment = await db.studentTeacher.findFirst({
        where: { studentId: user.id },
        select: { teacherId: true },
        orderBy: { createdAt: 'asc' },
      });
      effectiveTeacherId = firstEnrollment?.teacherId || null;
    }

    // If student has no assigned teacher, they have no meetings
    if (!effectiveTeacherId) {
      return NextResponse.json({ meetings: [] });
    }

    // Only fetch meetings for the student's assigned teacher and grade or global meetings (grade is null)
    // and where scheduledAt is not older than 2 hours.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const whereClause: any = {
      teacherId: effectiveTeacherId,
      OR: [
        { grade: null },
        ...(student.grade ? [{ grade: student.grade }] : []),
      ],
      scheduledAt: {
        gte: twoHoursAgo,
      },
    };

    const meetings = await db.zoomLink.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'asc' }, // Show next meetings first
    });

    return NextResponse.json({ meetings });
  } catch (error: unknown) {
    console.error('List student meetings error:', error);
    return NextResponse.json({ error: 'Failed to retrieve meetings' }, { status: 500 });
  }
}
