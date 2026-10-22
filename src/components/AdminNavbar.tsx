'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Video,
  UploadCloud,
  Tv,
  Award,
  Calendar,
  Users,
  GraduationCap,
  Shield,
  Plus,
  ArrowLeft,
  Menu,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import UserMenuDropdown from '@/components/UserMenuDropdown';

interface AdminNavbarProps {
  user: {
    id: string;
    username: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  };
}

export default function AdminNavbar({ user }: AdminNavbarProps) {
  const pathname = usePathname();

  // Dropdown open states
  const [openMenu, setOpenMenu] = useState<'media' | 'academics' | 'directory' | 'portal' | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navRef = useRef<HTMLElement>(null);

  // Close dropdowns on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileDrawerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setOpenMenu(null);
    setMobileDrawerOpen(false);
  }, [pathname]);

  const toggleMenu = (menu: 'media' | 'academics' | 'directory' | 'portal') => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  // Active domain helpers
  const isMediaActive =
    pathname.startsWith('/admin/videos') || pathname.startsWith('/liveclasses');

  const isAcademicsActive =
    pathname.startsWith('/exams-portal') || pathname.startsWith('/admin/meetings');

  const isDirectoryActive =
    pathname.startsWith('/admin/users') || pathname.startsWith('/admin/teachers');

  return (
    <>
      <header
        ref={navRef}
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs transition-all duration-200 select-none"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* ── LEFT: Logo & Portal Switcher ── */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg shrink-0"
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
              <span className="text-xl font-bold tracking-tight text-blue-600">
                Lernio
              </span>
            </Link>

            {/* Portal Switcher Badge Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('portal')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-colors cursor-pointer group"
              >
                <span>{user.role === 'ADMIN' ? 'Admin Panel' : 'Teacher Panel'}</span>
                <ChevronDown
                  size={14}
                  className={`text-blue-500 transition-transform duration-200 ${
                    openMenu === 'portal' ? 'rotate-180' : 'group-hover:text-blue-700'
                  }`}
                />
              </button>

              {/* Portal Switcher Dropdown */}
              {openMenu === 'portal' && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-gray-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Switch Platform Portal
                  </p>
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Video size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Student Feed</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">Video lectures catalog</p>
                    </div>
                  </Link>
                  <Link
                    href="/liveclasses"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Tv size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Live Classes</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">YouTube live stream sessions</p>
                    </div>
                  </Link>
                  <Link
                    href="/exams-portal"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Award size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Exams Portal</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">Exams, groups & marksheets</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* ── CENTER: 3-Pillar Categorized Navigation (Desktop) ── */}
            <nav className="hidden md:flex items-center space-x-1 border-l border-gray-200 pl-3.5 text-sm font-semibold">
              
              {/* 1. Media & Content Pillar Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('media')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    isMediaActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Video size={15} className={isMediaActive ? 'text-blue-600' : 'text-gray-400'} />
                  <span>Media</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      openMenu === 'media' ? 'rotate-180 text-blue-600' : 'text-gray-400'
                    }`}
                  />
                </button>

                {openMenu === 'media' && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-gray-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <p className="px-3.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Content & Streaming
                    </p>
                    <Link
                      href="/admin/videos"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Video size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Video Library</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">Browse & manage lectures</p>
                      </div>
                    </Link>
                    <Link
                      href="/admin/videos/upload"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <UploadCloud size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Upload New Video</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">Compress & publish lectures</p>
                      </div>
                    </Link>
                    <Link
                      href="/liveclasses"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Tv size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Live Classes</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">YouTube stream classes</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* 2. Academics Pillar Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('academics')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    isAcademicsActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Award size={15} className={isAcademicsActive ? 'text-blue-600' : 'text-gray-400'} />
                  <span>Academics</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      openMenu === 'academics' ? 'rotate-180 text-blue-600' : 'text-gray-400'
                    }`}
                  />
                </button>

                {openMenu === 'academics' && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-gray-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <p className="px-3.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Evaluations & Sessions
                    </p>
                    <Link
                      href="/exams-portal"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Award size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Exams Portal</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">Exams list & marks entry</p>
                      </div>
                    </Link>
                    <Link
                      href="/exams-portal/groups"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Exam Groups</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">Term & subject groupings</p>
                      </div>
                    </Link>
                    <Link
                      href="/admin/meetings"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Zoom Meetings</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">Live classroom video calls</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Directory Pillar Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('directory')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                    isDirectoryActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Users size={15} className={isDirectoryActive ? 'text-blue-600' : 'text-gray-400'} />
                  <span>Directory</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      openMenu === 'directory' ? 'rotate-180 text-blue-600' : 'text-gray-400'
                    }`}
                  />
                </button>

                {openMenu === 'directory' && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-gray-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <p className="px-3.5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Accounts & Roster
                    </p>
                    <Link
                      href="/admin/users"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <GraduationCap size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Students</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">Roster, credentials & grades</p>
                      </div>
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/teachers"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50/80 transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Shield size={16} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-blue-600 leading-tight">Teachers</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">Staff roles & accounts</p>
                        </div>
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Direct Quick Action: "+ Upload" */}
              <Link
                href="/admin/videos/upload"
                className="hidden lg:inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                title="Upload New Video Lecture"
              >
                <Plus size={14} />
                <span>Upload</span>
              </Link>
            </nav>
          </div>

          {/* ── RIGHT: Quick Actions & Consolidated Profile ── */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
            {/* Quick Switch to Student Feed (Desktop) */}
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-gray-600 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs rounded-xl px-3 py-2 font-medium transition-colors text-xs"
              title="Switch to Student Feed view"
            >
              <ArrowLeft size={13} className="text-gray-500" />
              <span>Student Feed</span>
            </Link>

            {/* Consolidated User Dropdown (Avatar, Role, Switchers, Version, Logout) */}
            <UserMenuDropdown user={user} />

            {/* Mobile Hamburger Trigger (< md) */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors cursor-pointer"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE & TABLET SLIDE-OVER DRAWER (< md) ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-4/5 max-w-sm h-full bg-white shadow-2xl flex flex-col justify-between overflow-y-auto p-5 z-10 animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 shrink-0">
                    <Image src="/icon.svg" alt="Lernio" fill className="object-contain" />
                  </div>
                  <span className="font-bold text-lg text-blue-600">Lernio</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                    Admin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Categorized Navigation Links */}
              <div className="mt-4 space-y-4">
                {/* Media Section */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-2">
                    Media & Lectures
                  </p>
                  <div className="space-y-1">
                    <Link
                      href="/admin/videos"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Video size={16} className="text-blue-600" />
                      <span>Video Library</span>
                    </Link>
                    <Link
                      href="/admin/videos/upload"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <UploadCloud size={16} className="text-blue-600" />
                      <span>Upload Video</span>
                    </Link>
                    <Link
                      href="/liveclasses"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Tv size={16} className="text-blue-600" />
                      <span>Live Classes</span>
                    </Link>
                  </div>
                </div>

                {/* Academics Section */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-2">
                    Academics & Sessions
                  </p>
                  <div className="space-y-1">
                    <Link
                      href="/exams-portal"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Award size={16} className="text-blue-600" />
                      <span>Exams Portal</span>
                    </Link>
                    <Link
                      href="/exams-portal/groups"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Sparkles size={16} className="text-blue-600" />
                      <span>Exam Groups</span>
                    </Link>
                    <Link
                      href="/admin/meetings"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Calendar size={16} className="text-blue-600" />
                      <span>Zoom Meetings</span>
                    </Link>
                  </div>
                </div>

                {/* Directory Section */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-2">
                    People & Directory
                  </p>
                  <div className="space-y-1">
                    <Link
                      href="/admin/users"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <GraduationCap size={16} className="text-blue-600" />
                      <span>Students Directory</span>
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin/teachers"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <Shield size={16} className="text-blue-600" />
                        <span>Teachers Directory</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Quick Portals Switcher */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-2">
                    Switch View
                  </p>
                  <Link
                    href="/"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowLeft size={15} className="text-gray-500" />
                      <span>Go to Student Feed</span>
                    </div>
                    <ExternalLink size={13} className="text-gray-400" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Drawer User Info Footer */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span className="font-medium truncate max-w-36">{user.username}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
