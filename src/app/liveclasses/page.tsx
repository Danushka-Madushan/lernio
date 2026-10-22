import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import TeacherLiveClassesClient from './TeacherLiveClassesClient';
import StudentLiveClassesClient from './StudentLiveClassesClient';

export default async function LiveClassesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/liveclasses');
  }

  if (user.role === 'STUDENT') {
    return <StudentLiveClassesClient />;
  }

  // Teacher or Admin View
  const teacherProfile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      allowedGrades: true,
      gradeAliases: true,
    },
  });

  return (
    <TeacherLiveClassesClient
      teacherId={user.id}
      isAdmin={user.role === 'ADMIN'}
      allowedGrades={teacherProfile?.allowedGrades || null}
      gradeAliases={(teacherProfile?.gradeAliases as Record<string, string>) || null}
    />
  );
}
