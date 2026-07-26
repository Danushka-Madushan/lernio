import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { getZoomUserProfile } from '@/lib/zoom';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accounts = await db.zoomAccount.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        accountId: true,
        clientId: true,
        picUrl: true,
        // Don't send client secret back to the client
        createdAt: true,
      }
    });
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, email, accountId, clientId, clientSecret } = await req.json();

    if (!name || !email || !accountId || !clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let picUrl = null;
    try {
      const profile = await getZoomUserProfile(accountId, clientId, clientSecret);
      picUrl = profile.picUrl || null;
    } catch (err) {
      console.error('Failed to fetch Zoom profile:', err);
      return NextResponse.json({ error: 'Failed to validate Zoom credentials. Please check your API keys.' }, { status: 400 });
    }

    const newAccount = await db.zoomAccount.create({
      data: {
        name,
        email,
        accountId,
        clientId,
        clientSecret,
        picUrl,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: newAccount.id,
        name: newAccount.name,
        email: newAccount.email,
        accountId: newAccount.accountId,
        clientId: newAccount.clientId,
        picUrl: newAccount.picUrl,
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
