'use client';

import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  username: string;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secureRandInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/** 6-char password guaranteed to contain ≥1 uppercase, ≥1 lowercase, ≥1 digit. */
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

  // Fisher-Yates shuffle
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
  } catch { /* fallthrough to legacy */ }
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

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({
  text,
  label,
  variant = 'ghost',
  tiny = false,
}: {
  text: string;
  label?: string;
  variant?: 'ghost' | 'solid';
  tiny?: boolean;
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
    <button
      type="button"
      disabled={!text}
      onClick={handle}
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium transition-all disabled:opacity-40',
        tiny ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        variant === 'solid'
          ? 'bg-[#1a73e8] text-white shadow-sm hover:bg-[#1765cc]'
          : 'text-[#1a73e8] hover:bg-[#e8f0fe]',
      ].join(' ')}
    >
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
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#9aa0a6]">
          {label}
        </p>
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
      {/* Header gradient */}
      <div className="relative bg-linear-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] px-4 py-4">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 right-10 h-14 w-14 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Key size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-white">
                Student Credentials
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-blue-200">
                Ready to share · {info.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Credentials body */}
      <div className="space-y-2 bg-white px-4 py-4">
        <CredentialPill label="Username" value={info.username} />
        <CredentialPill label="Password" value={info.password} />

        {/* Share message */}
        <div className="pt-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#9aa0a6]">
            Share Message
          </p>
          {/* Indigo-tinted message area */}
          <div className="relative overflow-hidden rounded-xl border border-[#c7d2fe] bg-[#eef2ff]">
            {/* Top-left copy button, relatively placed inside the box */}
            <div className="absolute left-2.5 top-2.5 z-10">
              <CopyButton text={message} label="Copy" variant="solid" tiny />
            </div>
            {/* Subtle dot pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #3730a3 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            <textarea
              readOnly
              value={message}
              rows={6}
              className="relative w-full resize-none bg-transparent px-4 pb-4 pt-11 text-[12.5px] leading-[1.75] text-[#3730a3] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ShareResetModal ──────────────────────────────────────────────────────────

function ShareResetModal({
  target,
  password,
  loading,
  onPasswordChange,
  onConfirm,
  onCancel,
}: {
  target: ShareResetTarget;
  password: string;
  loading: boolean;
  onPasswordChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => { cardRef.current?.focus(); }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10"
      >
        {/* Header */}
        <div className="relative bg-linear-to-br from-[#1a73e8] via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Share2 size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Share Credentials</span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* Warning */}
          <div className="flex gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#d97706]" />
            <div>
              <p className="text-[13px] font-semibold text-[#92400e]">Password will be reset</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#78350f]">
                This will immediately reset{' '}
                <span className="font-semibold">{target.username}</span>'s password to the value
                below. Their current password will stop working.
              </p>
            </div>
          </div>

          {/* New password field */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[#5f6368]">New Password</label>
              <button
                type="button"
                onClick={() => onPasswordChange(generatePassword(6))}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]"
              >
                <RefreshCw size={12} />
                <span>Regenerate</span>
              </button>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter or generate a password"
              className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 font-mono text-sm text-[#202124] outline-none transition-all placeholder:font-sans placeholder:text-[#9aa0a6] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-full px-4 py-2 text-sm font-medium text-[#5f6368] transition-colors hover:bg-[#e8eaed] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !password.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[#1a73e8] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1765cc] hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Confirm & Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UsernameInput ────────────────────────────────────────────────────────────

function UsernameInput({
  prefix,
  suffix,
  disabled,
  onPrefixChange,
  onSuffixChange,
  onSuffixBulkSet,
}: {
  prefix: string;
  suffix: string[];
  disabled: boolean;
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
    if (e.key === 'Backspace' && !suffix[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      digitRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 3) {
      e.preventDefault();
      digitRefs.current[i + 1]?.focus();
    }
  };

  // Paste: build full array in one shot to avoid stale state across updates
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
    requestAnimationFrame(() => {
      digitRefs.current[Math.min(lastIdx + 1, 3)]?.focus();
    });
  };

  return (
    <div className="flex items-center w-80 gap-1.5">
      {/* Long prefix bar */}
      <input
        type="text"
        value={prefix}
        onChange={(e) => onPrefixChange(e.target.value.replace(/[\s-]/g, ''))}
        disabled={disabled}
        placeholder="e.g. madushan"
        className={`min-w-0 flex-1 rounded-lg px-3.5 py-2.5 ${fieldBase}`}
        required
      />
      {/* Separator */}
      <span className="shrink-0 select-none text-sm font-semibold text-[#9aa0a6]">—</span>
      {/* 4 digit boxes */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            ref={(el) => { digitRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={suffix[i]}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleDigitKeyDown(i, e)}
            onPaste={(e) => handleDigitPaste(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            aria-label={`Student ID digit ${i + 1}`}
            className={`h-10 w-9 shrink-0 rounded-lg text-center font-mono font-bold ${fieldBase}`}
          />
        ))}
      </div>
    </div>
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
  const [creating, setCreating] = useState(false);

  // Inline reset (silent — no share card)
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Share credentials card (appears after create or share-reset)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // Share-reset modal for existing students
  const [shareResetTarget, setShareResetTarget] = useState<ShareResetTarget | null>(null);
  const [shareResetPassword, setShareResetPassword] = useState('');
  const [shareResetLoading, setShareResetLoading] = useState(false);

  // Table search filter
  const [searchQuery, setSearchQuery] = useState('');

  // ── Derived ──────────────────────────────────────────────────────────────
  const computedUsername =
    newUsernamePrefix && newUsernameSuffix.every((d) => d)
      ? `${newUsernamePrefix}-${newUsernameSuffix.join('')}`
      : '';

  const filteredStudents = students.filter((s) =>
    s.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  // ── API calls ─────────────────────────────────────────────────────────────
  const fetchStudents = async () => {
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
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = newUsernamePrefix.trim();
    const suffix = newUsernameSuffix.join('');
    const password = newPassword.trim();

    if (!prefix) { setError('Username prefix is required'); return; }
    if (!/^\d{4}$/.test(suffix)) { setError('Please fill in all 4 student ID digits'); return; }
    if (!password) { setError('Password is required'); return; }

    const username = `${prefix}-${suffix}`;
    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(`Student account '${username}' created successfully.`);
        setShareInfo({ username, password });
        setNewUsernamePrefix('');
        setNewUsernameSuffix(['', '', '', '']);
        setNewPassword('');
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
      if (res.ok) {
        setSuccess('Password updated successfully.');
        setResetPassword('');
        setResettingId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reset password');
      }
    } catch {
      alert('Error updating password');
    }
  };

  const handleOpenShareReset = (student: Student) => {
    setShareResetTarget({ id: student.id, username: student.username });
    setShareResetPassword(generatePassword(6));
  };

  const handleConfirmShareReset = async () => {
    if (!shareResetTarget) return;
    const password = shareResetPassword.trim();
    if (!password) return;

    setShareResetLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${shareResetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setShareInfo({ username: shareResetTarget.username, password });
        setSuccess(`Credentials for '${shareResetTarget.username}' ready to share.`);
        setShareResetTarget(null);
        setShareResetPassword('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
        setShareResetTarget(null);
      }
    } catch {
      setError('Connection error resetting password');
      setShareResetTarget(null);
    } finally {
      setShareResetLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, username: string) => {
    if (!confirm(`Delete student account: ${username}?`)) return;

    try {
      const res = await fetch(`/api/users/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Student account '${username}' deleted.`);
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete student');
      }
    } catch {
      alert('Connection error deleting student');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {shareResetTarget && (
        <ShareResetModal
          target={shareResetTarget}
          password={shareResetPassword}
          loading={shareResetLoading}
          onPasswordChange={setShareResetPassword}
          onConfirm={handleConfirmShareReset}
          onCancel={() => { setShareResetTarget(null); setShareResetPassword(''); }}
        />
      )}

      <div className="min-h-100vh bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">
              Student Accounts
            </h1>
            <p className="mt-1 text-sm text-[#5f6368]">
              Create, manage, and remove student login accounts
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ── Left panel: Create ─────────────────────────────────────── */}
            <div className="h-fit rounded-2xl w-fit bg-white p-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] lg:col-span-1">
              <div className="mb-5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe]">
                  <UserPlus size={17} className="text-[#1a73e8]" />
                </div>
                <h2 className="text-[15px] font-medium text-[#202124]">Create Student Account</h2>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">
                  {success}
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-4">
                {/* Username */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#5f6368]">Username</label>
                    <CopyButton text={computedUsername} label="Copy" />
                  </div>
                  <UsernameInput
                    prefix={newUsernamePrefix}
                    suffix={newUsernameSuffix}
                    disabled={creating}
                    onPrefixChange={setNewUsernamePrefix}
                    onSuffixChange={(i, v) =>
                      setNewUsernameSuffix((prev) => prev.map((d, idx) => (idx === i ? v : d)))
                    }
                    onSuffixBulkSet={setNewUsernameSuffix}
                  />
                  <p className="mt-1 text-[11px] text-[#9aa0a6]">
                    Format: <span className="font-mono">username-XXXX</span> (last 4 digits are the student ID)
                  </p>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-[#5f6368]">Password</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNewPassword(generatePassword(6))}
                        disabled={creating}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RefreshCw size={12} />
                        <span>Generate</span>
                      </button>
                      <CopyButton text={newPassword} label="Copy" />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={creating}
                    placeholder="Initial password"
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
                    required
                  />
                  <p className="mt-1 text-[11px] text-[#9aa0a6]">
                    6 chars — uppercase, lowercase & digits.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1765cc] hover:shadow-md active:bg-[#185abc] disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none"
                >
                  {creating ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <><Plus size={16} /><span>Create Student</span></>
                  )}
                </button>
              </form>

              {shareInfo && (
                <ShareCredentialsCard info={shareInfo} onDismiss={() => setShareInfo(null)} />
              )}
            </div>

            {/* ── Right panel: Students list ─────────────────────────────── */}
            <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] lg:col-span-2">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-medium text-[#202124]">
                    Existing Student Accounts
                  </h2>
                  {!loading && students.length > 0 && (
                    <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                      {students.length} total
                    </span>
                  )}
                </div>

                {/* Search bar */}
                <div className="relative w-full sm:w-64">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students…"
                    className="w-full rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-8 text-sm text-[#202124] outline-none transition-all placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] transition-colors hover:text-[#202124]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-14">
                  <Loader2 className="animate-spin text-[#1a73e8]" size={26} />
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                    <UserPlus size={20} className="text-[#9aa0a6]" />
                  </div>
                  <p className="text-sm text-[#5f6368]">No student accounts registered yet.</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                    <Search size={18} className="text-[#9aa0a6]" />
                  </div>
                  <p className="text-sm text-[#5f6368]">
                    No students match &ldquo;{searchQuery}&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e8eaed]">
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Username</th>
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">Registered On</th>
                        <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f4]">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="transition-colors duration-100 hover:bg-[#f8f9fa]"
                        >
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f0fe] text-xs font-medium text-[#1a73e8]">
                                {student.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-mono text-[13px] font-medium text-[#202124]">
                                {student.username}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-[#5f6368]">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 text-right">
                            {resettingId === student.id ? (
                              /* Inline reset mode */
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="New password"
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  className="w-28 rounded-md border border-[#dadce0] px-2.5 py-1.5 font-mono text-xs outline-none transition-colors focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => setResetPassword(generatePassword(6))}
                                  title="Generate"
                                  className="rounded-full p-1.5 text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]"
                                >
                                  <RefreshCw size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleInlineReset(student.id)}
                                  className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1765cc]"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setResettingId(null); setResetPassword(''); }}
                                  className="rounded-full px-2.5 py-1.5 text-xs font-medium text-[#5f6368] transition-colors hover:bg-[#f1f3f4]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              /* Default actions */
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenShareReset(student)}
                                  title="Share Credentials"
                                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#137333] transition-colors hover:bg-[#e6f4ea]"
                                >
                                  <Share2 size={13} />
                                  <span>Share</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setResettingId(student.id); setResetPassword(''); }}
                                  title="Reset Password"
                                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]"
                                >
                                  <Key size={13} />
                                  <span>Reset</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStudent(student.id, student.username)}
                                  title="Delete Student"
                                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#d93025] transition-colors hover:bg-[#fce8e6]"
                                >
                                  <Trash size={13} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
