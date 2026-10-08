import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { ALL_GRADES } from '@/lib/constants';
import { Grade } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  let allowedGrades: Grade[] = ALL_GRADES;
  let gradeAliases: Record<string, string> = {};

  if (user.role === 'TEACHER' || user.role === 'ADMIN') {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { allowedGrades: true, gradeAliases: true },
    });
    if (dbUser) {
      if (dbUser.allowedGrades && dbUser.allowedGrades.length > 0) {
        allowedGrades = dbUser.allowedGrades;
      }
      gradeAliases = (dbUser.gradeAliases as Record<string, string>) || {};
    }
  } else if (user.role === 'STUDENT') {
    const student = await db.user.findUnique({
      where: { id: user.id },
      select: {
        teacherId: true,
        teacher: {
          select: {
            allowedGrades: true,
            gradeAliases: true,
          },
        },
      },
    });
    if (student?.teacher) {
      if (student.teacher.allowedGrades && student.teacher.allowedGrades.length > 0) {
        allowedGrades = student.teacher.allowedGrades;
      }
      gradeAliases = (student.teacher.gradeAliases as Record<string, string>) || {};
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      teacherId: user.teacherId ?? null,
      allowedGrades,
      gradeAliases,
    },
  });
}
