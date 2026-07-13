import React from 'react';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#202124]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#e8eaed] px-4 py-3 shadow-[0_1px_2px_0_rgba(60,64,67,0.15)]">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-medium tracking-tight text-[#1a73e8] hover:opacity-90 transition-opacity">
            Lernio
          </Link>
          <div className="flex items-center space-x-4 text-sm">
            {user && (
              <>
                <span className="text-[#5f6368]">
                  Hello, <span className="text-[#202124] font-medium">{user.username}</span>
                </span>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="text-[#1a73e8] font-medium hover:underline focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 outline-none rounded-full px-1"
                  >
                    Admin Panel
                  </Link>
                )}
                <LogoutButton />
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
