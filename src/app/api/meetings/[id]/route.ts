import { NextResponse } from 'next/server';
import { db, Grade } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const { title, scheduledAt, grade, link } = await request.json();

    if (!title || !scheduledAt || !link) {
      return NextResponse.json(
        { error: 'Title, scheduled date, and link are required.' },
        { status: 400 }
      );
    }

    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    const updatedMeeting = await db.zoomLink.update({
      where: { id },
      data: {
        title: title.trim(),
        scheduledAt: new Date(scheduledAt),
        grade: grade ? (grade as Grade) : null,
        link: link.trim(),
      },
    });

    return NextResponse.json({ success: true, meeting: updatedMeeting });
  } catch (error: unknown) {
    console.error('Update meeting error:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    await db.zoomLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
