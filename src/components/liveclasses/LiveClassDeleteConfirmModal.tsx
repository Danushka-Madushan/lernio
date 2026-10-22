'use client';

import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@heroui/react';

interface LiveClass {
  id: string;
  title: string;
}

interface LiveClassDeleteConfirmModalProps {
  target: LiveClass | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LiveClassDeleteConfirmModal({
  target,
  loading,
  onConfirm,
  onCancel,
}: LiveClassDeleteConfirmModalProps) {
  if (!target) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10">
        {/* Header */}
        <div className="relative bg-linear-to-br from-red-500 via-[#c5221f] to-[#b31412] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash2 size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Delete Live Class</span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-4 py-3.5">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div>
              <p className="text-[13px] font-semibold text-[#b31412]">This action is irreversible</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold">&ldquo;{target.title}&rdquo;</span>? This class and its playback access will be removed immediately.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              onPress={onCancel}
              isDisabled={loading}
              className="text-xs font-semibold h-10 px-4 rounded-xl border border-[#dadce0] text-[#5f6368] hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onPress={onConfirm}
              isDisabled={loading}
              className="text-xs font-semibold h-10 px-5 rounded-xl bg-[#c5221f] text-white shadow-xs hover:bg-[#b31412] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  <span>Deleting...</span>
                </>
              ) : (
                'Delete Live Class'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
