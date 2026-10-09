"use client";

import { Button } from '@heroui/react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface ExamGroupTarget {
  id: string;
  name: string;
}

interface ExamGroupDeleteConfirmModalProps {
  target: ExamGroupTarget;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ExamGroupDeleteConfirmModal = ({
  target,
  loading,
  onConfirm,
  onCancel,
}: ExamGroupDeleteConfirmModalProps) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="relative bg-linear-to-br from-red-500 via-[#c5221f] to-[#b31412] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Trash2 size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Delete Exam Group</span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 px-6 py-5">
          <div className="flex gap-3 rounded-xl border border-[#fad2cf] bg-[#fce8e6] px-4 py-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#c5221f]" />
            <div>
              <p className="text-[13px] font-semibold text-[#b31412]">Delete Grouping</p>
              <p className="mt-0.5 text-[12px] leading-[1.55] text-[#c5221f]">
                Are you sure you want to delete the exam group <span className="font-semibold">{target.name}</span>? All individual papers in this group will remain intact as standalone exams, and no student marks will be lost.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} variant="danger" onPress={onConfirm} isDisabled={loading}>
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Group
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExamGroupDeleteConfirmModal;
