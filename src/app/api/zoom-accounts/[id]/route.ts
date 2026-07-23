import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { name, email, accountId, clientId, clientSecret } = await req.json();

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (email) dataToUpdate.email = email;
    if (accountId) dataToUpdate.accountId = accountId;
    if (clientId) dataToUpdate.clientId = clientId;
    if (clientSecret) dataToUpdate.clientSecret = clientSecret;

    const updatedAccount = await db.zoomAccount.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      account: {
        id: updatedAccount.id,
        name: updatedAccount.name,
        email: updatedAccount.email,
        accountId: updatedAccount.accountId,
        clientId: updatedAccount.clientId,
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await db.zoomAccount.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
