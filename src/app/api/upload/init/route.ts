import { NextResponse } from 'next/server';
import { s3, bucketName } from '@/lib/r2';
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3';
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
    const { filename, contentType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Replace spaces and special characters from filename
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `videos/${Date.now()}-${cleanFilename}`;
    
    const command = new CreateMultipartUploadCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || 'video/mp4',
    });

    const response = await s3.send(command);

    return NextResponse.json({
      uploadId: response.UploadId,
      key,
    });
  } catch (error: any) {
    console.error('Multipart upload initiation error:', error);
    return NextResponse.json({ error: 'Failed to initiate upload' }, { status: 500 });
  }
}
