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
    <div className="min-h-screen flex flex-col bg-surface-muted font-sans text-text-primary">
      {/* Primary top bar — same style as dashboard */}
      <header className="sticky top-0 z-40 bg-black border-b border-text-secondary px-space-4 py-space-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-space-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90">
              Lernio
            </Link>
            {/* Admin sub-nav */}
            <nav className="hidden sm:flex items-center space-x-space-3 text-xs border-l border-text-secondary pl-space-3">
              <Link
                href="/admin/videos"
                className="text-text-tertiary hover:text-surface-raised font-semibold transition-colors duration-instant focus-visible:outline-none focus-visible:text-surface-raised"
              >
                Videos
              </Link>
              <Link
                href="/admin/videos/upload"
                className="text-text-tertiary hover:text-surface-raised font-semibold transition-colors duration-instant focus-visible:outline-none focus-visible:text-surface-raised"
              >
                Upload
              </Link>
              <Link
                href="/admin/users"
                className="text-text-tertiary hover:text-surface-raised font-semibold transition-colors duration-instant focus-visible:outline-none focus-visible:text-surface-raised"
              >
                Students
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-space-3 text-xs">
            <span className="text-text-tertiary">
              <span className="bg-surface-raised/20 text-surface-raised px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">
                ADMIN
              </span>
              {user!.username}
            </span>
            <Link
              href="/"
              className="text-text-tertiary hover:text-text-inverse transition-colors text-[11px]"
            >
              ← Student Feed
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-space-4">
        {children}
      </main>
    </div>
  );
}
