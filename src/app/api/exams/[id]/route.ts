import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { calculateExamStats, calculateStudentRank } from '@/lib/exams';

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Exam details, full marks roster, and statistics
export async function GET(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        examGroup: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        teacher: {
          select: {
            id: true,
            username: true,
            gradeAliases: true,
          },
        },
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
          orderBy: [
            { isAbsent: 'asc' },
            { marks: 'asc' }, // low to high for chart line
          ],
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Role access control
    if (user.role === 'TEACHER' && exam.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role === 'STUDENT') {
      const isAssigned = exam.marks.some((m) => m.studentId === user.id);
      if (!isAssigned) {
        return NextResponse.json({ error: 'Access denied to this exam' }, { status: 403 });
      }
    }

    const stats = calculateExamStats(exam.marks, exam.thresholdMarks, exam.maxMarks);

    // Map marks data for client
    const mappedMarks = exam.marks.map((m) => {
      const isCurrent = user.role === 'STUDENT' && m.studentId === user.id;
      return {
        id: m.id,
        studentId: m.studentId,
        username: m.student.username,
        marks: m.marks,
        isAbsent: m.isAbsent,
        remarks: m.remarks,
        isCurrentUser: isCurrent,
      };
    });

    // Student specific stats if requested by student
    let studentSummary = null;
    if (user.role === 'STUDENT') {
      const myRecord = mappedMarks.find((m) => m.studentId === user.id);
      if (myRecord) {
        const rankInfo = calculateStudentRank(exam.marks, user.id);
        studentSummary = {
          marks: myRecord.marks,
          isAbsent: myRecord.isAbsent,
          remarks: myRecord.remarks,
          isAboveThreshold:
            myRecord.marks !== null ? myRecord.marks >= exam.thresholdMarks : false,
          diffFromThreshold:
            myRecord.marks !== null ? Math.round((myRecord.marks - exam.thresholdMarks) * 10) / 10 : null,
          diffFromAverage:
            myRecord.marks !== null ? Math.round((myRecord.marks - stats.averageMark) * 10) / 10 : null,
          rank: rankInfo.rank,
          totalGraded: rankInfo.totalGraded,
        };
      }
    }

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        subject: exam.subject,
        grade: exam.grade,
        examGroupId: exam.examGroupId,
        examGroup: exam.examGroup,
        teacherId: exam.teacherId,
        teacher: exam.teacher,
        thresholdMarks: exam.thresholdMarks,
        maxMarks: exam.maxMarks,
        examDate: exam.examDate,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      },
      marks: mappedMarks,
      stats,
      studentSummary,
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({ error: 'Failed to fetch exam' }, { status: 500 });
  }
}

// PUT: Update exam metadata
export async function PUT(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && existing.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, subject, thresholdMarks, maxMarks, examDate, examGroupId } = body;

    const updated = await db.exam.update({
      where: { id },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        description: description !== undefined ? (description?.trim() || null) : undefined,
        ...(subject?.trim() ? { subject: subject.trim() } : {}),
        ...(thresholdMarks !== undefined ? { thresholdMarks: Number(thresholdMarks) } : {}),
        ...(maxMarks !== undefined ? { maxMarks: Number(maxMarks) } : {}),
        ...(examDate ? { examDate: new Date(examDate) } : {}),
        examGroupId: examGroupId !== undefined ? (examGroupId || null) : undefined,
      },
    });

    return NextResponse.json({ exam: updated });
  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json({ error: 'Failed to update exam' }, { status: 500 });
  }
}

// DELETE: Remove exam (cascades marks)
export async function DELETE(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.exam.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && existing.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.exam.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 });
  }
}
