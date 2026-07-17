import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Grade, AccessMode } from '@/generated/client/enums';

// PUT: Update student (password, grade, validity period, access mode)
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
    const { password, grade, activeFrom, activeTo, accessMode } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Student account deleted' });
  } catch (error: unknown) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student account' }, { status: 500 });
  }
}
