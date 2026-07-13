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
    <div className="min-h-screen flex flex-col bg-surface-muted text-text-primary">
      <header className="sticky top-0 z-40 bg-black border-b border-[#141a20] px-space-4 py-space-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90">
            Lernio
          </Link>
          <div className="flex items-center space-x-space-3 text-xs">
            {user && (
              <>
                <span className="text-text-tertiary">
                  Hello, <span className="text-text-inverse font-semibold">{user.username}</span>
                </span>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="text-surface-raised font-medium hover:underline focus-visible:ring-1 focus-visible:ring-surface-raised outline-none"
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
      <main className="flex-1 max-w-6xl w-full mx-auto p-space-4">
        {children}
      </main>
    </div>
  );
}
