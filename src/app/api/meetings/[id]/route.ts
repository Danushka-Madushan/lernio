import { NextResponse } from 'next/server';
import { db, Grade } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { updateZoomMeeting, deleteZoomMeeting } from '@/lib/zoom';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
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
      link 
    } = await request.json();

    if (!title || !scheduledAt) {
      return NextResponse.json(
        { error: 'Title and scheduled date are required.' },
        { status: 400 }
      );
    }

    if (grade && !Object.values(Grade).includes(grade as Grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    const existingMeeting = await db.zoomLink.findUnique({ where: { id }, include: { zoomAccount: true } });
    if (!existingMeeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const dataToUpdate: any = {
        title: title.trim(),
        scheduledAt: new Date(scheduledAt),
        grade: grade ? (grade as Grade) : null,
        duration: durationMinutes || 60,
        isRecurring: isRecurring || false,
        hostVideo: hostVideo || false,
        participantVideo: participantVideo || false,
        waitingRoom: waitingRoom ?? true,
    };

    if (link) {
      dataToUpdate.link = link.trim();
    }

    // Update Zoom API if it's a zoom meeting
    if (existingMeeting.meetingId && existingMeeting.zoomAccount) {
      await updateZoomMeeting(
        existingMeeting.meetingId,
        existingMeeting.zoomAccount.accountId,
        existingMeeting.zoomAccount.clientId,
        existingMeeting.zoomAccount.clientSecret,
        {
          topic: title.trim(),
          startTime: new Date(scheduledAt).toISOString(),
          durationMinutes: durationMinutes || 60,
          isRecurring,
          hostVideo,
          participantVideo,
          waitingRoom,
        }
      );
    }

    const updatedMeeting = await db.zoomLink.update({
      where: { id },
      data: dataToUpdate,
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
    
    const existingMeeting = await db.zoomLink.findUnique({ where: { id }, include: { zoomAccount: true } });
    if (!existingMeeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Delete from Zoom API if applicable
    if (existingMeeting.meetingId && existingMeeting.zoomAccount) {
      try {
        await deleteZoomMeeting(
          existingMeeting.meetingId,
          existingMeeting.zoomAccount.accountId,
          existingMeeting.zoomAccount.clientId,
          existingMeeting.zoomAccount.clientSecret
        );
      } catch (zoomErr) {
        console.error('Failed to delete on Zoom, proceeding to delete locally:', zoomErr);
      }
    }

    await db.zoomLink.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
