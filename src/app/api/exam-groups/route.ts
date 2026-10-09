import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

// GET: List exam groups for staff
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const where: any = {};
    if (user.role === 'TEACHER') {
      where.teacherId = user.id;
    }

    const groups = await db.examGroup.findMany({
      where,
      include: {
        exams: {
          select: {
            id: true,
            title: true,
            grade: true,
            subject: true,
            thresholdMarks: true,
            maxMarks: true,
            examDate: true,
            _count: {
              select: { marks: true },
            },
          },
          orderBy: { examDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching exam groups:', error);
    return NextResponse.json({ error: 'Failed to fetch exam groups' }, { status: 500 });
  }
}

// POST: Create exam group
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const group = await db.examGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        teacherId: user.id,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error('Error creating exam group:', error);
    return NextResponse.json({ error: 'Failed to create exam group' }, { status: 500 });
  }
}
