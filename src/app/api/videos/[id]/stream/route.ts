import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, bucketName } from '@/lib/r2';

/**
 * GET /api/videos/[id]/stream
 *
 * Auth guard → generates a short-lived presigned R2 URL → 302 redirect.
 * Video bytes travel directly from R2 to the browser; zero bytes pass
 * through the server, which eliminates Vercel / Deno fast-origin-transfer.
 *
 * Security is preserved:
 *  - Only authenticated users receive a signed URL.
 *  - Signed URLs expire in 5 minutes (enough to start playback, too short to share).
 *  - The permanent R2 bucket URL is never exposed.
 */

// A browser's video demuxer can issue many DB lookups in quick succession
// while resolving the same video. Cache the R2 key in-process to avoid
// redundant round-trips for the same video within a 60-second window.
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Auth ─────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── Resolve the R2 key ───────────────────────────────────────────────────────
  const r2Key = await resolveR2Key(id);
  if (!r2Key) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // ── Generate a short-lived presigned URL and redirect ────────────────────────
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: r2Key });
    // 5 minutes: long enough for the browser to begin playback, short enough
    // to be useless if shared. R2 enforces this server-side.
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err: any) {
    console.error('[stream] R2 presign error:', err);
    return new NextResponse('Failed to generate stream URL', { status: 502 });
  }
}
