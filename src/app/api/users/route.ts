import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Grade, AccessMode } from '@/generated/client/enums';

// GET: List all students (with optional grade and status filters)
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const gradeParam = searchParams.get('grade');
    const statusParam = searchParams.get('status'); // 'active' | 'expired'

    const now = new Date();

    // Build where clause
    const where: any = { role: 'STUDENT' };

    if (gradeParam && Object.values(Grade).includes(gradeParam as Grade)) {
      where.grade = gradeParam as Grade;
    }

    if (statusParam === 'expired') {
      where.OR = [
        { activeTo: { lt: now } },
        { AND: [{ activeFrom: { gt: now } }, { activeTo: { not: null } }] },
      ];
    } else if (statusParam === 'active') {
      where.AND = [
        { OR: [{ activeFrom: null }, { activeFrom: { lte: now } }] },
        { OR: [{ activeTo: null }, { activeTo: { gte: now } }] },
      ];
    }

    const students = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        grade: true,
        activeFrom: true,
        activeTo: true,
        accessMode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ students });
  } catch (error: unknown) {
    console.error('List students error:', error);
    return NextResponse.json({ error: 'Failed to retrieve students' }, { status: 500 });
  }
}

// POST: Create a new student account
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { username, password, grade, activeFrom, activeTo, accessMode } = await request.json();

    if (!username || !password || username.trim().length < 3 || password.length < 4) {
      return NextResponse.json(
        { error: 'Username must be at least 3 chars; password must be at least 4 chars.' },
        { status: 400 }
      );
    }

    // Validate grade if provided
    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    // Validate accessMode if provided
    if (accessMode && !Object.values(AccessMode).includes(accessMode as AccessMode)) {
      return NextResponse.json({ error: 'Invalid access mode' }, { status: 400 });
    }

    const trimmedUsername = username.trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = await db.user.create({
      data: {
        username: trimmedUsername,
        hashedPassword,
        role: 'STUDENT',
        grade: grade ? (grade as Grade) : null,
        activeFrom: activeFrom ? new Date(activeFrom) : null,
        activeTo: activeTo ? new Date(activeTo) : null,
        accessMode: accessMode ? (accessMode as AccessMode) : 'GRADE',
      },
      select: {
        id: true,
        username: true,
        role: true,
        grade: true,
        activeFrom: true,
        activeTo: true,
        accessMode: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newStudent });
  } catch (error: unknown) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student account' }, { status: 500 });
  }
}
