import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, bucketName } from '@/lib/r2';

/**
 * GET /api/videos/[id]/stream
 *
 * Secure streaming proxy — the browser's <video> src points here.
 * - Validates session cookie (auth guard)
 * - Forwards the Range header to Cloudflare R2 (enables seek & progressive play)
 * - Pipes the R2 response body directly back — the real R2 URL is never exposed
 */

// A browser's MP4 demuxer can issue dozens of small sequential Range
// requests for the *same* video (walking the moov atom) before real
// playback starts. Without this, every one of those requests pays a fresh
// DB round-trip just to look up the same R2 key. This only caches within a
// single warm server instance — that's fine, since that's exactly where the
// burst of requests for one video lands.
const r2KeyCache = new Map<string, { key: string; expires: number }>();
const R2_KEY_CACHE_TTL_MS = 60_000;

async function resolveR2Key(id: string): Promise<string | null> {
  const cached = r2KeyCache.get(id);
  if (cached && cached.expires > Date.now()) {
    return cached.key;
  }

  const video = await db.video.findUnique({
    where: { id },
    select: { cloudflareR2Key: true },
  });

  if (!video) return null;

  r2KeyCache.set(id, { key: video.cloudflareR2Key, expires: Date.now() + R2_KEY_CACHE_TTL_MS });
  return video.cloudflareR2Key;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Auth ────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── Resolve the R2 key for this video (cached — see resolveR2Key above) ────
  const r2Key = await resolveR2Key(id);

  if (!r2Key) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // ── Build GetObject command, forwarding Range header ────────────────────────
  const rangeHeader = request.headers.get('range') ?? undefined;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: r2Key,
    // Pass through the Range header so R2 returns a 206 Partial Content response
    ...(rangeHeader ? { Range: rangeHeader } : {}),
  });

  try {
    const r2Response = await s3.send(command);

    if (!r2Response.Body) {
      return new NextResponse('Empty body from R2', { status: 502 });
    }

    // Build response headers
    const headers = new Headers();

    if (r2Response.ContentType) {
      headers.set('Content-Type', r2Response.ContentType);
    } else {
      headers.set('Content-Type', 'video/mp4');
    }

    if (r2Response.ContentLength != null) {
      headers.set('Content-Length', String(r2Response.ContentLength));
    }

    if (r2Response.ContentRange) {
      headers.set('Content-Range', r2Response.ContentRange);
    }

    if (r2Response.AcceptRanges) {
      headers.set('Accept-Ranges', r2Response.AcceptRanges);
    } else {
      headers.set('Accept-Ranges', 'bytes');
    }

    if (r2Response.ETag) {
      headers.set('ETag', r2Response.ETag);
    }

    if (r2Response.LastModified) {
      headers.set('Last-Modified', r2Response.LastModified.toUTCString());
    }

    // Tell browsers not to cache the raw stream URL but allow range requests
    headers.set('Cache-Control', 'no-cache');

    // Security: prevent the browser from sniffing the URL
    headers.set('Content-Security-Policy', "media-src 'self'");

    // Convert the AWS SDK's readable stream to a Web ReadableStream
    const webStream = r2Response.Body.transformToWebStream();

    const statusCode = r2Response.$metadata.httpStatusCode ?? (rangeHeader ? 206 : 200);
    return new NextResponse(webStream, { status: statusCode, headers });
  } catch (err: any) {
    console.error('[stream] R2 error:', err);
    return new NextResponse('Failed to stream video', { status: 502 });
  }
}
