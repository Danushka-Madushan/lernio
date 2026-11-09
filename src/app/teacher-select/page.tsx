import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import TeacherSelectClient from '@/components/TeacherSelectClient';

export const metadata = {
  title: 'Select Classroom - Lernio',
};

export default async function TeacherSelectPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'STUDENT') {
    redirect('/login');
  }

  const activeTeacherId = cookieStore.get('active_teacher_id')?.value || null;

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

  const teachers = enrollments
    .map((e) => e.teacher)
    .filter(Boolean) as Array<{
      id: string;
      username: string;
      nameAlias?: string | null;
      role: string;
      allowedGrades: any[];
      gradeAliases: Record<string, string> | null;
    }>;

  return (
    <TeacherSelectClient
      teachers={teachers}
      currentActiveTeacherId={activeTeacherId}
      studentUsername={user.username}
    />
  );
}
