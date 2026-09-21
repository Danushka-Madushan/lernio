'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Key,
  Loader2,
  Search,
  Trash,
  UserPlus,
  X,
  GraduationCap,
  Film,
  Video,
  UserCheck,
} from 'lucide-react';
import { Button } from '@heroui/react';
import StatCard from '@/components/StatCard';
import ResetPasswordModal from '@/components/ResetPasswordModal';
import AccountDeleteConfirmModal from '@/components/AccountDeleteConfirmModal';
import AddTeacherModal from '@/components/AddTeacherModal';
import ShareCredentialsCard from '@/components/ShareCredentialsCard';
import { triggerUnauthorized } from '@/lib/utils';

interface Teacher {
  id: string;
  username: string;
  role: 'ADMIN' | 'TEACHER';
  createdAt: string;
  _count: {
    students: number;
    videos: number;
    meetings: number;
  };
}

interface ShareInfo {
  username: string;
  password: string;
}

const TeachersAdminPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // Reset password state
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      if (res.ok) {
        setTeachers(data.teachers);
      } else if (res.status === 401) {
        triggerUnauthorized();
      } else {
        setError(data.error || 'Failed to fetch teachers');
      }
    } catch {
      setError('Connection error fetching teachers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.username.toLowerCase().includes(q));
  }, [searchQuery, teachers]);

  const totalStudentsAssigned = useMemo(
    () => teachers.reduce((acc, t) => acc + (t._count?.students || 0), 0),
    [teachers]
  );

  const totalVideos = useMemo(
    () => teachers.reduce((acc, t) => acc + (t._count?.videos || 0), 0),
    [teachers]
  );

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = newUsername.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Username and password are required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Teacher '${trimmedUsername}' created successfully.`);
        setShareInfo({ username: trimmedUsername, password: trimmedPassword });
        setNewUsername('');
        setNewPassword('');
        setShowAddModal(false);
        fetchTeachers();
      } else if (res.status === 401) {
        triggerUnauthorized();
      } else {
        setError(data.error || 'Failed to create teacher');
      }
    } catch {
      setError('Connection error creating teacher');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (password: string) => {
    if (!resetTarget) return;
    setResetLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/teachers/${resetTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setSuccess(`Password updated for '${resetTarget.username}'.`);
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
      setError('Connection error updating password');
      setResetTarget(null);
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/teachers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message || `Teacher '${deleteTarget.username}' deleted.`);
        setDeleteTarget(null);
        fetchTeachers();
      } else if (res.status === 401) {
        triggerUnauthorized();
        setDeleteTarget(null);
      } else {
        setError(data.error || 'Failed to delete teacher');
        setDeleteTarget(null);
      }
    } catch {
      setError('Connection error deleting teacher');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* Create Teacher Modal */}
      {showAddModal && (
        <AddTeacherModal
          username={newUsername}
          password={newPassword}
          creating={creating}
          error={error}
          success={success}
          shareInfo={shareInfo}
          onUsernameChange={setNewUsername}
          onPasswordChange={setNewPassword}
          onSubmit={handleCreateTeacher}
          onCancel={() => setShowAddModal(false)}
          onDismissShareInfo={() => setShareInfo(null)}
        />
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          loading={resetLoading}
          onConfirm={handleResetPassword}
          onCancel={() => setResetTarget(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <AccountDeleteConfirmModal
          target={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleDeleteTeacher}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="min-h-screen bg-[#f8f9fa] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight text-[#202124]">
                Teacher Accounts
              </h1>
              <p className="mt-1 text-sm text-[#5f6368]">
                Create and manage teachers in the multi-tenant system
              </p>
            </div>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onPress={() => setShowAddModal(true)}
            >
              <UserPlus size={16} />
              New Teacher
            </Button>
          </div>

          {/* Feedback messages */}
          {error && !showAddModal && (
            <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">
              {error}
            </div>
          )}
          {success && !showAddModal && (
            <div className="rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">
              {success}
            </div>
          )}
          {shareInfo && !showAddModal && (
            <ShareCredentialsCard info={shareInfo} onDismiss={() => setShareInfo(null)} />
          )}

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Teachers"
              value={teachers.length}
              tone="default"
              icon={<UserCheck size={17} />}
            />
            <StatCard
              label="Assigned Students"
              value={totalStudentsAssigned}
              tone="success"
              icon={<GraduationCap size={17} />}
            />
            <StatCard
              label="Teacher Videos"
              value={totalVideos}
              tone="default"
              icon={<Film size={17} />}
            />
          </div>

          {/* Table Container */}
          <div className="space-y-4">
            {/* Search filter */}
            <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[15px] font-medium text-[#202124]">
                    Active Teachers
                  </h2>
                  {!loading && (
                    <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                      {teachers.length} total
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teachers…"
                    className="w-full sm:w-60 rounded-full border border-[#dadce0] bg-white py-2 pl-9 pr-8 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-purple-500/20"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#202124]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Teachers Table */}
            <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-14">
                  <Loader2 className="animate-spin text-purple-600" size={26} />
                </div>
              ) : filteredTeachers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4]">
                    <UserCheck size={20} className="text-[#9aa0a6]" />
                  </div>
                  <p className="text-sm text-[#5f6368]">No teachers found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto p-4">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#e8eaed]">
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Teacher
                        </th>
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Role
                        </th>
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Students
                        </th>
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Videos
                        </th>
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Meetings
                        </th>
                        <th className="py-2.5 text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Registered
                        </th>
                        <th className="py-2.5 text-right text-xs font-medium uppercase tracking-wide text-[#5f6368]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f3f4]">
                      {filteredTeachers.map((teacher) => (
                        <tr
                          key={teacher.id}
                          className="transition-colors duration-100 hover:bg-[#f8f9fa]"
                        >
                          {/* Username with avatar */}
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                                  teacher.role === 'ADMIN'
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {teacher.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-mono text-[13px] font-medium text-[#202124]">
                                {teacher.username}
                              </span>
                            </div>
                          </td>

                          {/* Role badge */}
                          <td className="py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                teacher.role === 'ADMIN'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {teacher.role === 'ADMIN' ? 'Admin (Primary)' : 'Teacher'}
                            </span>
                          </td>

                          {/* Counts */}
                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs text-[#5f6368]">
                              <GraduationCap size={13} className="text-[#9aa0a6]" />
                              {teacher._count?.students ?? 0}
                            </span>
                          </td>

                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs text-[#5f6368]">
                              <Film size={13} className="text-[#9aa0a6]" />
                              {teacher._count?.videos ?? 0}
                            </span>
                          </td>

                          <td className="py-3.5">
                            <span className="inline-flex items-center gap-1 text-xs text-[#5f6368]">
                              <Video size={13} className="text-[#9aa0a6]" />
                              {teacher._count?.meetings ?? 0}
                            </span>
                          </td>

                          {/* Registered date */}
                          <td className="py-3.5 text-[#5f6368] text-[12px]">
                            {new Date(teacher.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setResetTarget(teacher)}
                                title="Reset Password"
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100"
                              >
                                <Key size={13} />
                                <span>Reset</span>
                              </button>
                              {teacher.role !== 'ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(teacher)}
                                  title="Delete Teacher"
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100"
                                >
                                  <Trash size={13} />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
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
};

export default TeachersAdminPage;
