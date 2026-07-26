'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash,
  X,
  ChevronDown,
  Globe,
  ShieldAlert,
  Calendar,
  Trash2,
  Video,
  Settings,
  Link as LinkIcon,
  Repeat,
  UserCircle2,
} from 'lucide-react';
import { Button, Switch } from '@heroui/react';
import Image from 'next/image';
import { notoSans } from '@/lib/fonts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade = 'GRADE_6' | 'GRADE_7' | 'GRADE_8' | 'GRADE_9' | 'GRADE_10' | 'GRADE_11';

// 1=Daily, 2=Weekly, 3=Monthly
type RecurrenceType = 1 | 2 | 3;

interface RecurrenceConfig {
  type: RecurrenceType;
  repeat_interval: number;
  weekly_days?: string; // comma-separated "1"=Sun "2"=Mon ... "7"=Sat
  end_times?: number;
}

interface ZoomAccount {
  id: string;
  name: string;
  email: string;
  accountId: string;
  clientId: string;
  picUrl?: string | null;
}

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

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<Grade, string> = {
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
};

const GRADE_COLORS: Record<Grade, string> = {
  GRADE_6: 'bg-purple-50 text-purple-700',
  GRADE_7: 'bg-blue-50 text-blue-700',
  GRADE_8: 'bg-cyan-50 text-cyan-700',
  GRADE_9: 'bg-green-50 text-green-700',
  GRADE_10: 'bg-yellow-50 text-yellow-700',
  GRADE_11: 'bg-orange-50 text-orange-700',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_VALUES = ['1', '2', '3', '4', '5', '6', '7'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpired(meeting: Meeting): boolean {
  const scheduled = new Date(meeting.scheduledAt);
  const now = new Date();
  const durationMs = (meeting.duration || 40) * 60 * 1000;
  return now.getTime() - scheduled.getTime() > (durationMs + 60 * 60 * 1000);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildMeetingShareMessage(title: string, scheduledAt: string, joinUrl: string): string {
  const date = new Date(scheduledAt).toLocaleString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
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

async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fallthrough */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch { return false; }
}

function openWhatsApp(text: string): void {
  if (!text) return;
  const encoded = encodeURIComponent(text);
  const appUrl = `whatsapp://send?text=${encoded}`;
  const webUrl = `https://wa.me/?text=${encoded}`;
  let appLikelyOpened = false;
  const onVisibilityChange = () => { if (document.hidden) appLikelyOpened = true; };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.location.href = appUrl;
  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (!appLikelyOpened) window.open(webUrl, '_blank', 'noopener,noreferrer');
  }, 1000);
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text, label, variant = 'ghost', tiny = false }: {
  text: string; label?: string; variant?: 'ghost' | 'solid'; tiny?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const handle = async () => {
    if (!(await copyText(text))) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" disabled={!text} onClick={handle}
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium transition-all disabled:opacity-40',
        tiny ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        variant === 'solid'
          ? 'bg-blue-500 text-white shadow-sm hover:bg-[#1765cc]'
          : 'text-blue-500 hover:bg-blue-100',
      ].join(' ')}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}

// ─── WhatsAppButton ────────────────────────────────────────────────────────────

function WhatsAppIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.868-1.426A9.953 9.953 0 0 0 12.004 22C17.523 22 22 17.523 22 12c0-5.522-4.478-10-9.996-10zm0 18.18a8.17 8.17 0 0 1-4.34-1.24l-.31-.186-3.23.946.97-3.148-.202-.323A8.19 8.19 0 0 1 3.82 12c0-4.512 3.673-8.18 8.184-8.18 4.514 0 8.18 3.668 8.18 8.18 0 4.513-3.666 8.18-8.18 8.18z" />
    </svg>
  );
}

function WhatsAppButton({ text, label, tiny = false }: { text: string; label?: string; tiny?: boolean }) {
  return (
    <button type="button" disabled={!text} onClick={() => openWhatsApp(text)}
      title="Share via WhatsApp"
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium text-white shadow-sm transition-all hover:bg-[#20bd5a] disabled:opacity-40 bg-[#25D366]',
        tiny ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
      ].join(' ')}>
      <WhatsAppIcon size={tiny ? 11 : 12} />
      {label && <span>{label}</span>}
    </button>
  );
}

// ─── ShareMeetingModal ──────────────────────────────────────────────────────────

