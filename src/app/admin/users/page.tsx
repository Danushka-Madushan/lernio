'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Check,
  Key,
  Loader2,
  Search,
  Share2,
  Trash,
  UserPlus,
  X,
  Film,
  ChevronDown,
  BookOpen,
  Lock,
  ShieldAlert,
  Calendar,
} from 'lucide-react';
import { Button } from '@heroui/react';
import { Grade } from '@/lib/db';
import { GRADE_COLORS, GRADE_LABELS } from '@/lib/constants';
import ShareCredentialsCard from '@/components/ShareCredentialsCard';
import ShareResetModal from '@/components/ShareResetModal';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import AccountDeleteConfirmModal from '@/components/AccountDeleteConfirmModal';
import EditStudentModal from '@/components/EditStudentModal';
import CustomVideoPickerModal from '@/components/CustomVideoPickerModal';
import AddStudentModal from '@/components/AddStudentModal';
import StatCard from '@/components/StatCard';
import { generatePassword, getAccountStatus, triggerUnauthorized } from '@/lib/utils';
import AccountStatusBadge from '@/components/AccountStatusBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const isExpiredOrInactive = (student: Student): boolean => {
  const status = getAccountStatus(student);
  return status === 'expired' || status === 'not_yet';
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


// ─── Main Page ────────────────────────────────────────────────────────────────

