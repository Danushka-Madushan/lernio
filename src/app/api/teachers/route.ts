import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// GET: List all teachers (Admin only)
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search')?.trim().toLowerCase();

    const teachers = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'TEACHER'] },
        ...(searchQuery
          ? {
              username: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            students: true,
            videos: true,
            meetings: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // ADMIN first
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ teachers });
  } catch (error: unknown) {
    console.error('List teachers error:', error);
    return NextResponse.json({ error: 'Failed to retrieve teachers' }, { status: 500 });
  }
}

// POST: Create a new teacher account (Admin only)
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
    const newTeacher = await db.user.create({
      data: {
        username: trimmedUsername,
        hashedPassword,
        role: 'TEACHER',
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            students: true,
            videos: true,
            meetings: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, teacher: newTeacher });
  } catch (error: unknown) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Failed to create teacher account' }, { status: 500 });
  }
}
