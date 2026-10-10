import { NextResponse } from 'next/server';
import { db, Prisma } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import crypto from 'crypto';

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

    // Deduplicate marks by studentId to prevent PostgreSQL ON CONFLICT row collisions
    const studentMarkMap = new Map<string, any>();
    for (const entry of marks) {
      if (entry && typeof entry.studentId === 'string') {
        studentMarkMap.set(entry.studentId, entry);
      }
    }
    const uniqueMarks = Array.from(studentMarkMap.values());

    if (uniqueMarks.length === 0) {
      return NextResponse.json({ message: 'No marks to update', count: 0 });
    }

    try {
      // High-performance single-statement PostgreSQL bulk upsert (1 round trip, ~20ms)
      const values = uniqueMarks.map((entry) => {
        const isAbsent = Boolean(entry.isAbsent);
        const score = isAbsent
          ? null
          : entry.marks !== null && entry.marks !== undefined && entry.marks !== ''
          ? Number(entry.marks)
          : null;
        const remarks = entry.remarks ? String(entry.remarks).trim() : null;
        const newId = crypto.randomUUID();

        return Prisma.sql`(${newId}, ${id}, ${entry.studentId}, ${score}, ${isAbsent}, ${remarks}, NOW(), NOW())`;
      });

      await db.$executeRaw`
        INSERT INTO "ExamMark" ("id", "examId", "studentId", "marks", "isAbsent", "remarks", "createdAt", "updatedAt")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("examId", "studentId") DO UPDATE SET
          "marks" = EXCLUDED."marks",
          "isAbsent" = EXCLUDED."isAbsent",
          "remarks" = EXCLUDED."remarks",
          "updatedAt" = NOW()
      `;
    } catch (rawError) {
      console.warn('Raw bulk upsert failed, executing batched fallback:', rawError);
      // Fallback: Batched chunks of 10 with extended 15s timeout
      const batchSize = 10;
      for (let i = 0; i < uniqueMarks.length; i += batchSize) {
        const chunk = uniqueMarks.slice(i, i + batchSize);
        await db.$transaction(
          chunk.map((entry) => {
            const isAbsent = Boolean(entry.isAbsent);
            const score = isAbsent
              ? null
              : entry.marks !== null && entry.marks !== undefined && entry.marks !== ''
              ? Number(entry.marks)
              : null;
            const remarks = entry.remarks ? String(entry.remarks).trim() : null;

            return db.examMark.upsert({
              where: {
                examId_studentId: {
                  examId: id,
                  studentId: entry.studentId,
                },
              },
              update: {
                marks: score,
                isAbsent,
                remarks,
              },
              create: {
                examId: id,
                studentId: entry.studentId,
                marks: score,
                isAbsent,
                remarks,
              },
            });
          }),
          { timeout: 15000, maxWait: 5000 }
        );
      }
    }

    return NextResponse.json({ message: 'Marks updated successfully', count: uniqueMarks.length });
  } catch (error) {
    console.error('Error saving marks:', error);
    return NextResponse.json({ error: 'Failed to save marks' }, { status: 500 });
  }
}
