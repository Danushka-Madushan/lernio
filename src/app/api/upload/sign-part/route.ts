import { NextResponse } from 'next/server';
import { s3, bucketName } from '@/lib/r2';
import { UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { key, uploadId, partNumber } = await request.json();
    if (!key || !uploadId || !partNumber) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const command = new UploadPartCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: Number(partNumber),
    });

    // Generate presigned URL for 1 hour
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({ url: presignedUrl });
  } catch (error: any) {
    console.error('Signing part error:', error);
    return NextResponse.json({ error: 'Failed to sign part URL' }, { status: 500 });
  }
}
