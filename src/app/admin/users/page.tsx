'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash,
  UserPlus,
  X,
  Clock,
  Film,
  ChevronDown,
  RotateCcw,
  BookOpen,
  Lock,
  Globe,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade = 'GRADE_6' | 'GRADE_7' | 'GRADE_8' | 'GRADE_9' | 'GRADE_10' | 'GRADE_11';
type AccessMode = 'GRADE' | 'CUSTOM';

interface Student {
  id: string;
  username: string;
  grade: Grade | null;
  activeFrom: string | null;
  activeTo: string | null;
  accessMode: AccessMode;
  createdAt: string;
}

interface ShareInfo {
  username: string;
  password: string;
}

interface ShareResetTarget {
  id: string;
  username: string;
}

interface VideoItem {
  id: string;
  title: string;
  grade: Grade | null;
  visibility: 'PUBLIC' | 'GRADE';
  cloudflareR2ThumbnailKey: string | null;
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
  GRADE_6:  'bg-purple-50 text-purple-700',
  GRADE_7:  'bg-blue-50 text-blue-700',
  GRADE_8:  'bg-cyan-50 text-cyan-700',
  GRADE_9:  'bg-green-50 text-green-700',
  GRADE_10: 'bg-yellow-50 text-yellow-700',
  GRADE_11: 'bg-orange-50 text-orange-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secureRandInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function generatePassword(length = 6): string {
  const U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const L = 'abcdefghijklmnopqrstuvwxyz';
  const D = '0123456789';
  const all = U + L + D;
  const chars = [
    U[secureRandInt(U.length)],
    L[secureRandInt(L.length)],
    D[secureRandInt(D.length)],
    ...Array.from({ length: Math.max(0, length - 3) }, () => all[secureRandInt(all.length)]),
  ];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
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

function buildShareMessage(username: string, password: string): string {
  return [
    'Hi, this is your Lernio logins',
    '',
    `Username: ${username}`,
    `Password: ${password}`,
    '',
    'If not working pls contact +94XXXXXXX',
  ].join('\n');
}

/** Returns account status for a student */
function getAccountStatus(student: Student): 'active' | 'expired' | 'not_yet' | 'no_expiry' {
  const now = new Date();
  const from = student.activeFrom ? new Date(student.activeFrom) : null;
  const to = student.activeTo ? new Date(student.activeTo) : null;
  if (from && now < from) return 'not_yet';
  if (to && now > to) return 'expired';
  if (!from && !to) return 'no_expiry';
  return 'active';
}

function isExpiredOrInactive(student: Student): boolean {
  const status = getAccountStatus(student);
  return status === 'expired' || status === 'not_yet';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────

function DateTimePicker({
  label,
  value,
  onChange,
  disabled,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minDate?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-[#5f6368]">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        min={minDate}
        className="w-full rounded-lg border border-[#dadce0] bg-white px-3 py-2 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
      />
    </div>
  );
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
          ? 'bg-[#1a73e8] text-white shadow-sm hover:bg-[#1765cc]'
          : 'text-[#1a73e8] hover:bg-[#e8f0fe]',
      ].join(' ')}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}

// ─── CredentialPill ───────────────────────────────────────────────────────────

function CredentialPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#9aa0a6]">{label}</p>
        <p className="truncate font-mono text-sm font-semibold text-[#202124]">{value}</p>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

// ─── ShareCredentialsCard ─────────────────────────────────────────────────────

function ShareCredentialsCard({ info, onDismiss }: { info: ShareInfo; onDismiss: () => void }) {
  const message = buildShareMessage(info.username, info.password);
  return (
    <div className="mt-5 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
      <div className="relative bg-linear-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] px-4 py-4">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 right-10 h-14 w-14 rounded-full bg-white/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Key size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-white">Student Credentials</p>
              <p className="mt-0.5 text-[11px] leading-tight text-blue-200">Ready to share · {info.username}</p>
            </div>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss"
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-2 bg-white px-4 py-4">
        <CredentialPill label="Username" value={info.username} />
        <CredentialPill label="Password" value={info.password} />
        <div className="pt-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#9aa0a6]">Share Message</p>
          <div className="relative overflow-hidden rounded-xl border border-[#c7d2fe] bg-[#eef2ff]">
            <div className="absolute left-2.5 top-2.5 z-10">
              <CopyButton text={message} label="Copy" variant="solid" tiny />
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #3730a3 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            <textarea readOnly value={message} rows={6}
              className="relative w-full resize-none bg-transparent px-4 pb-4 pt-11 text-[12.5px] leading-[1.75] text-[#3730a3] outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ShareResetModal ──────────────────────────────────────────────────────────

function ShareResetModal({ target, password, loading, onPasswordChange, onConfirm, onCancel }: {
  target: ShareResetTarget; password: string; loading: boolean;
  onPasswordChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { cardRef.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div ref={cardRef} tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Share2 size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Share Credentials</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#d97706]" />
            <div>
              <p className="text-[13px] font-semibold text-[#92400e]">Password will be reset</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#78350f]">
                This will immediately reset{' '}
                <span className="font-semibold">{target.username}</span>&apos;s password.
              </p>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[#5f6368]">New Password</label>
              <button type="button" onClick={() => onPasswordChange(generatePassword(6))}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]">
                <RefreshCw size={12} /><span>Regenerate</span>
              </button>
            </div>
            <input type="text" value={password} onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter or generate a password"
              className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 font-mono text-sm text-[#202124] outline-none transition-all placeholder:font-sans placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <button type="button" onClick={onCancel} disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6368] transition-colors hover:bg-[#e8eaed] disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={loading || !password.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1765cc] hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm & Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ReactivateModal ──────────────────────────────────────────────────────────

function ReactivateModal({ student, loading, onConfirm, onCancel }: {
  student: Student; loading: boolean;
  onConfirm: (activeFrom: string, activeTo: string) => void; onCancel: () => void;
}) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDatetime = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const [activeFrom, setActiveFrom] = useState(toLocalDatetime(now));
  const [activeTo, setActiveTo] = useState('');

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-[#137333] via-[#0d652d] to-[#0a5327] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RotateCcw size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Reactivate Account</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-[13px] text-[#5f6368]">
            Set a new active period for <span className="font-semibold text-[#202124]">{student.username}</span>.
          </p>
          <DateTimePicker label="Active From" value={activeFrom} onChange={setActiveFrom} disabled={loading} />
          <DateTimePicker label="Active Until (leave blank for no expiry)" value={activeTo} onChange={setActiveTo} disabled={loading} minDate={activeFrom} />
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <button type="button" onClick={onCancel} disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6368] transition-colors hover:bg-[#e8eaed] disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(activeFrom, activeTo)} disabled={loading || !activeFrom}
            className="inline-flex items-center gap-2 rounded-full bg-[#137333] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#0d652d] hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none">
            {loading && <Loader2 size={14} className="animate-spin" />}
            <RotateCcw size={13} />
            Reactivate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CustomVideoPickerModal ────────────────────────────────────────────────────

function CustomVideoPickerModal({ student, onSave, onCancel }: {
  student: Student;
  onSave: (videoIds: string[]) => void;
  onCancel: () => void;
}) {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [videosRes, customRes] = await Promise.all([
          fetch('/api/videos'),
          fetch(`/api/users/${student.id}/custom-videos`),
        ]);
        const videosData = await videosRes.json();
        const customData = await customRes.json();
        setAllVideos(videosData.videos || []);
        setSelectedIds(new Set(customData.videoIds || []));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [student.id]);

  const toggleVideo = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(Array.from(selectedIds));
    setSaving(false);
  };

  const filtered = allVideos.filter((v) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !saving && onCancel()}>
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="relative bg-linear-to-br from-[#6d28d9] to-[#4c1d95] px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Film size={16} className="text-white" />
              <div>
                <span className="text-[15px] font-semibold text-white">Custom Video Access</span>
                <p className="text-[11px] text-purple-200 mt-0.5">{student.username}</p>
              </div>
            </div>
            <button type="button" onClick={onCancel} disabled={saving} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2 shrink-0 border-b border-[#e8eaed]">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos…"
              className="w-full rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-4 text-sm text-[#202124] outline-none transition-all placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/20" />
          </div>
          <p className="mt-2 text-[11px] text-[#9aa0a6]">
            {selectedIds.size} of {allVideos.length} videos selected
          </p>
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#6d28d9]" size={22} /></div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#9aa0a6]">No videos found.</p>
          ) : (
            <div className="space-y-1.5 py-2">
              {filtered.map((video) => (
                <button key={video.id} type="button" onClick={() => toggleVideo(video.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                    selectedIds.has(video.id)
                      ? 'border-[#6d28d9]/30 bg-purple-50'
                      : 'border-[#e8eaed] bg-white hover:bg-[#f8f9fa]'
                  }`}>
                  {/* Checkbox */}
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    selectedIds.has(video.id) ? 'border-[#6d28d9] bg-[#6d28d9]' : 'border-[#dadce0] bg-white'
                  }`}>
                    {selectedIds.has(video.id) && <Check size={11} className="text-white" />}
                  </div>
                  {/* Thumbnail */}
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e8eaed] bg-[#202124]">
                    {video.cloudflareR2ThumbnailKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/videos/${video.id}/thumbnail`} alt={video.title} className="h-full w-full object-cover" />
                    ) : (
                      <Film size={10} className="text-[#9aa0a6] opacity-50" />
                    )}
                  </div>
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#202124]">{video.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {video.grade && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${GRADE_COLORS[video.grade]}`}>
                          {GRADE_LABELS[video.grade]}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        video.visibility === 'PUBLIC' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {video.visibility === 'PUBLIC' ? <Globe size={9} /> : <Lock size={9} />}
                        {video.visibility === 'PUBLIC' ? 'Public' : 'Grade'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4 shrink-0">
          <span className="text-[12px] text-[#5f6368]">{selectedIds.size} videos selected</span>
          <div className="flex gap-2.5">
            <button type="button" onClick={onCancel} disabled={saving}
              className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6368] transition-colors hover:bg-[#e8eaed] disabled:opacity-40">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[#6d28d9] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#c4c7cc]">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Access List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── UsernameInput ────────────────────────────────────────────────────────────

function UsernameInput({ prefix, suffix, disabled, onPrefixChange, onSuffixChange, onSuffixBulkSet }: {
  prefix: string; suffix: string[]; disabled: boolean;
  onPrefixChange: (v: string) => void;
  onSuffixChange: (i: number, v: string) => void;
  onSuffixBulkSet: (digits: string[]) => void;
}) {
  const digitRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const fieldBase = [
    'border border-[#dadce0] bg-white text-sm text-[#202124] outline-none transition-all',
    'placeholder:text-[#9aa0a6] hover:border-[#c4c7cc]',
    'focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20',
    'disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]',
  ].join(' ');

  const handleDigitChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    onSuffixChange(i, digit);
    if (digit && i < 3) digitRefs.current[i + 1]?.focus();
  };

  const handleDigitKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !suffix[i] && i > 0) digitRefs.current[i - 1]?.focus();
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); digitRefs.current[i - 1]?.focus(); }
    else if (e.key === 'ArrowRight' && i < 3) { e.preventDefault(); digitRefs.current[i + 1]?.focus(); }
  };

  const handleDigitPaste = (startIdx: number, e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    const updated = [...suffix];
    let lastIdx = startIdx;
    for (let j = 0; j < digits.length && startIdx + j < 4; j++) {
      updated[startIdx + j] = digits[j];
      lastIdx = startIdx + j;
    }
    onSuffixBulkSet(updated);
    requestAnimationFrame(() => { digitRefs.current[Math.min(lastIdx + 1, 3)]?.focus(); });
  };

  return (
    <div className="flex items-center w-full gap-1.5">
      <input type="text" value={prefix} onChange={(e) => onPrefixChange(e.target.value.replace(/[\s-]/g, ''))}
        disabled={disabled} placeholder="e.g. kamal"
        className={`min-w-0 flex-1 rounded-lg px-3.5 py-2.5 ${fieldBase}`} required />
      <span className="shrink-0 select-none text-sm font-semibold text-[#9aa0a6]">—</span>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <input key={i} ref={(el) => { digitRefs.current[i] = el; }} type="text" inputMode="numeric"
            maxLength={1} value={suffix[i]}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleDigitKeyDown(i, e)}
            onPaste={(e) => handleDigitPaste(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled} aria-label={`Student ID digit ${i + 1}`}
            className={`h-10 w-9 shrink-0 rounded-lg text-center font-mono font-bold ${fieldBase}`} />
        ))}
      </div>
    </div>
  );
}

// ─── AccountStatusBadge ────────────────────────────────────────────────────────

function AccountStatusBadge({ student }: { student: Student }) {
  const status = getAccountStatus(student);
  if (status === 'expired') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
      <ShieldAlert size={9} /> Expired
    </span>
  );
  if (status === 'not_yet') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
      <Clock size={9} /> Not Yet Active
    </span>
  );
  if (status === 'no_expiry') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[10px] font-semibold text-[#1a73e8]">
      <Globe size={9} /> No Expiry
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      <Check size={9} /> Active
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersAdminPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form
  const [newUsernamePrefix, setNewUsernamePrefix] = useState('');
  const [newUsernameSuffix, setNewUsernameSuffix] = useState<string[]>(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [newGrade, setNewGrade] = useState<Grade | ''>('');
  const [newAccessMode, setNewAccessMode] = useState<AccessMode>('GRADE');
  const [newActiveFrom, setNewActiveFrom] = useState('');
  const [newActiveTo, setNewActiveTo] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline reset
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Share credentials card
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // Share-reset modal
  const [shareResetTarget, setShareResetTarget] = useState<ShareResetTarget | null>(null);
  const [shareResetPassword, setShareResetPassword] = useState('');
  const [shareResetLoading, setShareResetLoading] = useState(false);

  // Reactivate modal
  const [reactivateTarget, setReactivateTarget] = useState<Student | null>(null);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  // Custom video picker modal
  const [customVideoTarget, setCustomVideoTarget] = useState<Student | null>(null);

  // Table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | ''>('');
  const [showExpired, setShowExpired] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────

  const computedUsername =
    newUsernamePrefix && newUsernameSuffix.every((d) => d)
      ? `${newUsernamePrefix}-${newUsernameSuffix.join('')}`
      : '';

  const activeStudents = students.filter((s) => !isExpiredOrInactive(s));
  const expiredStudents = students.filter((s) => isExpiredOrInactive(s));

  const filterStudents = (list: Student[]) =>
    list.filter((s) => {
      const matchSearch = s.username.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchGrade = gradeFilter ? s.grade === gradeFilter : true;
      return matchSearch && matchGrade;
    });

  const filteredActive = filterStudents(activeStudents);
  const filteredExpired = filterStudents(expiredStudents);

  // ── API calls ─────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) setStudents(data.students);
      else setError(data.error || 'Failed to fetch student list');
    } catch {
      setError('Connection error fetching student list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 5000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = newUsernamePrefix.trim();
    const suffix = newUsernameSuffix.join('');
    const password = newPassword.trim();
    if (!prefix) { setError('Username prefix is required'); return; }
    if (!/^\d{4}$/.test(suffix)) { setError('Please fill in all 4 student ID digits'); return; }
    if (!password) { setError('Password is required'); return; }

    const username = `${prefix}-${suffix}`;
    setCreating(true); setError(''); setSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username, password,
          grade: newGrade || null,
          activeFrom: newActiveFrom || null,
          activeTo: newActiveTo || null,
          accessMode: newAccessMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Student account '${username}' created successfully.`);
        setShareInfo({ username, password });
        setNewUsernamePrefix(''); setNewUsernameSuffix(['', '', '', '']); setNewPassword('');
        setNewGrade(''); setNewActiveFrom(''); setNewActiveTo(''); setNewAccessMode('GRADE');
        fetchStudents();
      } else {
        setError(data.error || 'Failed to create student account');
      }
    } catch {
      setError('Connection error creating student');
    } finally {
      setCreating(false);
    }
  };

  const handleInlineReset = async (studentId: string) => {
    const password = resetPassword.trim();
    if (!password) { alert('Please enter a new password'); return; }
    try {
      const res = await fetch(`/api/users/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { setSuccess('Password updated successfully.'); setResetPassword(''); setResettingId(null); }
      else { const data = await res.json(); alert(data.error || 'Failed to reset password'); }
    } catch { alert('Error updating password'); }
  };

  const handleOpenShareReset = (student: Student) => {
    setShareResetTarget({ id: student.id, username: student.username });
    setShareResetPassword(generatePassword(6));
  };

  const handleConfirmShareReset = async () => {
    if (!shareResetTarget) return;
    const password = shareResetPassword.trim();
    if (!password) return;
    setShareResetLoading(true); setError('');
    try {
      const res = await fetch(`/api/users/${shareResetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setShareInfo({ username: shareResetTarget.username, password });
        setSuccess(`Credentials for '${shareResetTarget.username}' ready to share.`);
        setShareResetTarget(null); setShareResetPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
        setShareResetTarget(null);
      }
    } catch { setError('Connection error resetting password'); setShareResetTarget(null); }
    finally { setShareResetLoading(false); }
  };

  const handleReactivate = async (activeFrom: string, activeTo: string) => {
    if (!reactivateTarget) return;
    setReactivateLoading(true);
    try {
      const res = await fetch(`/api/users/${reactivateTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeFrom: activeFrom || null,
          activeTo: activeTo || null,
        }),
      });
      if (res.ok) {
        setSuccess(`Account '${reactivateTarget.username}' reactivated.`);
        setReactivateTarget(null);
        fetchStudents();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reactivate account');
        setReactivateTarget(null);
      }
    } catch { setError('Connection error reactivating account'); setReactivateTarget(null); }
    finally { setReactivateLoading(false); }
  };

  const handleSaveCustomVideos = async (videoIds: string[]) => {
    if (!customVideoTarget) return;
    try {
      const res = await fetch(`/api/users/${customVideoTarget.id}/custom-videos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
      });
      if (res.ok) {
        setSuccess(`Custom video list updated for '${customVideoTarget.username}'.`);
        setCustomVideoTarget(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save custom video list');
        setCustomVideoTarget(null);
      }
    } catch { setError('Connection error saving custom video list'); setCustomVideoTarget(null); }
  };

  const handleDeleteStudent = async (studentId: string, username: string) => {
    if (!confirm(`Delete student account: ${username}?`)) return;
    try {
      const res = await fetch(`/api/users/${studentId}`, { method: 'DELETE' });
      if (res.ok) { setSuccess(`Student account '${username}' deleted.`); fetchStudents(); }
      else { const data = await res.json(); alert(data.error || 'Failed to delete student'); }
    } catch { alert('Connection error deleting student'); }
  };

  // ─── Student Row ──────────────────────────────────────────────────────────

  const renderStudentRow = (student: Student) => (
    <tr key={student.id} className="transition-colors duration-100 hover:bg-[#f8f9fa]">
      {/* Username */}
      <td className="py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-xs font-medium text-[#1a73e8]">
            {student.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="block font-mono text-[13px] font-medium text-[#202124] truncate">{student.username}</span>
            <span className="block text-[11px] text-[#9aa0a6]">
              {student.accessMode === 'CUSTOM' ? (
                <span className="inline-flex items-center gap-0.5 text-purple-600"><Lock size={9} /> Custom</span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[#5f6368]"><BookOpen size={9} /> Grade</span>
              )}
            </span>
          </div>
        </div>
      </td>
      {/* Grade */}
      <td className="py-3.5">
        {student.grade ? (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${GRADE_COLORS[student.grade]}`}>
            {GRADE_LABELS[student.grade]}
          </span>
        ) : (
          <span className="text-[11px] text-[#9aa0a6]">—</span>
        )}
      </td>
      {/* Status */}
      <td className="py-3.5">
        <div className="space-y-1">
          <AccountStatusBadge student={student} />
          {student.activeTo && (
            <p className="text-[10px] text-[#9aa0a6] flex items-center gap-0.5">
              <Calendar size={8} /> Until {formatDate(student.activeTo)}
            </p>
          )}
        </div>
      </td>
      {/* Registered */}
      <td className="py-3.5 text-[#5f6368] text-[12px]">
        {new Date(student.createdAt).toLocaleDateString()}
      </td>
      {/* Actions */}
      <td className="py-3.5 text-right">
        {resettingId === student.id ? (
          <div className="inline-flex items-center gap-1.5">
            <input type="text" placeholder="New password" value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-28 rounded-md border border-[#dadce0] px-2.5 py-1.5 font-mono text-xs outline-none transition-colors focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20" />
            <button type="button" onClick={() => setResetPassword(generatePassword(6))} title="Generate"
              className="rounded-full p-1.5 text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]">
              <RefreshCw size={13} />
            </button>
            <button type="button" onClick={() => handleInlineReset(student.id)}
              className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1765cc]">
              Save
            </button>
            <button type="button" onClick={() => { setResettingId(null); setResetPassword(''); }}
              className="rounded-full px-2.5 py-1.5 text-xs font-medium text-[#5f6368] transition-colors hover:bg-[#f1f3f4]">
              Cancel
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1">
            {student.accessMode === 'CUSTOM' && (
              <button type="button" onClick={() => setCustomVideoTarget(student)} title="Manage Videos"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-50">
                <Film size={13} /><span>Videos</span>
              </button>
            )}
            <button type="button" onClick={() => handleOpenShareReset(student)} title="Share Credentials"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#137333] transition-colors hover:bg-[#e6f4ea]">
              <Share2 size={13} /><span>Share</span>
            </button>
            <button type="button" onClick={() => { setResettingId(student.id); setResetPassword(''); }} title="Reset Password"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]">
              <Key size={13} /><span>Reset</span>
            </button>
            <button type="button" onClick={() => handleDeleteStudent(student.id, student.username)} title="Delete Student"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#d93025] transition-colors hover:bg-[#fce8e6]">
              <Trash size={13} /><span>Delete</span>
            </button>
          </div>
        )}
      </td>
    </tr>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Modals */}
      {shareResetTarget && (
        <ShareResetModal target={shareResetTarget} password={shareResetPassword}
          loading={shareResetLoading} onPasswordChange={setShareResetPassword}
          onConfirm={handleConfirmShareReset}
          onCancel={() => { setShareResetTarget(null); setShareResetPassword(''); }} />
      )}
      {reactivateTarget && (
        <ReactivateModal student={reactivateTarget} loading={reactivateLoading}
          onConfirm={handleReactivate}
          onCancel={() => setReactivateTarget(null)} />
      )}
      {customVideoTarget && (
        <CustomVideoPickerModal student={customVideoTarget}
          onSave={handleSaveCustomVideos}
          onCancel={() => setCustomVideoTarget(null)} />
      )}

      <div className="min-h-100vh bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">Student Accounts</h1>
            <p className="mt-1 text-sm text-[#5f6368]">Create, manage, and remove student login accounts</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-6">
            {/* ── Left panel: Create ─────────────────────────────────────── */}
            <div className="h-fit w-full min-w-0 rounded-2xl bg-white p-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] lg:col-span-2">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe]">
                  <UserPlus size={17} className="text-[#1a73e8]" />
                </div>
                <h2 className="text-[15px] font-medium text-[#202124]">Create Student Account</h2>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>
              )}
              {success && (
                <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-4">
                {/* Username */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#5f6368]">Username</label>
                    <CopyButton text={computedUsername} label="Copy" />
                  </div>
                  <UsernameInput prefix={newUsernamePrefix} suffix={newUsernameSuffix} disabled={creating}
                    onPrefixChange={setNewUsernamePrefix}
                    onSuffixChange={(i, v) => setNewUsernameSuffix((prev) => prev.map((d, idx) => (idx === i ? v : d)))}
                    onSuffixBulkSet={setNewUsernameSuffix} />
                  <p className="mt-1 text-[11px] text-[#9aa0a6]">Format: <span className="font-mono">username-XXXX</span></p>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#5f6368]">Password</label>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setNewPassword(generatePassword(6))} disabled={creating}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-40">
                        <RefreshCw size={12} /><span>Generate</span>
                      </button>
                      <CopyButton text={newPassword} label="Copy" />
                    </div>
                  </div>
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    disabled={creating} placeholder="Initial password"
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
                    required />
                </div>

                {/* Grade */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
                  <div className="relative">
                    <select value={newGrade} onChange={(e) => setNewGrade(e.target.value as Grade | '')} disabled={creating}
                      className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4]">
                      <option value="">— Select grade —</option>
                      {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                  </div>
                </div>

                {/* Access Mode */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Access Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['GRADE', 'CUSTOM'] as AccessMode[]).map((mode) => (
                      <button key={mode} type="button" onClick={() => setNewAccessMode(mode)} disabled={creating}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                          newAccessMode === mode
                            ? mode === 'CUSTOM'
                              ? 'border-purple-300 bg-purple-50 text-purple-700'
                              : 'border-[#1a73e8]/30 bg-[#e8f0fe] text-[#1a73e8]'
                            : 'border-[#e8eaed] bg-white text-[#5f6368] hover:bg-[#f8f9fa]'
                        }`}>
                        {mode === 'CUSTOM' ? <Lock size={12} /> : <BookOpen size={12} />}
                        {mode === 'CUSTOM' ? 'Custom' : 'Grade'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-[#9aa0a6]">
                    {newAccessMode === 'CUSTOM' ? 'Manually pick which videos this student can access.' : 'Student sees videos matching their grade.'}
                  </p>
                </div>

                {/* Active Period */}
                <div className="space-y-2 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#5f6368]">
                    <Clock size={11} /> Account Validity
                  </p>
                  <DateTimePicker label="Active From (blank = immediate)" value={newActiveFrom} onChange={setNewActiveFrom} disabled={creating} />
                  <DateTimePicker label="Active Until (blank = no expiry)" value={newActiveTo} onChange={setNewActiveTo} disabled={creating} minDate={newActiveFrom} />
                </div>

                <button type="submit" disabled={creating}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1765cc] hover:shadow-md active:bg-[#185abc] disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none">
                  {creating ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /><span>Create Student</span></>}
                </button>
              </form>

              {shareInfo && <ShareCredentialsCard info={shareInfo} onDismiss={() => setShareInfo(null)} />}
            </div>

            {/* ── Right panel: Students list ─────────────────────────────── */}
            <div className="flex flex-col gap-6 w-full min-w-0 lg:col-span-4">
              {/* Filters row */}
              <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[15px] font-medium text-[#202124]">Existing Student Accounts</h2>
                    {!loading && students.length > 0 && (
                      <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                        {students.length} total
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Grade filter */}
                    <div className="relative">
                      <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value as Grade | '')}
                        className="appearance-none rounded-full border border-[#dadce0] bg-white py-2 pl-3 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20">
                        <option value="">All Grades</option>
                        {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6368]" />
                    </div>
                    {/* Search */}
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search students…"
                        className="w-48 rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-8 text-sm text-[#202124] outline-none transition-all placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20" />
                      {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] transition-colors hover:text-[#202124]">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active students table */}
              <div className="rounded-2xl w-full min-w-0 bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
                {loading ? (
                  <div className="flex justify-center py-14"><Loader2 className="animate-spin text-[#1a73e8]" size={26} /></div>
                ) : activeStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                      <UserPlus size={20} className="text-[#9aa0a6]" />
                    </div>
                    <p className="text-sm text-[#5f6368]">No active student accounts.</p>
                  </div>
                ) : filteredActive.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                      <Search size={18} className="text-[#9aa0a6]" />
                    </div>
                    <p className="text-sm text-[#5f6368]">No students match your filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto p-4">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#e8eaed]">
                          <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Username</th>
                          <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade</th>
                          <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Status</th>
                          <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Registered</th>
                          <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f3f4]">
                        {filteredActive.map(renderStudentRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Expired / inactive accounts section */}
              {expiredStudents.length > 0 && (
                <div className="rounded-2xl w-full min-w-0 bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] overflow-hidden">
                  <button type="button"
                    onClick={() => setShowExpired((v) => !v)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#f8f9fa] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                        <ShieldAlert size={15} className="text-red-500" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#202124]">Expired / Inactive Accounts</p>
                        <p className="text-[11px] text-[#9aa0a6]">{expiredStudents.length} account{expiredStudents.length !== 1 ? 's' : ''} need reactivation</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`text-[#5f6368] transition-transform duration-200 ${showExpired ? 'rotate-180' : ''}`} />
                  </button>

                  {showExpired && (
                    filteredExpired.length === 0 ? (
                      <div className="px-6 pb-6 text-sm text-[#9aa0a6]">No expired accounts match your filters.</div>
                    ) : (
                      <div className="overflow-x-auto px-4 pb-4">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-[#e8eaed]">
                              <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Username</th>
                              <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Grade</th>
                              <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Status</th>
                              <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Expired On</th>
                              <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f1f3f4]">
                            {filteredExpired.map((student) => (
                              <tr key={student.id} className="transition-colors duration-100 hover:bg-[#fce8e6]/30">
                                <td className="py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-medium text-red-500">
                                      {student.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-mono text-[13px] font-medium text-[#202124]">{student.username}</span>
                                  </div>
                                </td>
                                <td className="py-3.5">
                                  {student.grade ? (
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${GRADE_COLORS[student.grade]}`}>
                                      {GRADE_LABELS[student.grade]}
                                    </span>
                                  ) : <span className="text-[11px] text-[#9aa0a6]">—</span>}
                                </td>
                                <td className="py-3.5"><AccountStatusBadge student={student} /></td>
                                <td className="py-3.5 text-[12px] text-[#9aa0a6]">{formatDate(student.activeTo)}</td>
                                <td className="py-3.5 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button type="button" onClick={() => setReactivateTarget(student)}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-3 py-1.5 text-xs font-medium text-[#137333] transition-colors hover:bg-[#ceead6]">
                                      <RotateCcw size={13} /><span>Reactivate</span>
                                    </button>
                                    <button type="button" onClick={() => handleDeleteStudent(student.id, student.username)}
                                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#d93025] transition-colors hover:bg-[#fce8e6]">
                                      <Trash size={13} /><span>Delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
