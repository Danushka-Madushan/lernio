import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';
import StudentMeetingsNav from '@/components/StudentMeetingsNav';
import StudentMobileBottomNav from '@/components/StudentMobileBottomNav';
import { GraduationCap } from 'lucide-react';

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* 
        Upgraded Header: 
        - bg-white/90 and backdrop-blur-md create a modern "frosted glass" effect.
        - shadow-sm gives it just enough lift off the page to eliminate the "flat" feeling.
      */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
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
          <div className="flex items-center space-x-3 sm:space-x-5 text-sm">
            {user && (
              <>
                {/* Zoom button: only on md+ for students (moves to bottom nav on mobile) */}
                {isStudent && (
                  <span className="hidden md:flex">
                    <StudentMeetingsNav />
                  </span>
                )}

                <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl bg-linear-to-r from-[#e8f0fe] to-[#f0f4ff] border border-blue-100">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-400/30 shrink-0 select-none">
                    <GraduationCap size={20} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[#9aa0a6] leading-none mb-0.5">
                      Welcome back
                    </p>
                    <p className="text-sm font-semibold text-[#202124] truncate">
                      {user.username}
                    </p>
                  </div>
                </div>

                {/* Admin Panel link — only entry point from client side for admins */}
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="flex items-center px-3 py-1.5 bg-[#e8f0fe] text-blue-500 font-medium text-xs rounded-full hover:bg-[#d2e3fc] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40 outline-none"
                  >
                    Admin Panel
                  </Link>
                )}

                {/* Vertical Divider */}
                <div className="hidden sm:block w-px h-6 bg-gray-300"></div>

                {/* Logout button: hidden on mobile for students (logout lives in bottom nav) */}
                <span className={isStudent ? 'hidden md:flex' : ''}>
                  <LogoutButton />
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto">
        {children}
      </main>

      {/* Student-only mobile bottom navigation bar */}
      {isStudent && <StudentMobileBottomNav username={user.username} />}
    </div>
  );
}

export default DashboardLayout;
