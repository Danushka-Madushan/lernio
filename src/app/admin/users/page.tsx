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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-4">
      {/* Left panel: Add Student */}
      <div className="bg-white p-space-4 rounded-radius-md border border-surface-strong space-y-space-3 lg:col-span-1 h-fit">
        <h2 className="text-md font-semibold text-text-primary flex items-center space-x-1">
          <UserPlus size={18} />
          <span>Create Student Account</span>
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-radius-xs p-space-2 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-radius-xs p-space-2 text-xs">
            {success}
          </div>
        )}

        <form onSubmit={handleCreateStudent} className="space-y-space-3">
          <div>
            <label className="block text-xs text-text-tertiary mb-1" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={creating}
              placeholder="e.g. madushan6"
              className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 text-xs outline-none focus:ring-1 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-text-tertiary mb-1" htmlFor="password">
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
                className="w-full rounded-radius-xs border border-surface-strong bg-white px-space-2 py-space-1.5 pr-space-4 text-xs outline-none focus:ring-1 focus:ring-black"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-text-tertiary hover:text-text-primary"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full flex justify-center items-center space-x-1 bg-black hover:bg-surface-strong hover:text-black text-white text-xs font-semibold py-space-2 rounded-radius-xs transition-colors duration-instant disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <>
                <Plus size={14} />
                <span>Create Student</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right panel: Students list */}
      <div className="bg-white p-space-4 rounded-radius-md border border-surface-strong lg:col-span-2 space-y-space-3">
        <h2 className="text-md font-semibold text-text-primary">Existing Student Accounts</h2>

        {loading ? (
          <div className="flex justify-center py-space-6">
            <Loader2 className="animate-spin text-text-tertiary" size={24} />
          </div>
        ) : students.length === 0 ? (
          <p className="text-xs text-text-tertiary py-space-4 text-center">No student accounts registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-strong text-text-tertiary">
                  <th className="py-2">Username</th>
                  <th className="py-2">Registered On</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-muted">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-surface-muted/55">
                    <td className="py-2 font-medium text-text-primary">{student.username}</td>
                    <td className="py-2 text-text-tertiary">
                      {new Date(student.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-right space-x-2">
                      {resettingId === student.id ? (
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="text"
                            placeholder="New pass"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="border border-surface-strong px-2 py-0.5 rounded text-[11px] outline-none"
                          />
                          <button
                            onClick={() => handleResetPassword(student.id)}
                            className="bg-black text-white px-2 py-0.5 rounded text-[11px] hover:bg-surface-strong hover:text-black font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setResettingId(null)}
                            className="text-text-tertiary hover:underline text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setResettingId(student.id);
                              setResetPassword('');
                            }}
                            className="inline-flex items-center space-x-0.5 text-text-secondary hover:text-black hover:underline"
                            title="Reset Password"
                          >
                            <Key size={12} />
                            <span>Reset</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.username)}
                            className="inline-flex items-center space-x-0.5 text-red-500 hover:text-red-700 hover:underline"
                            title="Delete Student"
                          >
                            <Trash size={12} />
                            <span>Delete</span>
                          </button>
                        </>
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
  );
}
