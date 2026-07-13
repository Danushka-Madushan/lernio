import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user || user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-surface-muted font-sans text-text-primary">
      {/* Admin Subheader */}
      <div className="bg-black border-b border-[#141a20] py-space-2 text-white">
        <div className="max-w-6xl mx-auto px-space-4 flex justify-between items-center text-xs">
          <div className="flex space-x-space-4">
            <Link
              href="/admin/videos"
              className="hover:text-surface-raised font-semibold transition-colors"
            >
              Videos Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="hover:text-surface-raised font-semibold transition-colors"
            >
              Student Credentials
            </Link>
          </div>
          <Link
            href="/"
            className="text-text-tertiary hover:text-text-inverse transition-colors"
          >
            ← Back to Student Feed
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-space-4">
        {children}
      </div>
    </div>
  );
}
