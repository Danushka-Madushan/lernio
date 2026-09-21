"use client";

import { Loader2, Plus, RefreshCw, UserCheck, X } from 'lucide-react';
import CopyButton from './CopyButton';
import { generatePassword } from '@/lib/utils';
import ShareCredentialsCard from './ShareCredentialsCard';
import { Button } from '@heroui/react';

interface ShareInfo {
  username: string;
  password: string;
}

const AddTeacherModal = ({
  username,
  password,
  creating,
  error,
  success,
  shareInfo,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onCancel,
  onDismissShareInfo,
}: {
  username: string;
  password: string;
  creating: boolean;
  error: string;
  success: string;
  shareInfo: ShareInfo | null;
  onUsernameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDismissShareInfo: () => void;
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !creating && onCancel()}
    >
      <div className="w-full max-w-md my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-purple-600 via-[#6d28d9] to-[#4c1d95] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Create Teacher Account</span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={creating}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
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

          <form id="add-teacher-form" onSubmit={onSubmit} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-[#5f6368]">Username</label>
                <CopyButton text={username} label="Copy" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                disabled={creating}
                placeholder="e.g. teacher_john"
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-purple-500/20"
                required
                minLength={3}
              />
              <p className="mt-1 text-[11px] text-[#9aa0a6]">
                Used by the teacher to log into the Teacher Panel.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-[#5f6368]">Initial Password</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPasswordChange(generatePassword(8))}
                    disabled={creating}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RefreshCw size={12} />
                    <span>Generate</span>
                  </button>
                  <CopyButton text={password} label="Copy" />
                </div>
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                disabled={creating}
                placeholder="Password (at least 4 characters)"
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-purple-500/20"
                required
                minLength={4}
              />
            </div>
          </form>

          {shareInfo && (
            <div className="mt-4">
              <ShareCredentialsCard info={shareInfo} onDismiss={onDismissShareInfo} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={creating}>
            Cancel
          </Button>
          <Button
            isPending={creating}
            type="submit"
            form="add-teacher-form"
            isDisabled={creating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Teacher
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddTeacherModal;
