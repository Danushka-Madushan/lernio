import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';
import { Award, ArrowLeft } from 'lucide-react';
import ExamsMobileNav from '@/components/exams/ExamsMobileNav';

export default async function ExamsPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    redirect('/login?callbackUrl=/exams-portal');
  }

  const isStaff = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* Exams Portal Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs transition-all duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center">
          {/* Logo & Section Identity */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <Link
              href="/exams-portal"
              className="flex items-center gap-2 group focus-visible:outline-none shrink-0"
            >
              <div className="relative w-7 h-7 sm:w-9 sm:h-9 shrink-0 transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/icon.svg"
                  alt="Lernio Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-2xl font-bold tracking-tight text-blue-600">
                  Lernio
                </span>
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                  <Award size={12} className="text-blue-600 shrink-0" />
                  <span>Exams Portal</span>
                </span>
              </div>
            </Link>

            {/* Staff Navigation Tabs */}
            {isStaff && (
              <nav className="hidden md:flex items-center space-x-1 text-sm border-l border-gray-200 pl-4">
                <Link
                  href="/exams-portal"
                  className="text-gray-700 hover:text-blue-600 hover:bg-blue-50/60 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Exams List
                </Link>
                <Link
                  href="/exams-portal/groups"
                  className="text-gray-700 hover:text-blue-600 hover:bg-blue-50/60 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  Exam Groups
                </Link>
              </nav>
            )}
          </div>

          {/* Right Action & User Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm shrink-0">
            {/* Identity Badge (Desktop) */}
            <div className="hidden lg:flex items-center bg-[#f1f3f4] border border-gray-200 rounded-full pl-2 pr-3 py-1">
              <span
                className={`text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase mr-2 shadow-2xs ${
                  user.role === 'ADMIN'
                    ? 'bg-blue-500'
                    : user.role === 'TEACHER'
                    ? 'bg-purple-600'
                    : 'bg-emerald-600'
                }`}
              >
                {user.role === 'ADMIN'
                  ? 'Admin'
                  : user.role === 'TEACHER'
                  ? 'Teacher'
                  : 'Student'}
              </span>
              <span className="text-gray-800 font-semibold max-w-28 truncate">
                {user.username}
              </span>
            </div>

            {/* Desktop Back Switchers */}
            {isStaff ? (
              <Link
                href="/admin"
                className="hidden md:inline-flex items-center gap-1 text-gray-700 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Admin Panel</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="hidden md:inline-flex items-center gap-1 text-gray-700 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Videos</span>
              </Link>
            )}

            {/* Mobile 1-Tap Back Button */}
            <Link
              href={isStaff ? '/admin' : '/'}
              className="md:hidden flex items-center justify-center w-9 h-9 text-gray-700 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs rounded-xl transition-colors"
              title={isStaff ? 'Back to Admin Panel' : 'Back to Videos'}
            >
              <ArrowLeft size={16} />
            </Link>

            <div className="hidden md:block w-px h-5 bg-gray-200"></div>

            {/* Desktop Logout Button */}
            <div className="hidden md:block">
              <LogoutButton />
            </div>

            {/* Mobile Drawer Trigger (Mobile-only) */}
            <ExamsMobileNav username={user.username} role={user.role} />
          </div>
        </div>
      </header>

      {/* Main Portal Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
