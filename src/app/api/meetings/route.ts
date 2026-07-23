import { NextResponse } from 'next/server';
import { db, Grade } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { createZoomMeeting } from '@/lib/zoom';

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
      include: { zoomAccount: { select: { name: true, email: true } } }
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
    const { 
      title, 
      scheduledAt, 
      grade, 
      zoomAccountId, 
      durationMinutes, 
      isRecurring, 
      hostVideo, 
      participantVideo, 
      waitingRoom,
      link // Keep fallback link if no zoomAccountId is provided (for backward compatibility if needed)
    } = await request.json();

    if (!title || !scheduledAt) {
      return NextResponse.json(
        { error: 'Title and scheduled date are required.' },
        { status: 400 }
      );
    }

    if (!zoomAccountId && !link) {
      return NextResponse.json(
        { error: 'Either Zoom Account ID or manual link must be provided.' },
        { status: 400 }
      );
    }

    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    let meetingLink = link?.trim();
    let meetingId = null;
    let startUrl = null;

    if (zoomAccountId) {
      const zoomAccount = await db.zoomAccount.findUnique({ where: { id: zoomAccountId } });
      if (!zoomAccount) {
        return NextResponse.json({ error: 'Zoom account not found' }, { status: 404 });
      }

      const zoomRes = await createZoomMeeting(
        zoomAccount.email,
        zoomAccount.accountId,
        zoomAccount.clientId,
        zoomAccount.clientSecret,
        {
          topic: title.trim(),
          startTime: new Date(scheduledAt).toISOString(),
          durationMinutes: durationMinutes || 60,
          timezone: 'Asia/Colombo', // default timezone or could be passed from client
          isRecurring,
          hostVideo,
          participantVideo,
          waitingRoom
        }
      );

      meetingLink = zoomRes.joinUrl;
      meetingId = zoomRes.meetingId;
      startUrl = zoomRes.startUrl;
    }

    const newMeeting = await db.zoomLink.create({
      data: {
        title: title.trim(),
        scheduledAt: new Date(scheduledAt),
        grade: grade ? (grade as Grade) : null,
        link: meetingLink,
        zoomAccountId: zoomAccountId || null,
        meetingId,
        startUrl,
        duration: durationMinutes || 60,
        isRecurring: isRecurring || false,
        hostVideo: hostVideo || false,
        participantVideo: participantVideo || false,
        waitingRoom: waitingRoom ?? true,
      },
    });

    return NextResponse.json({ success: true, meeting: newMeeting });
  } catch (error: unknown) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