function ShareMeetingModal({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const message = buildMeetingShareMessage(meeting.title, meeting.scheduledAt, meeting.link);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
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

// ─── RecurrencePanel ───────────────────────────────────────────────────────────

function RecurrencePanel({
  scheduledAt,
  config,
  onChange,
  disabled,
}: {
  scheduledAt: string;
  config: RecurrenceConfig;
  onChange: (c: RecurrenceConfig) => void;
  disabled?: boolean;
}) {
  const currentDayIndex = scheduledAt ? new Date(scheduledAt).getDay() : new Date().getDay();
  const currentDayValue = String(currentDayIndex + 1); // "1"=Sun.."7"=Sat
  const currentDayLabel = WEEKDAY_LABELS[currentDayIndex];

  const selectedDays = (config.weekly_days || currentDayValue).split(',').filter(Boolean);

  const toggleDay = (val: string) => {
    const days = new Set(selectedDays);
    if (days.has(val)) { days.delete(val); } else { days.add(val); }
    const sorted = WEEKDAY_VALUES.filter(v => days.has(v));
    onChange({ ...config, weekly_days: sorted.join(',') || currentDayValue });
  };

  // Preset options
  const presets = [
    { label: 'Daily', type: 1 as RecurrenceType, repeat_interval: 1, weekly_days: undefined },
    { label: `Weekly on ${currentDayLabel}`, type: 2 as RecurrenceType, repeat_interval: 1, weekly_days: currentDayValue },
    { label: 'Weekdays (Mon–Fri)', type: 2 as RecurrenceType, repeat_interval: 1, weekly_days: '2,3,4,5,6' },
    { label: 'Custom Days', type: 2 as RecurrenceType, repeat_interval: 1, weekly_days: selectedDays.join(',') },
  ];

  const activePreset = (() => {
    if (config.type === 1) return 0;
    if (config.type === 2 && config.weekly_days === currentDayValue) return 1;
    if (config.type === 2 && config.weekly_days === '2,3,4,5,6') return 2;
    return 3;
  })();

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">Repeat Pattern</p>

      {/* Preset pills */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p, i) => (
          <button key={i} type="button" disabled={disabled}
            onClick={() => onChange({ ...config, type: p.type, repeat_interval: p.repeat_interval, weekly_days: p.weekly_days })}
            className={[
              'rounded-full px-3 py-1 text-[11px] font-medium transition-colors border',
              activePreset === i
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100',
            ].join(' ')}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom day picker */}
      {activePreset === 3 && config.type === 2 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-blue-700">Pick days:</p>
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map((day, i) => {
              const val = WEEKDAY_VALUES[i];
              const active = selectedDays.includes(val);
              return (
                <button key={val} type="button" disabled={disabled}
                  onClick={() => toggleDay(val)}
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold transition-colors border',
                    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-100',
                  ].join(' ')}>
                  {day[0]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Repeat interval (only for non-daily) */}
      {config.type === 2 && (
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-blue-700 whitespace-nowrap">Repeat every:</label>
          <input type="number" min={1} max={12} value={config.repeat_interval}
            disabled={disabled}
            onChange={(e) => onChange({ ...config, repeat_interval: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-12 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-center outline-none" />
          <span className="text-[11px] text-blue-700">week(s)</span>
        </div>
      )}

      {/* End after N occurrences */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-blue-700 whitespace-nowrap">End after:</label>
        <input type="number" min={1} max={100} value={config.end_times || 50}
          disabled={disabled}
          onChange={(e) => onChange({ ...config, end_times: Math.max(1, parseInt(e.target.value) || 50) })}
          className="w-14 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-center outline-none" />
        <span className="text-[11px] text-blue-700">occurrences</span>
      </div>
    </div>
  );
}

// ─── MeetingSettingsPanel ──────────────────────────────────────────────────────

function MeetingSettingsPanel({
  scheduledAt,
  durationMinutes, onDurationChange,
  hostVideo, onHostVideoChange,
  participantVideo, onParticipantVideoChange,
  waitingRoom, onWaitingRoomChange,
  isRecurring, onIsRecurringChange,
  recurrenceConfig, onRecurrenceConfigChange,
  disabled,
}: {
  scheduledAt: string;
  durationMinutes: number; onDurationChange: (v: number) => void;
  hostVideo: boolean; onHostVideoChange: (v: boolean) => void;
  participantVideo: boolean; onParticipantVideoChange: (v: boolean) => void;
  waitingRoom: boolean; onWaitingRoomChange: (v: boolean) => void;
  isRecurring: boolean; onIsRecurringChange: (v: boolean) => void;
  recurrenceConfig: RecurrenceConfig; onRecurrenceConfigChange: (c: RecurrenceConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Meeting Settings</h4>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-gray-500">Duration:</label>
          <input type="number" value={durationMinutes}
            onChange={(e) => onDurationChange(parseInt(e.target.value) || 40)}
            disabled={disabled} min={15} max={40} step={5}
            className="w-14 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-blue-500/20" />
          <span className="text-[11px] text-gray-500">min</span>
        </div>
      </div>

      {/* Switches in 2-col grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Switch isSelected={hostVideo} onChange={onHostVideoChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Host Video
          </Switch.Content>
        </Switch>
        <Switch isSelected={participantVideo} onChange={onParticipantVideoChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Participant Video
          </Switch.Content>
        </Switch>
        <Switch isSelected={waitingRoom} onChange={onWaitingRoomChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Waiting Room
          </Switch.Content>
        </Switch>
        <Switch isSelected={isRecurring} onChange={onIsRecurringChange} isDisabled={disabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            Recurring
          </Switch.Content>
        </Switch>
      </div>

      {/* Recurrence config panel */}
      {isRecurring && (
        <RecurrencePanel
          scheduledAt={scheduledAt}
          config={recurrenceConfig}
          onChange={onRecurrenceConfigChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

function DateTimePicker({
  label, value, onChange, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[#5f6368]">{label}</label>
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-base text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20" />
    </div>
  );
}

// ─── AddMeetingModal ───────────────────────────────────────────────────────────

function AddMeetingModal({
  title, link, scheduledAt, grade, zoomAccountId,
  durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom,
  recurrenceConfig, zoomAccounts, creating, error, success,
  onTitleChange, onLinkChange, onScheduledAtChange, onGradeChange, onZoomAccountIdChange,
  onDurationMinutesChange, onIsRecurringChange, onHostVideoChange, onParticipantVideoChange,
  onWaitingRoomChange, onRecurrenceConfigChange, onSubmit, onCancel,
}: {
  title: string; link: string; scheduledAt: string; grade: Grade | ''; zoomAccountId: string;
  durationMinutes: number; isRecurring: boolean; hostVideo: boolean; participantVideo: boolean;
  waitingRoom: boolean; recurrenceConfig: RecurrenceConfig; zoomAccounts: ZoomAccount[];
  creating: boolean; error: string; success: string;
  onTitleChange: (v: string) => void; onLinkChange: (v: string) => void;
  onScheduledAtChange: (v: string) => void; onGradeChange: (v: Grade | '') => void;
  onZoomAccountIdChange: (v: string) => void; onDurationMinutesChange: (v: number) => void;
  onIsRecurringChange: (v: boolean) => void; onHostVideoChange: (v: boolean) => void;
  onParticipantVideoChange: (v: boolean) => void; onWaitingRoomChange: (v: boolean) => void;
  onRecurrenceConfigChange: (c: RecurrenceConfig) => void;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !creating && onCancel()}>
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Create Zoom Meeting</span>
            </div>
            <button type="button" onClick={onCancel} disabled={creating} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>}
          {success && <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>}

          <form id="add-meeting-form" onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Account <span className="font-normal text-[#9aa0a6]">(Host)</span></label>
              <div className="relative">
                <select value={zoomAccountId} onChange={(e) => onZoomAccountIdChange(e.target.value)} disabled={creating}
                  className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                  <option value="">— Manual Link (No API) —</option>
                  {zoomAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.email})</option>)}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Meeting Title</label>
              <input type="text" value={title} onChange={(e) => onTitleChange(e.target.value)}
                disabled={creating} placeholder="e.g. Science Class — Chapter 4"
                className={`w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20 ${notoSans.className}`}
                required />
            </div>

            {!zoomAccountId && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Zoom Link</label>
                <input type="text" value={link} onChange={(e) => onLinkChange(e.target.value)}
                  disabled={creating} placeholder="https://zoom.us/j/..."
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
                  required={!zoomAccountId} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
                <div className="relative">
                  <select value={grade} onChange={(e) => onGradeChange(e.target.value as Grade | '')} disabled={creating}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="">— All Grades —</option>
                    {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
              </div>
              <DateTimePicker label="Scheduled Date & Time" value={scheduledAt} onChange={onScheduledAtChange} disabled={creating} />
            </div>

            {zoomAccountId && (
              <MeetingSettingsPanel
                scheduledAt={scheduledAt}
                durationMinutes={durationMinutes} onDurationChange={onDurationMinutesChange}
                hostVideo={hostVideo} onHostVideoChange={onHostVideoChange}
                participantVideo={participantVideo} onParticipantVideoChange={onParticipantVideoChange}
                waitingRoom={waitingRoom} onWaitingRoomChange={onWaitingRoomChange}
                isRecurring={isRecurring} onIsRecurringChange={onIsRecurringChange}
                recurrenceConfig={recurrenceConfig} onRecurrenceConfigChange={onRecurrenceConfigChange}
                disabled={creating}
              />
            )}
          </form>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={creating}>Cancel</Button>
          <Button isPending={creating} type="submit" form="add-meeting-form" variant="primary"
            isDisabled={creating || !title || (!zoomAccountId && !link) || !scheduledAt}>
            {({ isPending }) => (<>{isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Meeting</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── EditMeetingModal ──────────────────────────────────────────────────────────

function EditMeetingModal({ meeting, loading, onConfirm, onCancel }: {
  meeting: Meeting; loading: boolean;
  onConfirm: (title: string, link: string, scheduledAt: string, grade: Grade | '', durationMinutes: number, isRecurring: boolean, hostVideo: boolean, participantVideo: boolean, waitingRoom: boolean, recurrenceConfig: RecurrenceConfig) => void;
  onCancel: () => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [title, setTitle] = useState(meeting.title);
  const [link, setLink] = useState(meeting.link || '');
  const [scheduledAt, setScheduledAt] = useState(meeting.scheduledAt ? toLocal(new Date(meeting.scheduledAt)) : '');
  const [grade, setGrade] = useState<Grade | ''>(meeting.grade || '');
  const [durationMinutes, setDurationMinutes] = useState(meeting.duration || 40);
  const [isRecurring, setIsRecurring] = useState(meeting.isRecurring || false);
  const [hostVideo, setHostVideo] = useState(meeting.hostVideo || false);
  const [participantVideo, setParticipantVideo] = useState(meeting.participantVideo || false);
  const [waitingRoom, setWaitingRoom] = useState(meeting.waitingRoom !== false);
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig>({ type: 2, repeat_interval: 1, weekly_days: String(new Date(meeting.scheduledAt).getDay() + 1), end_times: 50 });

  const isZoomApi = !!meeting.zoomAccountId;

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-white">Edit Meeting</span>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
          {isZoomApi && meeting.zoomAccount && (
            <div className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
              <Video size={14} /> API-controlled via {meeting.zoomAccount.name}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Meeting Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading}
              className={`w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20 ${notoSans.className}`} required />
          </div>

          {!isZoomApi && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Zoom Link</label>
              <input type="text" value={link} onChange={(e) => setLink(e.target.value)} disabled={loading}
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20" required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
              <div className="relative">
                <select value={grade} onChange={(e) => setGrade(e.target.value as Grade | '')} disabled={loading}
                  className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                  <option value="">— All Grades —</option>
                  {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
              </div>
            </div>
            <DateTimePicker label="Scheduled Date & Time" value={scheduledAt} onChange={setScheduledAt} disabled={loading} />
          </div>

          {isZoomApi && (
            <MeetingSettingsPanel
              scheduledAt={scheduledAt}
              durationMinutes={durationMinutes} onDurationChange={setDurationMinutes}
              hostVideo={hostVideo} onHostVideoChange={setHostVideo}
              participantVideo={participantVideo} onParticipantVideoChange={setParticipantVideo}
              waitingRoom={waitingRoom} onWaitingRoomChange={setWaitingRoom}
              isRecurring={isRecurring} onIsRecurringChange={setIsRecurring}
              recurrenceConfig={recurrenceConfig} onRecurrenceConfigChange={setRecurrenceConfig}
              disabled={loading}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>Cancel</Button>
          <Button isPending={loading} variant="primary"
            onPress={() => onConfirm(title, link, scheduledAt, grade, durationMinutes, isRecurring, hostVideo, participantVideo, waitingRoom, recurrenceConfig)}
            isDisabled={loading || !title || (!isZoomApi && !link) || !scheduledAt}>
            {({ isPending }) => (<>{isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save Changes</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmDeleteModal ───────────────────────────────────────────────────────

function ConfirmDeleteModal({ targetName, zoomAccountLinked, loading, onConfirm, onCancel }: {
  targetName: string; zoomAccountLinked?: boolean; loading: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="bg-linear-to-br from-red-500 via-[#c5221f] to-[#b31412] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Confirm Delete</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div>
              <p className="text-[13px] font-semibold text-[#b31412]">This action is irreversible</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                Are you sure you want to permanently delete <span className="font-semibold">{targetName}</span>?
                {zoomAccountLinked && ' This will also cancel the meeting on Zoom.'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>Cancel</Button>
          <Button isPending={loading} variant="danger" onPress={onConfirm} isDisabled={loading}>
            {({ isPending }) => (<>{isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── ManageZoomAccountsModal ──────────────────────────────────────────────────

function AccountAvatar({ name, picUrl }: { name: string, picUrl?: string | null }) {
  if (picUrl) {
    return (
      <Image width={40} height={40} src={picUrl} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/5" />
    );
  }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['from-blue-400 to-blue-500', 'from-blue-400 to-pink-500', 'from-green-400 to-teal-500', 'from-orange-400 to-red-500'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${colors[colorIdx]} text-[13px] font-bold text-white shadow-sm`}>
      {initials || <UserCircle2 size={16} />}
    </div>
  );
}

function ManageZoomAccountsModal({ zoomAccounts, loading, onAdd, onDelete, onCancel }: {
  zoomAccounts: ZoomAccount[]; loading: boolean;
  onAdd: (name: string, email: string, accountId: string, clientId: string, clientSecret: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [accountId, setAccountId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ZoomAccount | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onAdd(name, email, accountId, clientId, clientSecret);
    if (success) {
      setAdding(false);
      setName(''); setEmail(''); setAccountId(''); setClientId(''); setClientSecret('');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const success = await onDelete(deleteTarget.id);
    if (success) setDeleteTarget(null);
  };

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && !deleteTarget && onCancel()}>

      {deleteTarget && (
        <ConfirmDeleteModal
          targetName={deleteTarget.name}
          loading={loading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="w-full max-w-2xl my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="bg-linear-to-br from-blue-500 via-[#3949ab] to-[#283593] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Settings size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Manage Zoom Accounts</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 min-h-70">
          {adding ? (
            <form onSubmit={handleAdd} className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <h3 className="text-sm font-semibold text-blue-900">Add Server-to-Server OAuth Account</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Identifier Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Host Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Account ID</label>
                <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} required disabled={loading}
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} required disabled={loading}
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onPress={() => setAdding(false)} isDisabled={loading}>Cancel</Button>
                <Button type="submit" size="sm" variant="primary" isDisabled={loading} isPending={loading}>
                  {({ isPending }) => (<>{isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save Account</>)}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#202124]">Configured Accounts</h3>
                <Button size="sm" variant="outline" className="bg-blue-100 text-blue-700 font-medium" onPress={() => setAdding(true)}>
                  <Plus size={14} /> Add Account
                </Button>
              </div>

              {zoomAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-[#9aa0a6] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <UserCircle2 size={28} className="mb-2 text-gray-300" />
                  No Zoom accounts configured. Add one to use API-based meetings.
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {zoomAccounts.map(account => (
                    <div key={account.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                      <AccountAvatar name={account.name} picUrl={account.picUrl} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#202124] truncate">{account.name}</p>
                        <p className="text-xs text-[#5f6368] truncate">{account.email}</p>
                      </div>
                      <Button isIconOnly size="sm" variant="outline" className="bg-red-50 text-red-600 hover:bg-red-100"
                        onPress={() => setDeleteTarget(account)} isDisabled={loading}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, tone = 'default' }: {
  label: string; value: number | string; icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger' | 'info';
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-[#f1f3f4] text-[#5f6368]',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-500',
    info: 'bg-blue-100 text-blue-500',
  };
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[20px] font-medium leading-tight text-[#202124]">{value}</p>
        <p className="truncate text-[12px] text-[#5f6368]">{label}</p>
      </div>
    </div>
  );
}

function MeetingStatusBadge({ meeting }: { meeting: Meeting }) {
  if (isExpired(meeting)) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <ShieldAlert size={9} /> Expired
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      <Check size={9} /> Upcoming
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DEFAULT_RECURRENCE: RecurrenceConfig = { type: 2, repeat_interval: 1, weekly_days: String(new Date().getDay() + 1), end_times: 50 };

export default function MeetingsAdminPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [zoomAccounts, setZoomAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showManageAccountsModal, setShowManageAccountsModal] = useState(false);
  const [manageAccountsLoading, setManageAccountsLoading] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newGrade, setNewGrade] = useState<Grade | ''>('');
  const [newZoomAccountId, setNewZoomAccountId] = useState('');
  const [newDurationMinutes, setNewDurationMinutes] = useState(40);
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newHostVideo, setNewHostVideo] = useState(false);
  const [newParticipantVideo, setNewParticipantVideo] = useState(false);
  const [newWaitingRoom, setNewWaitingRoom] = useState(true);
  const [newRecurrenceConfig, setNewRecurrenceConfig] = useState<RecurrenceConfig>(DEFAULT_RECURRENCE);

  const [creating, setCreating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [editTarget, setEditTarget] = useState<Meeting | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | ''>('');
  const [showExpired, setShowExpired] = useState(false);

  // Share popover state
  const [shareTarget, setShareTarget] = useState<Meeting | null>(null);

  const activeMeetings = useMemo(() => meetings.filter((m) => !isExpired(m)), [meetings]);
  const expiredMeetings = useMemo(() => meetings.filter((m) => isExpired(m)), [meetings]);

  const filterMeetings = useCallback((list: Meeting[]) => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((m) => {
      const matchSearch = m.title.toLowerCase().includes(q) || m.link?.toLowerCase().includes(q);
      const matchGrade = gradeFilter ? m.grade === gradeFilter : true;
      return matchSearch && matchGrade;
    });
  }, [searchQuery, gradeFilter]);

  const filteredActive = useMemo(() => filterMeetings(activeMeetings), [filterMeetings, activeMeetings]);
  const filteredExpired = useMemo(() => filterMeetings(expiredMeetings), [filterMeetings, expiredMeetings]);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const [meetingsRes, accountsRes] = await Promise.all([
        fetch('/api/meetings'),
        fetch('/api/zoom-accounts')
      ]);
      const data = await meetingsRes.json();
      const accountsData = await accountsRes.json();
      if (meetingsRes.ok) setMeetings(data.meetings);
      else setError(data.error || 'Failed to fetch meetings');
      if (accountsRes.ok) {
        setZoomAccounts(accountsData.accounts);
        if (accountsData.accounts.length > 0 && !newZoomAccountId)
          setNewZoomAccountId(accountsData.accounts[0].id);
      } else setError(accountsData.error || 'Failed to fetch accounts');
    } catch { setError('Connection error'); }
    finally { setLoading(false); }
  }, [newZoomAccountId]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); } }, [error]);

  const handleAddZoomAccount = async (name: string, email: string, accountId: string, clientId: string, clientSecret: string) => {
    setManageAccountsLoading(true);
    try {
      const res = await fetch('/api/zoom-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, accountId, clientId, clientSecret }) });
      const data = await res.json();
      if (res.ok) { setSuccess('Account added.'); fetchMeetings(); return true; }
      setError(data.error || 'Failed to add account'); return false;
    } catch { setError('Connection error'); return false; }
    finally { setManageAccountsLoading(false); }
  };

  const handleDeleteZoomAccount = async (id: string) => {
    setManageAccountsLoading(true);
    try {
      const res = await fetch(`/api/zoom-accounts/${id}`, { method: 'DELETE' });
      if (res.ok) { setSuccess('Account deleted.'); fetchMeetings(); return true; }
      setError('Failed to delete account'); return false;
    } catch { setError('Connection error'); return false; }
    finally { setManageAccountsLoading(false); }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true); setError('');
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          link: newZoomAccountId ? undefined : newLink,
          scheduledAt: new Date(newScheduledAt).toISOString(),
          grade: newGrade || null,
          zoomAccountId: newZoomAccountId || null,
          durationMinutes: newDurationMinutes,
          isRecurring: newIsRecurring,
          recurrenceConfig: newIsRecurring ? newRecurrenceConfig : undefined,
          hostVideo: newHostVideo,
          participantVideo: newParticipantVideo,
          waitingRoom: newWaitingRoom,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Meeting '${newTitle}' created.`);
        setNewTitle(''); setNewLink(''); setNewScheduledAt(''); setNewGrade('');
        setShowAddModal(false); fetchMeetings();
      } else setError(data.error || 'Failed to create meeting');
    } catch { setError('Connection error'); }
    finally { setCreating(false); }
  };

  const handleEditMeeting = async (title: string, link: string, scheduledAt: string, grade: Grade | '', durationMinutes: number, isRecurring: boolean, hostVideo: boolean, participantVideo: boolean, waitingRoom: boolean, recurrenceConfig: RecurrenceConfig) => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/meetings/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, link, scheduledAt: new Date(scheduledAt).toISOString(), grade: grade || null, durationMinutes, isRecurring, recurrenceConfig: isRecurring ? recurrenceConfig : undefined, hostVideo, participantVideo, waitingRoom }),
      });
      if (res.ok) { setSuccess(`Meeting updated.`); setEditTarget(null); fetchMeetings(); }
      else { const d = await res.json(); setError(d.error || 'Failed to update'); setEditTarget(null); }
    } catch { setError('Connection error'); setEditTarget(null); }
    finally { setEditLoading(false); }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/meetings/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { setSuccess(`Meeting deleted.`); setDeleteTarget(null); fetchMeetings(); }
      else { const d = await res.json(); setError(d.error || 'Failed to delete'); setDeleteTarget(null); }
    } catch { setError('Connection error'); setDeleteTarget(null); }
    finally { setDeleteLoading(false); }
  };

  const renderMeetingRow = (meeting: Meeting) => (
    <tr key={meeting.id} className="transition-colors duration-100 hover:bg-[#f8f9fa]">
      <td className="py-3.5 pl-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <Video size={14} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[13px] font-medium text-[#202124] truncate ${notoSans.className}`}>{meeting.title}</span>
              {meeting.isRecurring && <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"><Repeat size={8} /> Recurring</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {meeting.zoomAccount ? (
                <span className="inline-flex items-center text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">API: {meeting.zoomAccount.name}</span>
              ) : (
                <span className="inline-flex items-center text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">Manual Link</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3.5">
        {meeting.grade ? (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${GRADE_COLORS[meeting.grade]}`}>{GRADE_LABELS[meeting.grade]}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"><Globe size={9} /> All</span>
        )}
      </td>
      <td className="py-3.5">
        <div className="space-y-1">
          <MeetingStatusBadge meeting={meeting} />
          <p className="text-[10px] text-[#9aa0a6] flex items-center gap-0.5">
            <Calendar size={8} /> {formatDate(meeting.scheduledAt)}
            {meeting.duration && ` · ${meeting.duration}m`}
          </p>
        </div>
      </td>
      <td className="py-3.5 pr-4">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {/* Share button */}
          {meeting.link && (
            <div className="relative">
              <button type="button"
                onClick={() => setShareTarget(shareTarget?.id === meeting.id ? null : meeting)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100">
                <LinkIcon size={11} /> Share
              </button>
              {shareTarget?.id === meeting.id && (
                <ShareMeetingModal meeting={meeting} onClose={() => setShareTarget(null)} />
              )}
            </div>
          )}
          {isExpired(meeting) && meeting.meetingId && (
            <button type="button" onClick={() => setEditTarget(meeting)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-green-600 hover:bg-green-100 transition-colors">
              <RefreshCw size={11} /> Reactivate
            </button>
          )}
          <button type="button" onClick={() => setEditTarget(meeting)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-blue-500 hover:bg-blue-100 transition-colors">
            Edit
          </button>
          <button type="button" onClick={() => setDeleteTarget(meeting)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium text-red-500 hover:bg-red-100 transition-colors">
            <Trash size={11} /> Delete
          </button>
        </div>
      </td>
    </tr>
  );

  const renderMeetingTable = (rows: Meeting[]) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#e8eaed]">
            <th className="py-2.5 pl-4 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Meeting</th>
            <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade</th>
            <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Schedule</th>
            <th className="py-2.5 pr-4 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1f3f4]">{rows.map(renderMeetingRow)}</tbody>
      </table>
    </div>
  );

  return (
    <>
      {showManageAccountsModal && (
        <ManageZoomAccountsModal zoomAccounts={zoomAccounts} loading={manageAccountsLoading}
          onAdd={handleAddZoomAccount} onDelete={handleDeleteZoomAccount}
          onCancel={() => setShowManageAccountsModal(false)} />
      )}
      {showAddModal && (
        <AddMeetingModal
          title={newTitle} link={newLink} scheduledAt={newScheduledAt} grade={newGrade}
          zoomAccountId={newZoomAccountId} durationMinutes={newDurationMinutes}
          isRecurring={newIsRecurring} hostVideo={newHostVideo} participantVideo={newParticipantVideo}
          waitingRoom={newWaitingRoom} recurrenceConfig={newRecurrenceConfig}
          zoomAccounts={zoomAccounts} creating={creating} error={error} success={success}
          onTitleChange={setNewTitle} onLinkChange={setNewLink}
          onScheduledAtChange={setNewScheduledAt} onGradeChange={setNewGrade}
          onZoomAccountIdChange={setNewZoomAccountId} onDurationMinutesChange={setNewDurationMinutes}
          onIsRecurringChange={setNewIsRecurring} onHostVideoChange={setNewHostVideo}
          onParticipantVideoChange={setNewParticipantVideo} onWaitingRoomChange={setNewWaitingRoom}
          onRecurrenceConfigChange={setNewRecurrenceConfig}
          onSubmit={handleCreateMeeting} onCancel={() => setShowAddModal(false)} />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal targetName={deleteTarget.title} zoomAccountLinked={!!deleteTarget.zoomAccountId}
          loading={deleteLoading} onConfirm={handleDeleteMeeting} onCancel={() => setDeleteTarget(null)} />
      )}
      {editTarget && (
        <EditMeetingModal meeting={editTarget} loading={editLoading}
          onConfirm={handleEditMeeting} onCancel={() => setEditTarget(null)} />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">Zoom Meetings</h1>
              <p className="mt-1 text-sm text-[#5f6368]">Create and manage scheduled Zoom meetings for your classes</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                onPress={() => setShowManageAccountsModal(true)}>
                <Settings size={15} /> Accounts
              </Button>
              <Button type="button" variant="primary" onPress={() => setShowAddModal(true)}>
                <Plus size={15} /> New Meeting
              </Button>
            </div>
          </div>

          {/* Global toasts */}
          {error && !showAddModal && !showManageAccountsModal && (
            <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] text-[#c5221f]">{error}</div>
          )}
          {success && !showAddModal && !showManageAccountsModal && (
            <div className="rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] text-[#137333]">{success}</div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Meetings" value={meetings.length} tone="default" icon={<Video size={17} />} />
            <StatCard label="Upcoming" value={activeMeetings.length} tone="success" icon={<Check size={17} />} />
            <StatCard label="Expired" value={expiredMeetings.length} tone="danger" icon={<ShieldAlert size={17} />} />
          </div>

          {/* Filters bar */}
          <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-medium text-[#202124]">Active Meetings</h2>
                {!loading && activeMeetings.length > 0 && (
                  <span className="rounded-full bg-[#f1f3f4] px-2.5 py-0.5 text-xs font-medium text-[#5f6368]">{activeMeetings.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as Grade | '')}
                    className="appearance-none rounded-full border border-[#dadce0] bg-white py-2 pl-3 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                    <option value="">All Grades</option>
                    {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                </div>
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search meetings…"
                    className="w-44 rounded-full border border-[#dadce0] bg-white py-2 pl-8 pr-7 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20" />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#202124]">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active meetings table */}
          <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
            {loading ? (
              <div className="flex justify-center py-14"><Loader2 className="animate-spin text-blue-500" size={26} /></div>
            ) : filteredActive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                  <Video size={20} className="text-[#9aa0a6]" />
                </div>
                <p className="text-sm text-[#5f6368]">{activeMeetings.length === 0 ? 'No upcoming meetings.' : 'No meetings match your filters.'}</p>
              </div>
            ) : (
              renderMeetingTable(filteredActive)
            )}
          </div>

          {/* Expired meetings collapsible */}
          {expiredMeetings.length > 0 && (
            <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] overflow-hidden">
              <button type="button" onClick={() => setShowExpired((v) => !v)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#f8f9fa] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                    <ShieldAlert size={15} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-[#202124]">Expired Meetings</p>
                    <p className="text-[11px] text-[#9aa0a6]">{expiredMeetings.length} meeting{expiredMeetings.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-[#5f6368] transition-transform duration-200 ${showExpired ? 'rotate-180' : ''}`} />
              </button>
              {showExpired && (
                filteredExpired.length === 0
                  ? <div className="px-6 pb-6 text-sm text-[#9aa0a6]">No expired meetings match your filters.</div>
                  : renderMeetingTable(filteredExpired)
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
