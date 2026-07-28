import { redirect } from 'next/navigation';

// /admin has no content itself - redirect to the videos dashboard
const AdminIndexPage = () => {
  redirect('/admin/videos');
}

export default AdminIndexPage;
