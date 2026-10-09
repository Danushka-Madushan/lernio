import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { calculateExamStats, calculateStudentRank } from '@/lib/exams';

interface Params {
  params: Promise<{ id: string }>;
}

// GET: Student view of single exam with Result Diagram marks data
export async function GET(request: Request, { params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized: Student access required' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            gradeAliases: true,
          },
        },
        examGroup: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        marks: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: [
            { isAbsent: 'asc' },
            { marks: 'asc' }, // sorted low to high for chart line
          ],
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Check student is in this exam roster
    const myMarkRecord = exam.marks.find((m) => m.studentId === user.id);
    if (!myMarkRecord) {
      return NextResponse.json({ error: 'You are not enrolled in this exam' }, { status: 403 });
    }

    const stats = calculateExamStats(exam.marks, exam.thresholdMarks, exam.maxMarks);
    const rankInfo = calculateStudentRank(exam.marks, user.id);

    const isGraded = !myMarkRecord.isAbsent && myMarkRecord.marks !== null;
    const isAboveThreshold = isGraded ? (myMarkRecord.marks as number) >= exam.thresholdMarks : false;

    const mySummary = {
      marks: myMarkRecord.marks,
      isAbsent: myMarkRecord.isAbsent,
      remarks: myMarkRecord.remarks,
      isGraded,
      isAboveThreshold,
      diffFromThreshold: isGraded
        ? Math.round(((myMarkRecord.marks as number) - exam.thresholdMarks) * 10) / 10
        : null,
      diffFromAverage: isGraded
        ? Math.round(((myMarkRecord.marks as number) - stats.averageMark) * 10) / 10
        : null,
      rank: rankInfo.rank,
      totalGraded: rankInfo.totalGraded,
    };

    // Prepare marks array for chart
    const marksData = exam.marks.map((m) => ({
      id: m.id,
      studentId: m.studentId,
      username: m.student.username,
      marks: m.marks,
      isAbsent: m.isAbsent,
      isCurrentUser: m.studentId === user.id,
    }));

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        subject: exam.subject,
        grade: exam.grade,
        examGroupId: exam.examGroupId,
        examGroup: exam.examGroup,
        teacher: exam.teacher,
        thresholdMarks: exam.thresholdMarks,
        maxMarks: exam.maxMarks,
        examDate: exam.examDate,
      },
      stats,
      mySummary,
      marks: marksData,
    });
  } catch (error) {
    console.error('Error fetching student exam details:', error);
    return NextResponse.json({ error: 'Failed to fetch exam details' }, { status: 500 });
  }
}