const UsersAdminPage = () => {
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

  // Share credentials card
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // Share-reset modal[cite: 1]
  const [shareResetTarget, setShareResetTarget] = useState<ShareResetTarget | null>(null);
  const [shareResetPassword, setShareResetPassword] = useState('');
  const [shareResetLoading, setShareResetLoading] = useState(false);

  // Dedicated Reset Password Modal
  const [resetTarget, setResetTarget] = useState<Student | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Dedicated Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit modal[cite: 1]
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // Custom video picker modal[cite: 1]
  const [customVideoTarget, setCustomVideoTarget] = useState<Student | null>(null);

  // Add student modal[cite: 1]
  const [showAddModal, setShowAddModal] = useState(false);

  // Table filters[cite: 1]
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<Grade | ''>('');
  const [showExpired, setShowExpired] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeStudents = useMemo(
    () => students.filter((s) => !isExpiredOrInactive(s)),
    [students],
  );
  const expiredStudents = useMemo(
    () => students.filter((s) => isExpiredOrInactive(s)),
    [students],
  );

  const filterStudents = useCallback(
    (list: Student[]) => {
      const q = searchQuery.trim().toLowerCase();
      return list.filter((s) => {
        const matchSearch = s.username.toLowerCase().includes(q);
        const matchGrade = gradeFilter ? s.grade === gradeFilter : true;
        return matchSearch && matchGrade;
      });
    },
    [searchQuery, gradeFilter],
  );

  const filteredActive = useMemo(
    () => filterStudents(activeStudents),
    [filterStudents, activeStudents],
  );
  const filteredExpired = useMemo(
    () => filterStudents(expiredStudents),
    [filterStudents, expiredStudents],
  );

  // ── API calls ─────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) setStudents(data.students);
      else if (res.status === 401) { triggerUnauthorized(); }
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
        setShowAddModal(false);
        fetchStudents();
      } else if (res.status === 401) {
        triggerUnauthorized();
      } else {
        setError(data.error || 'Failed to create student account');
      }
    } catch {
      setError('Connection error creating student');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    setResetLoading(true); setError('');
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setSuccess(`Password updated successfully for '${resetTarget.username}'.`);
        setResetTarget(null);
      } else if (res.status === 401) {
        triggerUnauthorized();
        setResetTarget(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
        setResetTarget(null);
      }
    } catch {
      setError('Error updating password');
      setResetTarget(null);
    } finally {
      setResetLoading(false);
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
      } else if (res.status === 401) {
        triggerUnauthorized();
        setShareResetTarget(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to reset password');
        setShareResetTarget(null);
      }
    } catch { setError('Connection error resetting password'); setShareResetTarget(null); }
    finally { setShareResetLoading(false); }
  };

  const handleEditStudent = async (activeFrom: string, activeTo: string, accessMode: AccessMode, grade: Grade | '') => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeFrom: activeFrom || null,
          activeTo: activeTo || null,
          accessMode,
          grade: grade || null,
        }),
      });
      if (res.ok) {
        setSuccess(`Account '${editTarget.username}' updated.`);
        setEditTarget(null);
        fetchStudents();
      } else if (res.status === 401) {
        triggerUnauthorized();
        setEditTarget(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update account');
        setEditTarget(null);
      }
    } catch { setError('Connection error updating account'); setEditTarget(null); }
    finally { setEditLoading(false); }
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
      } else if (res.status === 401) {
        triggerUnauthorized();
        setCustomVideoTarget(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save custom video list');
        setCustomVideoTarget(null);
      }
    } catch { setError('Connection error saving custom video list'); setCustomVideoTarget(null); }
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true); setError('');
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess(`Student account '${deleteTarget.username}' deleted.`);
        setDeleteTarget(null);
        fetchStudents();
      } else if (res.status === 401) {
        triggerUnauthorized();
        setDeleteTarget(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete student');
        setDeleteTarget(null);
      }
    } catch {
      setError('Connection error deleting student');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Student Row ──────────────────────────────────────────────────────────

  const renderStudentRow = (student: Student) => (
    <tr key={student.id} className="transition-colors duration-100 hover:bg-[#f8f9fa]">
      {/* Username */}
      <td className="py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-500">
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
          <span className="text-[11px] text-[#9aa0a6]">-</span>
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
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => setEditTarget(student)} title="Edit Student"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-100">
            <span>Edit</span>
          </button>
          {student.accessMode === 'CUSTOM' && (
            <button type="button" onClick={() => setCustomVideoTarget(student)} title="Manage Videos"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100">
              <Film size={13} /><span>Videos</span>
            </button>
          )}
          <button type="button" onClick={() => handleOpenShareReset(student)} title="Share Credentials"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100">
            <Share2 size={13} /><span>Share</span>
          </button>
          <button type="button" onClick={() => setResetTarget(student)} title="Reset Password"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-100">
            <Key size={13} /><span>Reset</span>
          </button>
          <button type="button" onClick={() => setDeleteTarget(student)} title="Delete Student"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100">
            <Trash size={13} /><span>Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Modals[cite: 1] */}
      {showAddModal && (
        <AddStudentModal
          usernamePrefix={newUsernamePrefix} usernameSuffix={newUsernameSuffix}
          password={newPassword} grade={newGrade} accessMode={newAccessMode}
          activeFrom={newActiveFrom} activeTo={newActiveTo}
          creating={creating} error={error} success={success} shareInfo={shareInfo}
          onPrefixChange={setNewUsernamePrefix}
          onSuffixChange={(i, v) => setNewUsernameSuffix((prev) => prev.map((d, idx) => (idx === i ? v : d)))}
          onSuffixBulkSet={setNewUsernameSuffix}
          onPasswordChange={setNewPassword}
          onGradeChange={setNewGrade}
          onAccessModeChange={setNewAccessMode}
          onActiveFromChange={setNewActiveFrom}
          onActiveToChange={setNewActiveTo}
          onSubmit={handleCreateStudent}
          onCancel={() => setShowAddModal(false)}
          onDismissShareInfo={() => setShareInfo(null)}
        />
      )}
      {shareResetTarget && (
        <ShareResetModal
          target={shareResetTarget}
          password={shareResetPassword}
          loading={shareResetLoading}
          onPasswordChange={setShareResetPassword}
          onConfirm={handleConfirmShareReset}
          onCancel={() => { setShareResetTarget(null); setShareResetPassword(''); }} />
      )}
      {resetTarget && (
        <ResetPasswordModal target={resetTarget} loading={resetLoading}
          onConfirm={handleResetPassword}
          onCancel={() => setResetTarget(null)} />
      )}
      {deleteTarget && (
        <AccountDeleteConfirmModal target={deleteTarget} loading={deleteLoading}
          onConfirm={handleDeleteStudent}
          onCancel={() => setDeleteTarget(null)} />
      )}
      {editTarget && (
        <EditStudentModal student={editTarget} loading={editLoading}
          onConfirm={handleEditStudent}
          onCancel={() => setEditTarget(null)} />
      )}
      {customVideoTarget && (
        <CustomVideoPickerModal student={customVideoTarget}
          onSave={handleSaveCustomVideos}
          onCancel={() => setCustomVideoTarget(null)} />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">Student Accounts</h1>
              <p className="mt-1 text-sm text-[#5f6368]">Create, manage, and remove student login accounts</p>
            </div>
            <Button type="button" onPress={() => setShowAddModal(true)}>
              <UserPlus size={16} />
              New Student
            </Button>
          </div>

          {/* Page-level feedback (shown once the modal that triggered it has closed) */}
          {error && !showAddModal && (
            <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>
          )}
          {success && !showAddModal && (
            <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>
          )}
          {shareInfo && !showAddModal && (
            <ShareCredentialsCard info={shareInfo} onDismiss={() => setShareInfo(null)} />
          )}

          {/* ── Summary ──────────────────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            <StatCard label="Total Students" value={students.length} tone="default"
              icon={<UserPlus size={17} />} />
            <StatCard label="Active Accounts" value={activeStudents.length} tone="success"
              icon={<Check size={17} />} />
            <StatCard label="Deactivated Accounts" value={expiredStudents.length} tone="danger"
              icon={<ShieldAlert size={17} />} />
          </div>

          <div className="w-full">
            {/* ── Students list ────────────────────────────────────────────── */}
            <div className="flex flex-col gap-6 w-full min-w-0">
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
                        className="appearance-none rounded-full border border-[#dadce0] bg-white py-2 pl-3 pr-7 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc]  focus:ring-2 focus:ring-blue-500/20">
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
                        className="w-48 rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-8 text-sm text-[#202124] outline-none transition-all  hover:border-[#c4c7cc]  focus:ring-2 focus:ring-blue-500/20" />
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
                  <div className="flex justify-center py-14"><Loader2 className="animate-spin text-blue-500" size={26} /></div>
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
                                  ) : <span className="text-[11px] text-[#9aa0a6]">-</span>}
                                </td>
                                <td className="py-3.5"><AccountStatusBadge student={student} /></td>
                                <td className="py-3.5 text-[12px] text-[#9aa0a6]">{formatDate(student.activeTo)}</td>
                                <td className="py-3.5 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button type="button" onClick={() => setEditTarget(student)}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-500 transition-colors hover:bg-[#c2d7fa]">
                                      <span>Edit / Reactivate</span>
                                    </button>
                                    <button type="button" onClick={() => setDeleteTarget(student)}
                                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-[#fce8e6]">
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

export default UsersAdminPage;
