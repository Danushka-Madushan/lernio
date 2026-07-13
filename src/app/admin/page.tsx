import { redirect } from 'next/navigation';

// /admin has no content itself — redirect to the videos dashboard
export default function AdminIndexPage() {
  redirect('/admin/videos');
}
