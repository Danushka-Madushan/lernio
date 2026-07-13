import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const imgbbApiKey = process.env.IMGBB_API_KEY;
  if (!imgbbApiKey) {
    return NextResponse.json({ error: 'ImgBB API key is not configured on the server' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Prepare payload for ImgBB API
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', file);

    const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: 'POST',
      body: imgbbFormData,
    });

    const data = await imgbbResponse.json();

    if (!imgbbResponse.ok || !data.success) {
      console.error('ImgBB API error response:', data);
      return NextResponse.json({ error: data.error?.message || 'Failed to upload to ImgBB' }, { status: 502 });
    }

    // Return the direct URL of the uploaded image
    return NextResponse.json({
      success: true,
      key: data.data.url, // Directly return the image URL
    });
  } catch (error: any) {
    console.error('Thumbnail upload error:', error);
    return NextResponse.json({ error: 'Failed to process thumbnail upload' }, { status: 500 });
  }
}
