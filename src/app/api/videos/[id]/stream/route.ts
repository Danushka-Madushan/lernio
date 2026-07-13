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

  // ── Resolve the R2 key for this video ───────────────────────────────────────
  const video = await db.video.findUnique({
    where: { id },
    select: { cloudflareR2Key: true },
  });

  if (!video) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // ── Build GetObject command, forwarding Range header ────────────────────────
  const rangeHeader = request.headers.get('range') ?? undefined;

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: video.cloudflareR2Key,
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

    // Tell browsers not to cache the raw stream URL
    headers.set('Cache-Control', 'no-store');

    // Security: prevent the browser from sniffing the URL
    headers.set('Content-Security-Policy', "media-src 'self'");

    // Convert the AWS SDK's readable stream to a Web ReadableStream
    const webStream = r2Response.Body.transformToWebStream();

    const statusCode = rangeHeader ? 206 : 200;
    return new NextResponse(webStream, { status: statusCode, headers });
  } catch (err: any) {
    console.error('[stream] R2 error:', err);
    return new NextResponse('Failed to stream video', { status: 502 });
  }
}
