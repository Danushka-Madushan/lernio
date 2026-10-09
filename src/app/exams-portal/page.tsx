import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import TeacherExamsPortalClient from './TeacherExamsPortalClient';
import StudentExamsPortalClient from './StudentExamsPortalClient';

export default async function ExamsPortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/exams-portal');
  }

  if (user.role === 'STUDENT') {
    return <StudentExamsPortalClient />;
  }

  // Teacher or Admin
  const teacherProfile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      allowedGrades: true,
      gradeAliases: true,
    },
  });

  return (
    <TeacherExamsPortalClient
      teacherId={user.id}
      isAdmin={user.role === 'ADMIN'}
      allowedGrades={teacherProfile?.allowedGrades || null}
      gradeAliases={(teacherProfile?.gradeAliases as Record<string, string>) || null}
    />
  );
}
