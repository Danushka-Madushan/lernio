import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { calculateStudentRank } from '@/lib/exams';

// GET: Student's assigned exams with individual scores
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized: Student access required' }, { status: 403 });
  }

  try {
    const studentMarks = await db.examMark.findMany({
      where: {
        studentId: user.id,
      },
      include: {
        exam: {
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
              },
            },
            marks: {
              select: {
                studentId: true,
                marks: true,
                isAbsent: true,
              },
            },
          },
        },
      },
      orderBy: {
        exam: {
          examDate: 'desc',
        },
      },
    });

    const exams = studentMarks.map((entry) => {
      const exam = entry.exam;
      const isGraded = !entry.isAbsent && entry.marks !== null;
      const isAboveThreshold = isGraded ? (entry.marks as number) >= exam.thresholdMarks : false;
      const diffFromThreshold = isGraded
        ? Math.round(((entry.marks as number) - exam.thresholdMarks) * 10) / 10
        : null;

      const rankInfo = calculateStudentRank(exam.marks, user.id);

      return {
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
        myResult: {
          marks: entry.marks,
          isAbsent: entry.isAbsent,
          remarks: entry.remarks,
          isGraded,
          isAboveThreshold,
          diffFromThreshold,
          rank: rankInfo.rank,
          totalGraded: rankInfo.totalGraded,
        },
      };
    });

    return NextResponse.json({ exams });
  } catch (error) {
    console.error('Error fetching student exams:', error);
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}
