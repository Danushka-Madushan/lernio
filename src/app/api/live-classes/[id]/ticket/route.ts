import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { signPlaybackTicket, verifyPlaybackTicket } from '@/lib/youtube';
import { VideoVisibility } from '@/generated/client/enums';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/live-classes/[id]/ticket - Issues an ephemeral playback ticket
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liveClass = await db.youTubeClass.findUnique({
      where: { id },
    });

    if (!liveClass) {
      return NextResponse.json({ error: 'Live class not found' }, { status: 404 });
    }

    if (user.role === 'STUDENT') {
      const studentRecord = await db.user.findUnique({
        where: { id: user.id },
        select: {
          grade: true,
          activeFrom: true,
          activeTo: true,
          teacherId: true,
        },
      });

      if (!studentRecord) {
        return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
      }

      const now = new Date();
      if (
        (studentRecord.activeFrom && now < studentRecord.activeFrom) ||
        (studentRecord.activeTo && now > studentRecord.activeTo)
      ) {
        return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
      }

      if (liveClass.teacherId !== studentRecord.teacherId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      if (
        liveClass.visibility === VideoVisibility.GRADE &&
        liveClass.grade !== studentRecord.grade
      ) {
        return NextResponse.json({ error: 'Access denied for this grade' }, { status: 403 });
      }
    } else if (user.role === 'TEACHER' && liveClass.teacherId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Increment view count best-effort
    try {
      await db.youTubeClass.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      });
    } catch (_) {}

    // Sign an ephemeral ticket valid for 15 minutes
    const ticket = await signPlaybackTicket({
      classId: liveClass.id,
      userId: user.id,
      youtubeId: liveClass.youtubeId,
      role: user.role,
    });

    return NextResponse.json({
      ticket,
      title: liveClass.title,
    });
  } catch (error) {
    console.error('Failed to issue playback ticket:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/live-classes/[id]/ticket - Resolves an ephemeral ticket into an isolated mount token
export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const user = sessionToken ? await verifyToken(sessionToken) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticket } = body;

    if (!ticket || typeof ticket !== 'string') {
      return NextResponse.json({ error: 'Ticket is required' }, { status: 400 });
    }

    const payload = await verifyPlaybackTicket(ticket);
    if (!payload || payload.classId !== id || payload.userId !== user.id) {
      return NextResponse.json({ error: 'Invalid or expired playback ticket' }, { status: 403 });
    }

    return NextResponse.json({
      mountId: payload.youtubeId,
    });
  } catch (error) {
    console.error('Failed to resolve playback ticket:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
