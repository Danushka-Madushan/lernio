import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Grade, AccessMode } from '@/generated/client/enums';

// PUT: Update student (password, grade, validity period, access mode, teacher reassignment)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can modify student accounts.' },
      { status: 403 }
    );
  }

  try {
    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, grade: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const { password, grade, activeFrom, activeTo, accessMode, teacherId, teacherIds } = body;

    const updateData: any = {};

    // Password reset
    if (password !== undefined) {
      if (password.length < 4) {
        return NextResponse.json({ error: 'Password must be at least 4 characters.' }, { status: 400 });
      }
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }

    // Grade
    if (grade !== undefined) {
      if (grade !== null && !Object.values(Grade).includes(grade as Grade)) {
        return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
      }
      updateData.grade = grade ? (grade as Grade) : null;
    }

    // Validity period
    if (activeFrom !== undefined) {
      updateData.activeFrom = activeFrom ? new Date(activeFrom) : null;
    }
    if (activeTo !== undefined) {
      updateData.activeTo = activeTo ? new Date(activeTo) : null;
    }

    // Access mode
    if (accessMode !== undefined) {
      if (!Object.values(AccessMode).includes(accessMode as AccessMode)) {
        return NextResponse.json({ error: 'Invalid access mode' }, { status: 400 });
      }
      updateData.accessMode = accessMode as AccessMode;
    }

    // Teacher assignments update (ADMIN only)
    let assignedTeacherIds: string[] | null = null;
    if (Array.isArray(teacherIds)) {
      assignedTeacherIds = Array.from(
        new Set(teacherIds.filter((t: unknown) => typeof t === 'string' && (t as string).trim().length > 0))
      );
      if (assignedTeacherIds.length === 0) {
        return NextResponse.json({ error: 'At least one teacher must be assigned.' }, { status: 400 });
      }
    } else if (teacherId !== undefined) {
      assignedTeacherIds = [teacherId];
    }

    if (assignedTeacherIds && user.role === 'ADMIN') {
      const targetTeachers = await db.user.findMany({
        where: {
          id: { in: assignedTeacherIds },
          role: { in: ['ADMIN', 'TEACHER'] },
        },
        select: { id: true, username: true, allowedGrades: true },
      });

      if (targetTeachers.length !== assignedTeacherIds.length) {
        return NextResponse.json({ error: 'One or more invalid teachers specified' }, { status: 400 });
      }

      // Sync StudentTeacher records
      await db.studentTeacher.deleteMany({
        where: {
          studentId: id,
          teacherId: { notIn: assignedTeacherIds },
        },
      });

      await db.studentTeacher.createMany({
        data: assignedTeacherIds.map((tid) => ({
          studentId: id,
          teacherId: tid,
        })),
        skipDuplicates: true,
      });

      // Clear custom video access for removed teachers to prevent stale access
      await db.customVideoAccess.deleteMany({
        where: {
          userId: id,
          video: {
            teacherId: { notIn: assignedTeacherIds },
          },
        },
      });
    }

    // Validate that student's final grade is within the assigned teachers' allowedGrades
    const resolvedGrade = updateData.grade !== undefined ? updateData.grade : student.grade;
    if (resolvedGrade && assignedTeacherIds) {
      const teachers = await db.user.findMany({
        where: { id: { in: assignedTeacherIds } },
        select: { allowedGrades: true },
      });
      const anyAllows = teachers.some(
        (t) => !t.allowedGrades || t.allowedGrades.length === 0 || t.allowedGrades.includes(resolvedGrade)
      );
      if (!anyAllows) {
        return NextResponse.json(
          { error: 'Selected grade is not permitted for the assigned teacher(s).' },
          { status: 400 }
        );
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
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
      },
    });

    const enrolledTeachers = updated.teacherEnrollments.map((e) => e.teacher).filter(Boolean);

    return NextResponse.json({
      success: true,
      user: {
        ...updated,
        teachers: enrolledTeachers,
      },
    });
  } catch (error: unknown) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

// DELETE: Delete student account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden: Only administrators can delete student accounts.' },
      { status: 403 }
    );
  }

  try {
    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      // Purge student's teacher assignments
      await tx.studentTeacher.deleteMany({ where: { studentId: id } });
      // Purge student's marks from all exams
      await tx.examMark.deleteMany({ where: { studentId: id } });
      // Purge student's custom video access permissions
      await tx.customVideoAccess.deleteMany({ where: { userId: id } });
      // Purge student's comments, likes, and views
      await tx.comment.deleteMany({ where: { userId: id } });
      await tx.like.deleteMany({ where: { userId: id } });
      await tx.view.deleteMany({ where: { userId: id } });
      // Finally, delete the student account
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Student account deleted' });
  } catch (error: unknown) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student account' }, { status: 500 });
  }
}
