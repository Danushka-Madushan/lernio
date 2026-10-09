import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import GroupDetailClient from './GroupDetailClient';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/exams-portal');
  }

  const { id } = await params;

  return <GroupDetailClient groupId={id} />;
}
