'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  Menu,
  X,
  LogOut,
  Loader2,
  Tv,
  Award,
  House,
  Shield,
} from 'lucide-react';
import { createPortal } from 'react-dom';

interface LiveClassesMobileNavProps {
  username: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
}

export default function LiveClassesMobileNav({
  username,
  role,
}: LiveClassesMobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  if (!mounted) return null;

  const isStaff = role === 'ADMIN' || role === 'TEACHER';

  return (
    <>
      <button
        type="button"
        aria-label="Open mobile menu"
        onClick={() => setDrawerOpen(true)}
        className="md:hidden flex items-center justify-center w-9 h-9 text-gray-700 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs rounded-xl transition-colors cursor-pointer"
      >
        <Menu size={18} />
      </button>

      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-100 flex md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer Sheet */}
            <div className="relative ml-auto w-full max-w-xs h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative w-7 h-7">
                      <Image src="/icon.svg" alt="Lernio" fill className="object-contain" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm">Live Classes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* User Info */}
                <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-gray-900 truncate">{username}</p>
                    <span className="text-[10px] font-medium text-blue-600 uppercase">
                      {role === 'ADMIN' ? 'Admin' : role === 'TEACHER' ? 'Teacher' : 'Student'}
                    </span>
                  </div>
                </div>

                {/* Nav Links */}
                <nav className="p-3 space-y-1">
                  <button
                    type="button"
                    onClick={() => router.push('/liveclasses')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      pathname === '/liveclasses'
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Tv size={15} className="text-blue-600" />
                    <span>Live Classes Home</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/exams-portal')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Award size={15} className="text-gray-500" />
                    <span>Exams Portal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <House size={15} className="text-gray-500" />
                    <span>Videos Portal</span>
                  </button>

                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => router.push('/admin')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <Shield size={15} className="text-gray-500" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Logout Footer */}
              <div className="p-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {logoutLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <LogOut size={14} />
                      <span>Log Out</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
