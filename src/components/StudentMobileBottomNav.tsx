'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  House,
  Menu,
  X,
  LogOut,
  Loader2,
  Video,
  MonitorUp,
  Globe,
  Calendar,
  ChevronRight,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@heroui/react';
import { createPortal } from 'react-dom';

/* ─── Nav Items ─────────────────────────────────────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: House, href: '/' },
  { id: 'papers', label: 'Papers', icon: FileText, href: '/papers' },
  // Future items (papers, classes, etc.) added here
];

/* ─── Types & Helpers ────────────────────────────────────────────────────────── */

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  grade: string | null;
  link: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Colombo',
  });
}

function parseZoomLink(link: string): { appLink: string; webLink: string } {
  try {
    const url = new URL(link);
    const match = url.pathname.match(/\/j\/(\d+)/);
    if (match && match[1]) {
      const confno = match[1];
      const pwd = url.searchParams.get('pwd');
      let appLink = `zoommtg://zoom.us/join?action=join&confno=${confno}`;
      if (pwd) appLink += `&pwd=${pwd}`;
      return { appLink, webLink: link };
    }
  } catch {
    // ignore parsing errors
  }
  return { appLink: link, webLink: link };
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

interface Props {
  username: string;
}

const StudentMobileBottomNav = ({ username }: Props) => {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key + scroll lock while drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  // Scroll lock while zoom modal is open
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoomOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [zoomOpen]);

  const fetchMeetings = async () => {
    setMeetingsLoading(true);
    try {
      const res = await fetch('/api/student/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch meetings', error);
    } finally {
      setMeetingsLoading(false);
    }
  };

  const handleZoomOpen = () => {
    setDrawerOpen(false);
    // Small delay lets the drawer finish closing before modal opens
    setTimeout(() => {
      setZoomOpen(true);
      fetchMeetings();
    }, 180);
  };

  const handleNavClick = useCallback(
    (href: string) => {
      setDrawerOpen(false);
      router.push(href);
    },
    [router]
  );

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

  return createPortal(
    <>
      {/* ── Hamburger trigger — fixed over the header's right side ─────────
          The header is sticky z-50 (~57 px tall). This button sits at z-[55]
          so it stays above the header without disrupting desktop layout.    */}
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setDrawerOpen(true)}
        className="md:hidden fixed top-0 right-0 z-55 flex items-center justify-center w-14 h-14.25 text-[#5f6368] hover:text-[#202124] active:text-blue-500 transition-colors duration-150 focus-visible:outline-none"
      >
        <Menu size={22} strokeWidth={1.75} />
      </button>

      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        className={`md:hidden fixed inset-0 z-60 bg-slate-900/40 transition-opacity duration-300 ${drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          }`}
      />

      {/* ── Left-side Drawer ──────────────────────────────────────────────── */}
      <aside
        aria-label="Student navigation"
        className={`md:hidden fixed inset-y-0 left-0 z-70 w-72 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ── Drawer Header ─── */}
        <div className="relative flex items-center h-14.25 px-4 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 shrink-0">
              <Image
                src="/icon.svg"
                alt="Lernio Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-lg font-semibold tracking-tight text-blue-500">
              Lernio
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-xl text-[#9aa0a6] hover:bg-gray-100 hover:text-[#202124] active:bg-gray-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={18} />
          </button>
        </div>


        {/* ── Nav Items (scrollable body) ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3">
          <nav className="flex flex-col gap-1" aria-label="Main">
            {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
              const isActive =
                href === '/'
                  ? pathname === '/'
                  : pathname === href || pathname.startsWith(href + '/');
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavClick(href)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center w-full rounded-xl pr-3 py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive
                      ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/25'
                      : 'text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124] active:bg-gray-100'
                    }`}
                >
                  {/* Icon slot — same width as reference for label alignment */}
                  <span className="w-14 flex items-center justify-center shrink-0">
                    <span
                      className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-100'
                        }`}
                    >
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.5 : 1.75}
                      />
                    </span>
                  </span>
                  <span className="flex-1 text-left">{label}</span>
                  {!isActive && (
                    <ChevronRight size={14} className="text-[#9aa0a6] shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        {/* Zoom Meetings — pressable logo button, same feel as the desktop nav */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={handleZoomOpen}
            title="Zoom Meetings"
            className="flex items-center justify-center w-full px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 active:scale-95 active:bg-blue-200 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <Image
              src="/zoom-logo.svg"
              alt="Zoom Meetings"
              width={80}
              height={18}
            />
          </button>
        </div>

        {/* ── Drawer Footer: User card + Zoom + Logout ─── */}
        <div className="shrink-0 border-t border-gray-100 px-3 pt-2 pb-3 space-y-1.5">

          {/* User profile card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-linear-to-r from-[#e8f0fe] to-[#f0f4ff] border border-blue-100 mb-2">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-400/30 shrink-0 select-none">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#9aa0a6] leading-none mb-0.5">
                Welcome back
              </p>
              <p className="text-sm font-semibold text-[#202124] truncate">
                {username}
              </p>
            </div>
          </div>


          {/* Logout — full-width, expressive red */}
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="flex items-center justify-center gap-2.5 w-full px-3 py-3 rounded-xl bg-red-400 hover:bg-red-500 active:scale-[0.98] text-white text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:opacity-60 shadow-sm shadow-rose-500/30"
          >
            {logoutLoading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <LogOut size={17} strokeWidth={2} />
            )}
            Log out
          </button>
        </div>
      </aside>

      {/* ── Zoom Meetings Modal ───────────────────────────────────────────── */}
      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-[fadeIn_0.2s_ease-out]">
            {/* Modal header */}
            <div className="flex items-center justify-between bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Video size={16} className="text-white" />
                <span className="text-[15px] font-semibold text-white">
                  Zoom Meetings
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoomOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-white/50 hover:bg-white/15 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 min-h-50 max-h-[70vh] overflow-y-auto bg-[#f8f9fa]">
              {meetingsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <Video size={20} className="text-[#9aa0a6]" />
                  </div>
                  <p className="text-sm font-medium text-[#202124]">
                    No upcoming meetings
                  </p>
                  <p className="mt-1 text-xs text-[#5f6368]">
                    Check back later for scheduled live sessions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => {
                    const { appLink, webLink } = parseZoomLink(meeting.link);
                    return (
                      <div
                        key={meeting.id}
                        className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5"
                      >
                        <h3 className="font-semibold text-[15px] text-[#202124]">
                          {meeting.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#5f6368]">
                          <Calendar size={12} />
                          {formatDate(meeting.scheduledAt)}
                        </p>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <Button
                            onPress={() => {
                              window.location.href = appLink;
                            }}
                            fullWidth
                          >
                            <MonitorUp size={16} />
                            Join from App
                          </Button>
                          <Button
                            onPress={() => {
                              window.open(webLink, '_blank', 'noopener,noreferrer');
                            }}
                            variant="outline"
                            className="text-blue-500"
                            fullWidth
                          >
                            <Globe size={16} />
                            Join from Web
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default StudentMobileBottomNav;
