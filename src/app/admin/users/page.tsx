'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash, Key, Loader2, UserPlus, Eye, EyeOff } from 'lucide-react';

interface Student {
  id: string;
  username: string;
  createdAt: string;
}

export default function UsersAdminPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset states
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

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
    if (!newUsername.trim() || !newPassword.trim()) {
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
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(`Student account '${newUsername}' created successfully.`);
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

  const handleResetPassword = async (studentId: string) => {
    if (!resetPassword.trim()) {
      alert('Please enter a new password');
      return;
    }

    try {
      const res = await fetch(`/api/users/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (res.ok) {
        alert('Password updated successfully');
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
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]" htmlFor="username">
                  Username
                </label>
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
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={creating}
                    placeholder="Initial password"
                    className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 pr-10 text-sm text-[#202124] outline-none transition-all duration-150 placeholder:text-[#9aa0a6] hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#5f6368] transition-colors hover:text-[#202124]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
          </div>

          {/* Right panel: Students list */}
          <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-medium text-[#202124]">
                Existing Student Accounts
              </h2>
              {!loading && students.length > 0 && (
                <span className="rounded-full bg-[#f1f3f4] px-2.5 py-1 text-xs font-medium text-[#5f6368]">
                  {students.length} total
                </span>
              )}
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
                    {students.map((student) => (
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
                                className="rounded-md border border-[#dadce0] px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
                              />
                              <button
                                onClick={() => handleResetPassword(student.id)}
                                className="rounded-full bg-[#1a73e8] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1765cc]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setResettingId(null)}
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
