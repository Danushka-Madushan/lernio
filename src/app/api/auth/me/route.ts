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
    const activeTeacherCookie = cookieStore.get('active_teacher_id')?.value;
    const enrollments = await db.studentTeacher.findMany({
      where: { studentId: user.id },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            nameAlias: true,
            role: true,
            allowedGrades: true,
            gradeAliases: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeEnrollment =
      (activeTeacherCookie && enrollments.find((e) => e.teacherId === activeTeacherCookie)) ||
      enrollments[0];

    if (activeEnrollment?.teacher) {
      if (activeEnrollment.teacher.allowedGrades && activeEnrollment.teacher.allowedGrades.length > 0) {
        allowedGrades = activeEnrollment.teacher.allowedGrades;
      }
      gradeAliases = (activeEnrollment.teacher.gradeAliases as Record<string, string>) || {};
    }

    const activeTeacherName = activeEnrollment?.teacher
      ? activeEnrollment.teacher.nameAlias ||
        (activeEnrollment.teacher.role === 'ADMIN' ? 'Admin Teacher' : activeEnrollment.teacher.username)
      : null;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        teacherId: activeEnrollment?.teacherId || user.teacherId || null,
        activeTeacherId: activeEnrollment?.teacherId || null,
        activeTeacherName,
        teachers: enrollments.map((e) => ({
          ...e.teacher,
          displayName:
            e.teacher.nameAlias ||
            (e.teacher.role === 'ADMIN' ? 'Admin Teacher' : e.teacher.username),
        })),
        allowedGrades,
        gradeAliases,
      },
    });
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
