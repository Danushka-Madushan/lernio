import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { getYouTubeThumbnail } from '@/lib/youtube';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
      select: {
        customThumbnailUrl: true,
        youtubeId: true,
      },
    });

    if (!liveClass) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const targetUrl = liveClass.customThumbnailUrl || getYouTubeThumbnail(liveClass.youtubeId);

    // Redirect client to target thumbnail
    return NextResponse.redirect(targetUrl, {
      status: 307,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving live class thumbnail:', error);
    return NextResponse.json({ error: 'Failed to retrieve thumbnail' }, { status: 500 });
  }
}
