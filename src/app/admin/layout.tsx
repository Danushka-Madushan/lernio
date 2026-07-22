import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import RepoVersionBadge from '@/components/RepoVersionBadge';
import { ArrowLeft } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  // Server-side guard (proxy also enforces this, but belt-and-suspenders)
  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      {/* 
        Upgraded Modern Glass Navbar 
        Matches main dashboard style with unified background-blur and shadow
      */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          
          <div className="flex items-center space-x-6">
            {/* Unified Brand Logo Component */}
            <Link 
              href="/" 
              className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8] rounded-lg"
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
              <span className="text-xl font-semibold tracking-tight text-[#1a73e8]">
                Lernio
              </span>
            </Link>

            {/* Admin Management Context Tabs */}
            <nav className="hidden md:flex items-center space-x-1 text-sm border-l border-gray-200 pl-6">
              <Link
                href="/admin/videos"
                className="text-gray-600 hover:text-[#1a73e8] hover:bg-[#e8f0fe]/60 font-medium transition-all duration-150 rounded-lg px-3 py-2 focus-visible:outline-none "
              >
                Videos
              </Link>
              <Link
                href="/admin/videos/upload"
                className="text-gray-600 hover:text-[#1a73e8] hover:bg-[#e8f0fe]/60 font-medium transition-all duration-150 rounded-lg px-3 py-2 focus-visible:outline-none"
              >
                Upload
              </Link>
              <Link
                href="/admin/users"
                className="text-gray-600 hover:text-[#1a73e8] hover:bg-[#e8f0fe]/60 font-medium transition-all duration-150 rounded-lg px-3 py-2 focus-visible:outline-none "
              >
                Students
              </Link>
            </nav>
          </div>

          {/* Identity & Context Switching */}
          <div className="flex items-center space-x-4 text-sm">
            <RepoVersionBadge owner='Danushka-Madushan' repo='lernio' />
            <div className="flex items-center bg-[#f1f3f4] border border-gray-200 rounded-full pl-2 pr-3 py-1">
              <span className="bg-[#1a73e8] text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase mr-2 shadow-sm">
                Admin
              </span>
              <span className="text-gray-800 font-medium max-w-30 truncate">
                {user.username}
              </span>
            </div>

            {/* Back to Application View */}
            <Link
              href="/"
              className="hidden gap-1 sm:inline-flex items-center text-gray-600 hover:text-[#1a73e8] font-medium transition-colors bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs rounded-lg px-3 py-1.5 text-xs"
            >
              <ArrowLeft size={16} /> Student Feed
            </Link>
            
            <div className="w-px h-5 bg-gray-200"></div>

            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Panel Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
