"use client";

import { generatePassword } from '@/lib/utils';
import { Button } from '@heroui/react';
import { AlertTriangle, Check, Loader2, RefreshCw, Share2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ShareResetTarget {
  id: string;
  username: string;
}

const ShareResetModal = ({ target, password, loading, onPasswordChange, onConfirm, onCancel }: {
  target: ShareResetTarget; password: string; loading: boolean;
  onPasswordChange: (v: string) => void; onConfirm: () => void; onCancel: () => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { cardRef.current?.focus(); }, []);
  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div ref={cardRef} tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
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
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-100">
                <RefreshCw size={12} /><span>Regenerate</span>
              </button>
            </div>
            <input type="text" value={password} onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter or generate a password"
              className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 font-mono text-sm text-[#202124] outline-none transition-all focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} onPress={onConfirm} isDisabled={loading} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm & Share
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ShareResetModal;
