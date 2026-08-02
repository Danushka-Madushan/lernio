import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, bucketName } from '@/lib/r2';

/**
 * GET /api/videos/[id]/thumbnail
 *
 * Auth guard → generates a short-lived presigned R2 URL → 302 redirect.
 * Image bytes travel directly from R2 to the browser; zero bytes pass
 * through the server, eliminating fast-origin-transfer for thumbnails.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const video = await db.video.findUnique({
      where: { id },
      select: { cloudflareR2ThumbnailKey: true },
    });

    if (!video || !video.cloudflareR2ThumbnailKey) {
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    // If the key is already an absolute URL (legacy data), redirect directly.
    if (
      video.cloudflareR2ThumbnailKey.startsWith('http://') ||
      video.cloudflareR2ThumbnailKey.startsWith('https://')
    ) {
      return NextResponse.redirect(video.cloudflareR2ThumbnailKey);
    }

    // Generate a 1-hour presigned URL and redirect the browser to it.
    // The browser caches the image via the R2 response headers; subsequent
    // renders of the same thumbnail hit the browser cache with zero server cost.
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: video.cloudflareR2ThumbnailKey,
    });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Cache-Control on the *redirect* response lets the browser remember
    // the presigned URL itself for a short window (1 min) to avoid hitting
    // this route for every re-render in the same session.
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('Thumbnail presign error:', error);
    return new NextResponse('Failed to load thumbnail', { status: 502 });
  }
}

