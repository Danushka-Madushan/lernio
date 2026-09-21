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

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, teacherId: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Teacher can only update their own students
    if (user.role === 'TEACHER' && student.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own students.' }, { status: 403 });
    }

    const body = await request.json();
    const { password, grade, activeFrom, activeTo, accessMode, teacherId } = body;

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

    // Teacher reassignment (ADMIN only)
    if (teacherId !== undefined && user.role === 'ADMIN') {
      const targetTeacher = await db.user.findUnique({
        where: { id: teacherId },
        select: { id: true, role: true },
      });
      if (targetTeacher && (targetTeacher.role === 'ADMIN' || targetTeacher.role === 'TEACHER')) {
        updateData.teacherId = teacherId;
        // If teacher is being changed, clear custom video access to prevent stale cross-tenant access
        if (student.teacherId !== teacherId) {
          await db.customVideoAccess.deleteMany({ where: { userId: id } });
        }
      } else {
        return NextResponse.json({ error: 'Invalid teacher specified' }, { status: 400 });
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
        teacherId: true,
        teacher: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, user: updated });
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

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, teacherId: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Teacher can only delete their own students
    if (user.role === 'TEACHER' && student.teacherId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own students.' }, { status: 403 });
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Student account deleted' });
  } catch (error: unknown) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student account' }, { status: 500 });
  }
}
