import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Student marks roster for grading interface
export async function GET(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        marks: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                grade: true,
              },
            },
          },
          orderBy: {
            student: {
              username: 'asc',
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && exam.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Also fetch all students in this grade for this teacher who might not have an ExamMark yet
    const gradeStudents = await db.user.findMany({
      where: {
        role: 'STUDENT',
        grade: exam.grade,
        ...(user.role === 'TEACHER' ? { teacherId: user.id } : {}),
      },
      select: {
        id: true,
        username: true,
        grade: true,
      },
      orderBy: {
        username: 'asc',
      },
    });

    // Merge marks with any missing students
    const existingMarkMap = new Map(exam.marks.map((m) => [m.studentId, m]));

    const roster = gradeStudents.map((student) => {
      const existing = existingMarkMap.get(student.id);
      return {
        studentId: student.id,
        username: student.username,
        grade: student.grade,
        marks: existing ? existing.marks : null,
        isAbsent: existing ? existing.isAbsent : false,
        remarks: existing ? existing.remarks : '',
        markId: existing ? existing.id : null,
      };
    });

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        grade: exam.grade,
        thresholdMarks: exam.thresholdMarks,
        maxMarks: exam.maxMarks,
      },
      roster,
    });
  } catch (error) {
    console.error('Error fetching marks roster:', error);
    return NextResponse.json({ error: 'Failed to fetch marks roster' }, { status: 500 });
  }
}

// PUT: Bulk update/save marks
export async function PUT(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const exam = await db.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && exam.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { marks } = body;

    if (!Array.isArray(marks)) {
      return NextResponse.json({ error: 'Marks array is required' }, { status: 400 });
    }

    // Execute bulk upsert in transaction
    await db.$transaction(
      marks.map((entry) => {
        const studentId = entry.studentId;
        const isAbsent = Boolean(entry.isAbsent);
        const score = isAbsent ? null : entry.marks !== null && entry.marks !== undefined && entry.marks !== ''
          ? Number(entry.marks)
          : null;
        const remarks = entry.remarks ? String(entry.remarks).trim() : null;

        return db.examMark.upsert({
          where: {
            examId_studentId: {
              examId: id,
              studentId,
            },
          },
          update: {
            marks: score,
            isAbsent,
            remarks,
          },
          create: {
            examId: id,
            studentId,
            marks: score,
            isAbsent,
            remarks,
          },
        });
      })
    );

    return NextResponse.json({ message: 'Marks updated successfully', count: marks.length });
  } catch (error) {
    console.error('Error saving marks:', error);
    return NextResponse.json({ error: 'Failed to save marks' }, { status: 500 });
  }
}
