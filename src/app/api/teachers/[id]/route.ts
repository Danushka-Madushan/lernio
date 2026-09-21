import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// PUT: Update teacher (reset password)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    const updateData: any = {};

    if (password !== undefined) {
      if (password.length < 4) {
        return NextResponse.json(
          { error: 'Password must be at least 4 characters.' },
          { status: 400 }
        );
      }
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: unknown) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

// DELETE: Delete teacher account (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent admin from deleting themselves
  if (user.id === id) {
    return NextResponse.json(
      { error: 'Cannot delete your own admin account.' },
      { status: 400 }
    );
  }

  try {
    const targetTeacher = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, username: true },
    });

    if (!targetTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (targetTeacher.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete an Admin account from teacher management.' },
        { status: 400 }
      );
    }

    // Safely reassign students, videos, and meetings to the current admin
    await db.$transaction([
      db.user.updateMany({
        where: { teacherId: id },
        data: { teacherId: user.id },
      }),
      db.video.updateMany({
        where: { teacherId: id },
        data: { teacherId: user.id },
      }),
      db.zoomLink.updateMany({
        where: { teacherId: id },
        data: { teacherId: user.id },
      }),
      db.user.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Teacher '${targetTeacher.username}' deleted, associated students and materials reassigned to Admin.`,
    });
  } catch (error: unknown) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Failed to delete teacher account' }, { status: 500 });
  }
}
