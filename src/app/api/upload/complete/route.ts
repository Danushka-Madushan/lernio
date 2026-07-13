import { NextResponse } from 'next/server';
import { s3, bucketName } from '@/lib/r2';
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
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
    const { key, uploadId, parts } = await request.json();
    if (!key || !uploadId || !parts || !Array.isArray(parts)) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Sort parts by PartNumber (AWS/R2 requires parts to be in order)
    const sortedParts = parts
      .map((p: any) => ({
        ETag: p.etag,
        PartNumber: Number(p.partNumber),
      }))
      .sort((a, b) => a.PartNumber - b.PartNumber);

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sortedParts,
      },
    });

    await s3.send(command);

    return NextResponse.json({ success: true, key });
  } catch (error: any) {
    console.error('Multipart upload completion error:', error);
    return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
  }
}
