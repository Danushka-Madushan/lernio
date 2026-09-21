"use client";

import { useState } from 'react';
import { Button } from '@heroui/react';
import { AlertTriangle, Check, Loader2, Trash2, X } from 'lucide-react';

interface TeacherTarget {
  id: string;
  username: string;
}

interface TeacherDeleteConfirmModalProps {
  target: TeacherTarget;
  loading: boolean;
  onConfirm: (confirmationUsername: string) => void;
  onCancel: () => void;
}

const TeacherDeleteConfirmModal = ({
  target,
  loading,
  onConfirm,
  onCancel,
}: TeacherDeleteConfirmModalProps) => {
  const [typedUsername, setTypedUsername] = useState('');

  const isMatched = typedUsername.trim() === target.username;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched || loading) return;
    onConfirm(typedUsername.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        {/* Header */}
        <div className="relative bg-linear-to-br from-red-600 via-[#c5221f] to-[#9b1c1c] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Trash2 size={16} className="text-white" />
              </div>
              <div>
                <span className="text-[15px] font-semibold text-white">Delete Teacher Account</span>
                <p className="text-[11px] text-red-100">Permanent destruction of teacher & resources</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Warning banner */}
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div className="text-[12px] leading-[1.6] text-[#b31412]">
              <p className="font-semibold text-[13px] text-[#9b1c1c]">This action is irreversible</p>
              <p className="mt-1">
                Deleting <span className="font-bold underline">{target.username}</span> will remove
                all resources created by this teacher:
              </p>
              <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-[11px]">
                <li>All uploaded video lessons and storage files</li>
                <li>All scheduled Zoom meetings and API credentials</li>
              </ul>
              <p className="mt-1.5 text-[11px] text-[#781212]">
                Assigned students will be safely reassigned to Admin so they remain in the system.
              </p>
            </div>
          </div>

          {/* Type confirmation instruction */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#202124]">
              To confirm deletion, please type{' '}
              <span className="font-bold text-[#c5221f] select-all bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                {target.username}
              </span>{' '}
              below:
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                disabled={loading}
                value={typedUsername}
                onChange={(e) => setTypedUsername(e.target.value)}
                placeholder={`Type "${target.username}"`}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all placeholder:text-[#9aa0a6] ${
                  isMatched
                    ? 'border-green-500 bg-green-50/30 focus:ring-2 focus:ring-green-500/20'
                    : typedUsername.length > 0
                    ? 'border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-500/20'
                    : 'border-[#dadce0] bg-white hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20'
                }`}
              />
              {isMatched && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                  <Check size={16} />
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e8eaed]">
            <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isDisabled={!isMatched || loading}
              isPending={loading}
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Deleting & Cleaning Up...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      Delete Teacher & Resources
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherDeleteConfirmModal;
