import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, bucketName } from '@/lib/r2';
import { verifyVideoAccess } from '@/lib/video-access';

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

  // ── Verify Access & Tenancy ──────────────────────────────────────────────────
  const access = await verifyVideoAccess(user, id);
  if (!access.allowed || !access.video) {
    if (access.reason === 'unauthorized') {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (access.reason === 'not_found') {
      return new NextResponse('Not Found', { status: 404 });
    }
    if (access.reason === 'account_inactive') {
      return new NextResponse('Account Inactive', { status: 403 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ── Generate a short-lived presigned URL and redirect ────────────────────────
  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: access.video.cloudflareR2Key });
    // 5 minutes: long enough for the browser to begin playback, short enough
    // to be useless if shared. R2 enforces this server-side.
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err: any) {
    console.error('[stream] R2 presign error:', err);
    return new NextResponse('Failed to generate stream URL', { status: 502 });
  }
}
