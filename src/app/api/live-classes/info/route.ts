import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const inputUrl = searchParams.get('url');

    if (!inputUrl) {
      return NextResponse.json({ error: 'URL or Video ID is required' }, { status: 400 });
    }

    const youtubeId = extractYouTubeId(inputUrl);
    if (!youtubeId) {
      return NextResponse.json({ error: 'Invalid YouTube URL or ID' }, { status: 400 });
    }

    const fallbackThumbnail = getYouTubeThumbnail(youtubeId);

    // Call YouTube official oEmbed endpoint
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return NextResponse.json({
          success: true,
          youtubeId,
          title: data.title || '',
          author: data.author_name || '',
          thumbnailUrl: data.thumbnail_url || fallbackThumbnail,
        });
      }
    } catch (fetchErr) {
      console.warn('oEmbed fetch error:', fetchErr);
    }

    // Graceful fallback if oEmbed was blocked or private
    return NextResponse.json({
      success: true,
      youtubeId,
      title: '',
      thumbnailUrl: fallbackThumbnail,
    });
  } catch (error) {
    console.error('Error in /api/live-classes/info:', error);
    return NextResponse.json({ error: 'Failed to fetch video info' }, { status: 500 });
  }
}
