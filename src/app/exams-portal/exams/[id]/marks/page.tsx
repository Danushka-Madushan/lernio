import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import MarksLogBookClient from './MarksLogBookClient';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function MarksLogBookPage({ params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    redirect('/exams-portal');
  }

  const { id } = await params;

  return <MarksLogBookClient examId={id} />;
}
