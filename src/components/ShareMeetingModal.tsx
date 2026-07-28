"use client";

import { notoSans } from '@/lib/fonts';
import { Video, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import CopyButton from './CopyButton';
import WhatsAppButton from './WhatsAppButton';
import { Grade } from '@/lib/db';

// ─── ShareMeetingModal ──────────────────────────────────────────────────────────
interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  grade: Grade | null;
  link: string;
  zoomAccountId?: string | null;
  meetingId?: string | null;
  startUrl?: string | null;
  duration?: number | null;
  isRecurring?: boolean;
  hostVideo?: boolean;
  participantVideo?: boolean;
  waitingRoom?: boolean;
  zoomAccount?: { name: string; email: string } | null;
  createdAt: string;
}

const buildMeetingShareMessage = (title: string, scheduledAt: string, joinUrl: string): string => {
  const date = new Date(scheduledAt).toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Colombo',
  });
  return [
    `📅 *Class: ${title}*`,
    `📆 ${date}`,
    '',
    'Join Zoom Meeting:',
    joinUrl,
    '',
    'Having issues? Contact +94 70 700 8041',
  ].join('\n');
}

const ShareMeetingModal = ({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) => {
  const message = buildMeetingShareMessage(meeting.title, meeting.scheduledAt, meeting.link);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
      <div ref={ref} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-in zoom-in-95 duration-200">
        <div className="bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-white">Share Meeting</h2>
            <p className={`text-[12px] text-blue-200 mt-0.5 ${notoSans.className}`}>{meeting.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 space-y-3 bg-white">
          <div className="relative overflow-hidden rounded-xl border border-[#c7d2fe] bg-[#eef2ff]">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <CopyButton text={message} label="Copy" variant="solid" tiny />
              <WhatsAppButton text={message} label="WhatsApp" tiny />
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #3730a3 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            <textarea readOnly value={message} rows={6}
              className="relative w-full resize-none bg-transparent px-4 pb-4 pt-12 text-[12px] leading-[1.75] text-[#3730a3] outline-none" />
          </div>
          {meeting.startUrl && (
            <div className="pt-2">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#9aa0a6]">Host Start Link</p>
              <div className="flex items-center gap-2">
                <CopyButton text={meeting.startUrl} label="Copy Host Link" variant="solid" />
                <a href={meeting.startUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-green-600 transition-colors">
                  <Video size={13} /> Open
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareMeetingModal;
