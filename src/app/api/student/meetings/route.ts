import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/jwt';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  
  if (!user || user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const student = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Only fetch meetings for the student's grade or global meetings (grade is null)
    // and where scheduledAt is not older than 2 hours.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const meetings = await db.zoomLink.findMany({
      where: {
        OR: [
          { grade: null },
          ...(student.grade ? [{ grade: student.grade }] : []),
        ],
        scheduledAt: {
          gte: twoHoursAgo,
        },
      },
      orderBy: { scheduledAt: 'asc' }, // Show next meetings first
    });

    return NextResponse.json({ meetings });
  } catch (error: unknown) {
    console.error('List student meetings error:', error);
    return NextResponse.json({ error: 'Failed to retrieve meetings' }, { status: 500 });
  }
}
