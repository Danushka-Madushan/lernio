'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash,
  Key,
  Loader2,
  UserPlus,
  Copy,
  Check,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

interface Student {
  id: string;
  username: string;
  createdAt: string;
}

interface ShareInfo {
  username: string;
  password: string;
}

// ---------- Helpers ----------

/** Cryptographically-strong random index in [0, max). */
function secureRandomInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

/**
 * Generates a random password containing uppercase, lowercase and numeric
 * characters. Guarantees at least one of each class, then fills the rest
 * and shuffles (Fisher-Yates) so the guaranteed characters aren't always
 * in the same position.
 */
function generatePassword(length = 6): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const all = upper + lower + digits;

  const required = [
    upper[secureRandomInt(upper.length)],
    lower[secureRandomInt(lower.length)],
    digits[secureRandomInt(digits.length)],
  ];

  const remaining = Math.max(length - required.length, 0);
  const rest = Array.from({ length: remaining }, () => all[secureRandomInt(all.length)]);

  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.slice(0, length).join('');
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

function buildShareMessage(username: string, password: string): string {
  return `Hi, this is your Lernio logins\n\nUsername: ${username}\nPassword: ${password}\n\nIf not working please contact\n+94 70 700 8041`;
}

// ---------- Small reusable components ----------

function CopyIconButton({
  text,
  label,
  variant = 'ghost',
}: {
  text: string;
  label?: string;
  variant?: 'ghost' | 'solid';
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const base =
    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const styles =
    variant === 'solid'
      ? 'bg-[#1a73e8] text-white hover:bg-[#1765cc]'
      : 'text-[#1a73e8] hover:bg-[#e8f0fe]';

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className={`${base} ${styles}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
}

function ShareCredentialsCard({
  info,
  onDismiss,
}: {
  info: ShareInfo;
  onDismiss: () => void;
}) {
  const message = buildShareMessage(info.username, info.password);

  return (
    <div className="mt-5 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[#5f6368]">
          Ready to share
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-[#9aa0a6] transition-colors hover:bg-[#e8eaed] hover:text-[#202124]"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[#dadce0] bg-white px-3 py-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-[#9aa0a6]">Username</div>
          <div className="truncate text-sm font-medium text-[#202124]">{info.username}</div>
        </div>
        <CopyIconButton text={info.username} label="Copy" />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-[#dadce0] bg-white px-3 py-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-[#9aa0a6]">Password</div>
          <div className="truncate text-sm font-medium text-[#202124]">{info.password}</div>
        </div>
        <CopyIconButton text={info.password} label="Copy" />
      </div>

      <div className="relative">
        <div className="absolute left-2 top-2 z-10">
          <CopyIconButton text={message} label="Copy" variant="solid" />
        </div>
        <textarea
          readOnly
          value={message}
          rows={6}
          className="w-full resize-none rounded-lg border border-[#dadce0] bg-white px-3 pb-3 pt-11 text-[13px] leading-5 text-[#202124] outline-none"
        />
      </div>
    </div>
  );
}

// ---------- Main page ----------

export default function UsersAdminPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create-student form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Reset-password state
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  // Shareable credentials (populated after a successful create or reset)
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // List search/filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students);
      } else {
        setError(data.error || 'Failed to fetch student list');
      }
    } catch (err) {
      setError('Connection error fetching student list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim();
    const password = newPassword.trim();

    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

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
        setNewUsername('');
        setNewPassword('');
        fetchStudents();
      } else {
        setError(data.error || 'Failed to create student account');
      }
    } catch (err) {
      setError('Connection error creating student');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (studentId: string, username: string) => {
    const password = resetPassword.trim();
    if (!password) {
      alert('Please enter or generate a new password');
      return;
    }

    try {
      const res = await fetch(`/api/users/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setSuccess(`Password updated for '${username}'.`);
        setShareInfo({ username, password });
        setResetPassword('');
        setResettingId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reset password');
      }
    } catch (err) {
      alert('Error updating password');
    }
  };

  const handleDeleteStudent = async (studentId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete the student account: ${username}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${studentId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Student account '${username}' deleted.`);
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete student');
      }
    } catch (err) {
      alert('Connection error deleting student');
    }
  };

  const filteredStudents = students.filter((s) =>
    s.username.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
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
          {/* Left panel: Add Student */}
          <div className="h-fit rounded-2xl bg-white p-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] lg:col-span-1">
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe]">
                <UserPlus size={17} className="text-[#1a73e8]" />
              </div>
              <h2 className="text-[15px] font-medium text-[#202124]">
                Create Student Account
              </h2>
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
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#5f6368]" htmlFor="username">
                    Username
                  </label>
                  <CopyIconButton text={newUsername} label="Copy" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={creating}
                  placeholder="e.g. madushan6"
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all duration-150 placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
                  required
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-medium text-[#5f6368]" htmlFor="password">
                    Password
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewPassword(generatePassword(8))}
                      disabled={creating}
                      title="Auto-generate password"
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RefreshCw size={13} />
                      <span>Generate</span>
                    </button>
                    <CopyIconButton text={newPassword} label="Copy" />
                  </div>
                </div>
                <input
                  id="password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={creating}
                  placeholder="Initial password"
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all duration-150 placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
                  required
                />
                <p className="mt-1 text-[11px] text-[#9aa0a6]">
                  6 characters — uppercase, lowercase & numbers. Auto-generate or type your own.
                </p>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md active:bg-[#185abc] disabled:cursor-not-allowed disabled:bg-[#c4c7cc] disabled:shadow-none"
              >
                {creating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Create Student</span>
                  </>
                )}
              </button>
            </form>

            {shareInfo && (
              <ShareCredentialsCard info={shareInfo} onDismiss={() => setShareInfo(null)} />
            )}
          </div>

          {/* Right panel: Students list */}
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

              <div className="relative w-full sm:w-64">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-8 text-sm text-[#202124] outline-none transition-all duration-150 placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#202124]"
                    aria-label="Clear search"
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
                      <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Username
                      </th>
                      <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Registered On
                      </th>
                      <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                        Actions
                      </th>
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
                            <span className="font-medium text-[#202124]">
                              {student.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 text-[#5f6368]">
                          {new Date(student.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 text-right">
                          {resettingId === student.id ? (
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="New password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                className="w-32 rounded-md border border-[#dadce0] px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
                              />
                              <button
                                onClick={() => setResetPassword(generatePassword(8))}
                                title="Auto-generate password"
                                className="inline-flex items-center rounded-full p-1.5 text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]"
                              >
                                <RefreshCw size={13} />
                              </button>
                              <button
                                onClick={() => handleResetPassword(student.id, student.username)}
                                className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1765cc]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setResettingId(null);
                                  setResetPassword('');
                                }}
                                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-[#5f6368] transition-colors hover:bg-[#f1f3f4]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setResettingId(student.id);
                                  setResetPassword('');
                                }}
                                title="Reset Password"
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe]"
                              >
                                <Key size={13} />
                                <span>Reset</span>
                              </button>
                              <button
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
  );
}
