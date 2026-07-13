import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// GET: List all students
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const students = await db.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ students });
  } catch (error: any) {
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
    const { username, password } = await request.json();

    if (!username || !password || username.trim().length < 3 || password.length < 4) {
      return NextResponse.json(
        { error: 'Username must be at least 3 chars; password must be at least 4 chars.' },
        { status: 400 }
      );
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
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newStudent });
  } catch (error: any) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student account' }, { status: 500 });
  }
}
