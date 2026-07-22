'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Loader2, Video, MonitorUp, Globe, X, Calendar } from 'lucide-react';
import { Button, Link } from '@heroui/react';

interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  grade: string | null;
  link: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function parseZoomLink(link: string): { appLink: string; webLink: string } {
  // Typical zoom link: https://us04web.zoom.us/j/123456789?pwd=abc
  // App link: zoommtg://zoom.us/join?action=join&confno=123456789&pwd=abc
  
  try {
    const url = new URL(link);
    const match = url.pathname.match(/\/j\/(\d+)/);
    
    if (match && match[1]) {
      const confno = match[1];
      const pwd = url.searchParams.get('pwd');
      
      let appLink = `zoommtg://zoom.us/join?action=join&confno=${confno}`;
      if (pwd) {
        appLink += `&pwd=${pwd}`;
      }
      
      return { appLink, webLink: link };
    }
  } catch {
    // ignore parsing errors
  }
  
  // If parsing fails or it's not a standard Zoom link, fallback to using the original link for both
  // Usually OS will intercept the https link if Zoom is installed anyway.
  return { appLink: link, webLink: link };
}

export default function StudentMeetingsNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/meetings');
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Failed to fetch meetings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMeetings();
    }
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center h-fit w-fit px-2 py-2 justify-center rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 relative"
        title="Zoom Meetings"
      >
        <Image src="/zoom-logo.svg" alt="Zoom Meetings" width={72} height={16} />
      </button>

      {isOpen && mounted && createPortal(
        <div 
          role="dialog" 
          aria-modal="true"
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
          onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
        >
          <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
            <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Video size={16} className="text-white" />
                  <span className="text-[15px] font-semibold text-white">Zoom Meetings</span>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} aria-label="Close"
                  className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 min-h-50 max-h-[70vh] overflow-y-auto bg-[#f8f9fa]">
              {loading ? (
                <div className="flex h-full items-center justify-center py-10">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <Video size={20} className="text-[#9aa0a6]" />
                  </div>
                  <p className="text-sm font-medium text-[#202124]">No upcoming meetings</p>
                  <p className="mt-1 text-xs text-[#5f6368]">Check back later for scheduled live sessions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => {
                    const { appLink, webLink } = parseZoomLink(meeting.link);
                    return (
                      <div key={meeting.id} className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-black/5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-[15px] text-[#202124]">{meeting.title}</h3>
                            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#5f6368]">
                              <Calendar size={12} />
                              {formatDate(meeting.scheduledAt)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <Button
                            onPress={() => {
                              window.open(appLink);
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
                            variant='outline'
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
        </div>,
        document.body
      )}
    </>
  );
}
