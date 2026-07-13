import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, bucketName } from '@/lib/r2';

export async function GET(
  request: Request,
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

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: video.cloudflareR2ThumbnailKey,
    });

    const r2Response = await s3.send(command);

    if (!r2Response.Body) {
      return new NextResponse('Empty body from R2', { status: 502 });
    }

    const headers = new Headers();
    if (r2Response.ContentType) {
      headers.set('Content-Type', r2Response.ContentType);
    } else {
      headers.set('Content-Type', 'image/jpeg');
    }

    if (r2Response.ContentLength != null) {
      headers.set('Content-Length', String(r2Response.ContentLength));
    }

    // Cache thumbnails for faster page loads
    headers.set('Cache-Control', 'public, max-age=86400');

    const webStream = r2Response.Body.transformToWebStream();
    return new NextResponse(webStream, { status: 200, headers });
  } catch (error: any) {
    console.error('Thumbnail streaming error:', error);
    return new NextResponse('Failed to load thumbnail', { status: 502 });
  }
}
