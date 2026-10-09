import { NextResponse } from 'next/server';
import { db, Grade } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { calculateExamStats } from '@/lib/exams';

// GET: List exams (Staff: TEACHER or ADMIN)
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
    const groupId = searchParams.get('examGroupId');
    const searchQuery = searchParams.get('search')?.trim().toLowerCase();
    const teacherParam = searchParams.get('teacherId');

    const where: any = {};

    // Teacher scoping
    if (user.role === 'TEACHER') {
      where.teacherId = user.id;
    } else if (teacherParam) {
      where.teacherId = teacherParam;
    }

    if (gradeParam && Object.values(Grade).includes(gradeParam as Grade)) {
      where.grade = gradeParam as Grade;
    }

    if (groupId) {
      where.examGroupId = groupId;
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { subject: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const exams = await db.exam.findMany({
      where,
      include: {
        examGroup: {
          select: {
            id: true,
            name: true,
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
          select: {
            id: true,
            marks: true,
            isAbsent: true,
          },
        },
      },
      orderBy: {
        examDate: 'desc',
      },
    });

    const enrichedExams = exams.map((exam) => {
      const stats = calculateExamStats(exam.marks, exam.thresholdMarks, exam.maxMarks);
      return {
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
        stats,
      };
    });

    return NextResponse.json({ exams: enrichedExams });
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

// POST: Create a new exam
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      subject,
      grade,
      examGroupId,
      thresholdMarks = 50,
      maxMarks = 100,
      examDate,
      studentIds, // optional explicit student IDs
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    if (!grade || !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Valid grade is required' }, { status: 400 });
    }

    if (!examDate) {
      return NextResponse.json({ error: 'Exam date is required' }, { status: 400 });
    }

    // Verify teacher allowedGrades
    if (user.role === 'TEACHER') {
      const teacherProfile = await db.user.findUnique({
        where: { id: user.id },
        select: { allowedGrades: true },
      });
      if (
        teacherProfile?.allowedGrades &&
        teacherProfile.allowedGrades.length > 0 &&
        !teacherProfile.allowedGrades.includes(grade as Grade)
      ) {
        return NextResponse.json(
          { error: 'You are not assigned to conduct exams for this grade' },
          { status: 403 }
        );
      }
    }

    // Validate examGroupId if supplied
    if (examGroupId) {
      const group = await db.examGroup.findUnique({
        where: { id: examGroupId },
      });
      if (!group) {
        return NextResponse.json({ error: 'Exam group not found' }, { status: 400 });
      }
      if (user.role === 'TEACHER' && group.teacherId !== user.id) {
        return NextResponse.json({ error: 'Cannot attach to group belonging to another teacher' }, { status: 403 });
      }
    }

    const teacherId = user.id;

    // Determine students to populate
    let targetStudents: { id: string }[] = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      // Validate students belong to this grade (and teacher if teacher)
      targetStudents = await db.user.findMany({
        where: {
          id: { in: studentIds },
          role: 'STUDENT',
          grade: grade as Grade,
          ...(user.role === 'TEACHER' ? { teacherId: user.id } : {}),
        },
        select: { id: true },
      });
    } else {
      // Default: auto-enroll all students of this grade assigned to this teacher (or system-wide if admin)
      targetStudents = await db.user.findMany({
        where: {
          role: 'STUDENT',
          grade: grade as Grade,
          ...(user.role === 'TEACHER' ? { teacherId: user.id } : {}),
        },
        select: { id: true },
      });
    }

    // Create exam and initialize marks in a transaction
    const newExam = await db.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          subject: subject.trim(),
          grade: grade as Grade,
          examGroupId: examGroupId || null,
          teacherId,
          thresholdMarks: Number(thresholdMarks) || 50,
          maxMarks: Number(maxMarks) || 100,
          examDate: new Date(examDate),
        },
      });

      if (targetStudents.length > 0) {
        await tx.examMark.createMany({
          data: targetStudents.map((s) => ({
            examId: created.id,
            studentId: s.id,
            marks: null,
            isAbsent: false,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ exam: newExam, assignedCount: targetStudents.length }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}
