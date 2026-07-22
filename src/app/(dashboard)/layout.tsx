import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import Link from 'next/link';
import Image from 'next/image';
import LogoutButton from '@/components/LogoutButton';
import StudentMeetingsNav from '@/components/StudentMeetingsNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* 
        Upgraded Header: 
        - bg-white/90 and backdrop-blur-md create a modern "frosted glass" effect.
        - shadow-sm gives it just enough lift off the page to eliminate the "flat" feeling.
      */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          
          {/* Logo Section */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          >
            <div className="relative w-8 h-8 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <Image 
                src="/icon.svg" 
                alt="Lernio Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-semibold tracking-tight text-blue-500">
              Lernio
            </span>
          </Link>

          {/* User Controls Section */}
          <div className="flex items-center space-x-3 sm:space-x-5 text-sm">
            {user && (
              <>
                {user.role === 'STUDENT' && <StudentMeetingsNav />}

                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">
                    Welcome back
                  </span>
                  <span className="text-[#202124] font-semibold">
                    {user.username}
                  </span>
                </div>

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

                <LogoutButton />
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
