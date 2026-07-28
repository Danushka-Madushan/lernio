"use client";

import { Grade } from '@/lib/db';
import { generatePassword } from '@/lib/utils';
import { Button } from '@heroui/react';
import { Check, Key, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

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

const ResetPasswordModal = ({ target, loading, onConfirm, onCancel }: {
  target: Student; loading: boolean;
  onConfirm: (password: string) => void; onCancel: () => void;
}) => {
  const [password, setPassword] = useState('');

  useEffect(() => {
    setPassword(generatePassword(6));
  }, []);

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Reset Password</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <p className="text-[13px] text-[#5f6368]">
            Set a new password for <span className="font-semibold text-[#202124]">{target.username}</span>.
          </p>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-[#5f6368]">New Password</label>
              <button type="button" onClick={() => setPassword(generatePassword(6))}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-100">
                <RefreshCw size={12} /><span>Regenerate</span>
              </button>
            </div>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter or generate a password"
              className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 font-mono text-sm text-[#202124] outline-none transition-all focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} onPress={() => onConfirm(password)} isDisabled={loading || !password.trim()} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Reset Password
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordModal;
