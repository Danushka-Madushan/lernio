'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center space-x-1.5 rounded-full border border-[#dadce0] bg-white px-3 py-1.5 text-xs font-medium text-[#3c4043] outline-none transition-all duration-150 hover:bg-[#f1f3f4] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 disabled:opacity-50"
      aria-label="Logout"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <LogOut size={14} />
      )}
      <span>Logout</span>
    </button>
  );
}
