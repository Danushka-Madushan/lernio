import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { calculateExamStats } from '@/lib/exams';

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Exam group with child exams and combined analytics
export async function GET(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const group = await db.examGroup.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, username: true },
        },
        exams: {
          include: {
            marks: {
              include: {
                student: {
                  select: { id: true, username: true },
                },
              },
            },
          },
          orderBy: { examDate: 'asc' },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Exam group not found' }, { status: 404 });
    }

    if (user.role === 'TEACHER' && group.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate per-exam stats
    const enrichedExams = group.exams.map((exam) => {
      const stats = calculateExamStats(exam.marks, exam.thresholdMarks, exam.maxMarks);
      return {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        grade: exam.grade,
        thresholdMarks: exam.thresholdMarks,
        maxMarks: exam.maxMarks,
        examDate: exam.examDate,
        stats,
      };
    });

    // Calculate combined student performances across group
    const studentPerformanceMap = new Map<
      string,
      {
        studentId: string;
        username: string;
        scores: { examId: string; examTitle: string; marks: number | null; isAbsent: boolean }[];
        totalMarks: number;
        maxPossible: number;
        percentage: number;
      }
    >();

    for (const exam of group.exams) {
      for (const m of exam.marks) {
        if (!studentPerformanceMap.has(m.studentId)) {
          studentPerformanceMap.set(m.studentId, {
            studentId: m.studentId,
            username: m.student.username,
            scores: [],
            totalMarks: 0,
            maxPossible: 0,
            percentage: 0,
          });
        }
        const record = studentPerformanceMap.get(m.studentId)!;
        record.scores.push({
          examId: exam.id,
          examTitle: exam.title,
          marks: m.marks,
          isAbsent: m.isAbsent,
        });
        if (!m.isAbsent && m.marks !== null) {
          record.totalMarks += m.marks;
          record.maxPossible += exam.maxMarks;
        }
      }
    }

    const combinedRoster = Array.from(studentPerformanceMap.values()).map((item) => {
      const pct = item.maxPossible > 0 ? Math.round((item.totalMarks / item.maxPossible) * 1000) / 10 : 0;
      return {
        ...item,
        percentage: pct,
        isCurrentUser: user.role === 'STUDENT' && item.studentId === user.id,
      };
    });

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        teacherId: group.teacherId,
        teacher: group.teacher,
        exams: enrichedExams,
        combinedRoster,
      },
    });
  } catch (error) {
    console.error('Error fetching exam group:', error);
    return NextResponse.json({ error: 'Failed to fetch exam group' }, { status: 500 });
  }
}

// PUT: Update exam group
export async function PUT(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.examGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (user.role === 'TEACHER' && existing.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    const updated = await db.examGroup.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        description: description !== undefined ? (description?.trim() || null) : undefined,
      },
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error('Error updating exam group:', error);
    return NextResponse.json({ error: 'Failed to update exam group' }, { status: 500 });
  }
}

// DELETE: Delete group (disconnects child exams)
export async function DELETE(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.examGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (user.role === 'TEACHER' && existing.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      // Safely disconnect member exams so they remain as standalone exams with marks intact
      await tx.exam.updateMany({
        where: { examGroupId: id },
        data: { examGroupId: null },
      });
      // Wipe out the exam group
      await tx.examGroup.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Exam group deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam group:', error);
    return NextResponse.json({ error: 'Failed to delete exam group' }, { status: 500 });
  }
}
