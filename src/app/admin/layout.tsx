import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;
  // Server-side guard (proxy also enforces this, but belt-and-suspenders)
  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] font-sans text-[#202124]">
      {/* Primary top bar — same style as dashboard */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e8eaed] px-4 py-3 shadow-[0_1px_2px_0_rgba(60,64,67,0.15)]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-xl font-medium tracking-tight text-[#1a73e8] hover:opacity-90 transition-opacity">
              Lernio
            </Link>
            {/* Admin sub-nav */}
            <nav className="hidden sm:flex items-center space-x-1 text-sm border-l border-[#e8eaed] pl-6">
              <Link
                href="/admin/videos"
                className="text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] font-medium transition-colors duration-150 rounded-full px-3 py-1.5 focus-visible:outline-none focus-visible:text-[#1a73e8]"
              >
                Videos
              </Link>
              <Link
                href="/admin/videos/upload"
                className="text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] font-medium transition-colors duration-150 rounded-full px-3 py-1.5 focus-visible:outline-none focus-visible:text-[#1a73e8]"
              >
                Upload
              </Link>
              <Link
                href="/admin/users"
                className="text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] font-medium transition-colors duration-150 rounded-full px-3 py-1.5 focus-visible:outline-none focus-visible:text-[#1a73e8]"
              >
                Students
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-[#5f6368] flex items-center">
              <span className="bg-[#e8f0fe] text-[#1a73e8] px-2 py-0.5 rounded-full text-[10px] font-semibold mr-2 tracking-wide">
                ADMIN
              </span>
              {user!.username}
            </span>
            <Link
              href="/"
              className="text-[#5f6368] hover:text-[#1a73e8] transition-colors text-[13px] font-medium"
            >
              ← Student Feed
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
