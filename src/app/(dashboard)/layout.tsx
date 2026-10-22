import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import Link from 'next/link';
import Image from 'next/image';
import StudentMeetingsNav from '@/components/StudentMeetingsNav';
import MobileDrawerNav from '@/components/MobileDrawerNav';
import UserMenuDropdown from '@/components/UserMenuDropdown';
import { Award, Tv } from 'lucide-react';

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* 
        Upgraded Modern Glass Navbar
      */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-xs transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:py-2 py-3 flex justify-between items-center">

          {/* Logo Section */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          >
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/icon.svg"
                alt="Lernio Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="sm:text-2xl text-xl font-semibold tracking-tight text-blue-500">
              Lernio
            </span>
          </Link>

          {/* User Controls Section */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-sm">
            {user && (
              <>
                {/* Zoom button: only on md+ for students (moves to bottom nav on mobile) */}
                {isStudent && (
                  <span className="hidden md:flex">
                    <StudentMeetingsNav />
                  </span>
                )}

                {/* Live Classes Portal Link */}
                <Link
                  href="/liveclasses"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs rounded-full border border-blue-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 outline-none shadow-2xs"
                >
                  <Tv size={14} className="text-blue-600" />
                  <span>Live Classes</span>
                </Link>

                {/* Exams Portal Link */}
                <Link
                  href="/exams-portal"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs rounded-full border border-blue-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 outline-none shadow-2xs"
                >
                  <Award size={14} className="text-blue-600" />
                  <span>Exams Portal</span>
                </Link>

                {/* Admin / Teacher Panel link */}
                {(user.role === 'ADMIN' || user.role === 'TEACHER') && (
                  <Link
                    href="/admin"
                    className="hidden sm:flex items-center px-3 py-1.5 bg-[#e8f0fe] text-blue-600 font-medium text-xs rounded-full hover:bg-[#d2e3fc] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 outline-none"
                  >
                    {user.role === 'ADMIN' ? 'Admin Panel' : 'Teacher Panel'}
                  </Link>
                )}

                {/* Consolidated User Dropdown */}
                <div className="hidden sm:flex items-center">
                  <UserMenuDropdown user={user} />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto">
        {children}
      </main>

      {/* Universal mobile drawer navigation for all authenticated roles */}
      {user && <MobileDrawerNav username={user.username} role={user.role} />}
    </div>
  );
};

export default DashboardLayout;
