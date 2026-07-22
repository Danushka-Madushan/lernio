import { NextResponse } from 'next/server';
import { db, Grade } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const meetings = await db.zoomLink.findMany({
      orderBy: { scheduledAt: 'desc' },
    });

    return NextResponse.json({ meetings });
  } catch (error: unknown) {
    console.error('List meetings error:', error);
    return NextResponse.json({ error: 'Failed to retrieve meetings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { title, scheduledAt, grade, link } = await request.json();

    if (!title || !scheduledAt || !link) {
      return NextResponse.json(
        { error: 'Title, scheduled date, and link are required.' },
        { status: 400 }
      );
    }

    // Validate grade if provided
    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    const newMeeting = await db.zoomLink.create({
      data: {
        title: title.trim(),
        scheduledAt: new Date(scheduledAt),
        grade: grade ? (grade as Grade) : null,
        link: link.trim(),
      },
    });

    return NextResponse.json({ success: true, meeting: newMeeting });
  } catch (error: unknown) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
