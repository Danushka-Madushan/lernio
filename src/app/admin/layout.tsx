import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { AdminContent } from '@/components/AdminContent';
import AdminNavbar from '@/components/AdminNavbar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  // Server-side guard (proxy also enforces this, but belt-and-suspenders)
  if (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER')) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* Scalable Modern Categorized Admin Navbar */}
      <AdminNavbar user={user} />

      {/* Main Panel Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <AdminContent>
          {children}
        </AdminContent>
      </main>
    </div>
  );
}
