import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Grade, AccessMode } from '@/generated/client/enums';

// GET: List students (filtered by teacher for TEACHER role, or all with filters for ADMIN)
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gradeParam = searchParams.get('grade');
    const statusParam = searchParams.get('status'); // 'active' | 'expired'
    const teacherParam = searchParams.get('teacherId');

    const now = new Date();

    // Build where clause
    const where: any = { role: 'STUDENT' };

    // Role-based tenant filter:
    // TEACHER only sees their own assigned students.
    // ADMIN can see all or filter by specific teacher.
    if (user.role === 'TEACHER') {
      where.teacherEnrollments = { some: { teacherId: user.id } };
    } else if (teacherParam) {
      where.teacherEnrollments = { some: { teacherId: teacherParam } };
    }

    if (gradeParam && Object.values(Grade).includes(gradeParam as Grade)) {
      where.grade = gradeParam as Grade;
    }

    if (statusParam === 'expired') {
      where.OR = [
        { activeTo: { lt: now } },
        { AND: [{ activeFrom: { gt: now } }, { activeTo: { not: null } }] },
      ];
    } else if (statusParam === 'active') {
      where.AND = [
        { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
        { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
      ];
    }

    const rawStudents = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        grade: true,
        activeFrom: true,
        activeTo: true,
        accessMode: true,
        teacherEnrollments: {
          select: {
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
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const students = rawStudents.map((s) => {
      const teachers = s.teacherEnrollments.map((e) => e.teacher).filter(Boolean);
      return {
        ...s,
        teachers,
      };
    });

    return NextResponse.json({ students });
  } catch (error: unknown) {
    console.error('List students error:', error);
    return NextResponse.json({ error: 'Failed to retrieve students' }, { status: 500 });
  }
}

// POST: Create a new student account (ADMIN only - requires teacher assignment)
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can create new student accounts.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { username, password, grade, activeFrom, activeTo, accessMode, teacherId, teacherIds } = body;

    if (!username || !password || username.trim().length < 3 || password.length < 4) {
      return NextResponse.json(
        { error: 'Username must be at least 3 chars; password must be at least 4 chars.' },
        { status: 400 }
      );
    }

    // Validate grade if provided
    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    // Validate accessMode if provided
    if (accessMode && !Object.values(AccessMode).includes(accessMode as AccessMode)) {
      return NextResponse.json({ error: 'Invalid access mode' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Resolve teacher IDs (accepts array teacherIds or single teacherId)
    let assignedIds: string[] = [];
    if (Array.isArray(teacherIds) && teacherIds.length > 0) {
      assignedIds = Array.from(new Set(teacherIds.filter((id: unknown) => typeof id === 'string' && (id as string).trim().length > 0)));
    } else if (teacherId) {
      assignedIds = [teacherId];
    }

    if (assignedIds.length === 0) {
      assignedIds = [user.id];
    }

    // Validate that all assigned teacher IDs exist with role ADMIN or TEACHER
    const validTeachers = await db.user.findMany({
      where: {
        id: { in: assignedIds },
        role: { in: ['ADMIN', 'TEACHER'] },
      },
      select: { id: true, username: true, allowedGrades: true },
    });

    if (validTeachers.length === 0) {
      return NextResponse.json({ error: 'At least one valid teacher must be assigned.' }, { status: 400 });
    }

    // If grade is specified, verify at least one assigned teacher allows this grade
    if (grade) {
      const anyTeacherSupportsGrade = validTeachers.some(
        (t) => !t.allowedGrades || t.allowedGrades.length === 0 || t.allowedGrades.includes(grade as Grade)
      );
      if (!anyTeacherSupportsGrade) {
        return NextResponse.json(
          { error: 'Selected grade is not permitted for the assigned teacher(s).' },
          { status: 400 }
        );
      }
    }

    const primaryTeacherId = validTeachers[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = await db.$transaction(async (tx) => {
      const student = await tx.user.create({
        data: {
          username: trimmedUsername,
          hashedPassword,
          role: 'STUDENT',
          grade: grade ? (grade as Grade) : null,
          activeFrom: activeFrom ? new Date(activeFrom) : null,
          activeTo: activeTo ? new Date(activeTo) : null,
          accessMode: accessMode ? (accessMode as AccessMode) : 'GRADE',
        },
      });

      await tx.studentTeacher.createMany({
        data: validTeachers.map((t) => ({
          studentId: student.id,
          teacherId: t.id,
        })),
        skipDuplicates: true,
      });

      return student;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newStudent.id,
        username: newStudent.username,
        role: newStudent.role,
        grade: newStudent.grade,
        activeFrom: newStudent.activeFrom,
        activeTo: newStudent.activeTo,
        accessMode: newStudent.accessMode,
        teacherId: primaryTeacherId,
        teachers: validTeachers,
        createdAt: newStudent.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student account' }, { status: 500 });
  }
}
