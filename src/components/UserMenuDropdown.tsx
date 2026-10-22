'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  Loader2,
  Tv,
  Award,
  Video,
  Shield,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import RepoVersionBadge from '@/components/RepoVersionBadge';

interface UserMenuDropdownProps {
  user: {
    id: string;
    username: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  };
}

export default function UserMenuDropdown({ user }: UserMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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

  const initials = user.username ? user.username.substring(0, 2).toUpperCase() : 'U';

  const roleColor =
    user.role === 'ADMIN'
      ? 'bg-blue-600 text-white'
      : user.role === 'TEACHER'
      ? 'bg-purple-600 text-white'
      : 'bg-emerald-600 text-white';

  const roleLabel =
    user.role === 'ADMIN' ? 'Administrator' : user.role === 'TEACHER' ? 'Teacher' : 'Student';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] border border-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer group"
      >
        {/* Avatar circle */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${roleColor}`}
        >
          {initials}
        </div>

        {/* Username */}
        <span className="text-xs font-semibold text-gray-800 max-w-28 truncate">
          {user.username}
        </span>

        {/* Role badge */}
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase shadow-2xs ${roleColor}`}
        >
          {user.role === 'ADMIN' ? 'Admin' : user.role === 'TEACHER' ? 'Teacher' : 'Student'}
        </span>

        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-gray-700'
          }`}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-gray-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${roleColor}`}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 truncate">{user.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">{roleLabel}</span>
              </div>
            </div>
          </div>

          {/* Quick Platform Portals */}
          <div className="px-2 py-2 border-b border-gray-100 space-y-0.5">
            <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Platform Switcher
            </p>

            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/70 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Video size={13} />
                </div>
                <span>Student Feed (Lectures)</span>
              </div>
              <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-600" />
            </Link>

            <Link
              href="/liveclasses"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/70 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Tv size={13} />
                </div>
                <span>Live Classes Portal</span>
              </div>
              <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-600" />
            </Link>

            <Link
              href="/exams-portal"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/70 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Award size={13} />
                </div>
                <span>Exams & Marksheet Portal</span>
              </div>
              <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-600" />
            </Link>

            {(user.role === 'ADMIN' || user.role === 'TEACHER') && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/70 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Shield size={13} />
                  </div>
                  <span>Admin Management Center</span>
                </div>
                <ExternalLink size={12} className="text-gray-400 group-hover:text-purple-600" />
              </Link>
            )}
          </div>

          {/* Repo Version Info */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Build Version</span>
            <RepoVersionBadge owner="Danushka-Madushan" repo="lernio" />
          </div>

          {/* Logout Action */}
          <div className="p-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              {logoutLoading ? (
                <Loader2 size={14} className="animate-spin text-red-500" />
              ) : (
                <LogOut size={14} />
              )}
              <span>Log out of session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
