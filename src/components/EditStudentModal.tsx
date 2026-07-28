"use client";

import { GRADE_LABELS } from '@/lib/constants';
import { Grade } from '@/lib/db';
import { BookOpen, Check, ChevronDown, Clock, Loader2, Lock, X } from 'lucide-react';
import { useState } from 'react';
import DateTimePicker from './DateTimePicker';
import { Button } from '@heroui/react';

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

const EditStudentModal = ({ student, loading, onConfirm, onCancel }: {
  student: Student; loading: boolean;
  onConfirm: (activeFrom: string, activeTo: string, accessMode: AccessMode, grade: Grade | '') => void; onCancel: () => void;
}) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDatetime = (d: Date | null) =>
    d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : '';

  const [activeFrom, setActiveFrom] = useState(student.activeFrom ? toLocalDatetime(new Date(student.activeFrom)) : '');
  const [activeTo, setActiveTo] = useState(student.activeTo ? toLocalDatetime(new Date(student.activeTo)) : '');
  const [accessMode, setAccessMode] = useState<AccessMode>(student.accessMode);
  const [grade, setGrade] = useState<Grade | ''>(student.grade || '');

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}>
      <div className="w-full max-w-md my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-semibold text-white">Edit Student Account</span>
            </div>
            <button type="button" onClick={onCancel} disabled={loading} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
          <p className="text-[13px] text-[#5f6368]">
            Editing settings for <span className="font-semibold text-[#202124]">{student.username}</span>.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
            <div className="relative">
              <select value={grade} onChange={(e) => setGrade(e.target.value as Grade | '')} disabled={loading}
                className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20">
                <option value="">- Select grade -</option>
                {(Object.entries(GRADE_LABELS) as [Grade, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Access Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(['GRADE', 'CUSTOM'] as AccessMode[]).map((mode) => (
                <button key={mode} type="button" onClick={() => setAccessMode(mode)} disabled={loading}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${accessMode === mode
                    ? mode === 'CUSTOM'
                      ? 'border-purple-300 bg-purple-50 text-purple-700'
                      : 'border-blue-500/30 bg-blue-100 text-blue-500'
                    : 'border-[#e8eaed] bg-white text-[#5f6368] hover:bg-[#f8f9fa]'
                    }`}>
                  {mode === 'CUSTOM' ? <Lock size={12} /> : <BookOpen size={12} />}
                  {mode === 'CUSTOM' ? 'Custom' : 'Grade'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#5f6368]">
              <Clock size={11} /> Account Validity
            </p>
            <DateTimePicker label="Active From (blank = immediate)" value={activeFrom} onChange={setActiveFrom} disabled={loading} />
            <DateTimePicker label="Active Until (blank = no expiry)" value={activeTo} onChange={setActiveTo} disabled={loading} minDate={activeFrom} />
          </div>

        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button isPending={loading} onPress={() => onConfirm(activeFrom, activeTo, accessMode, grade)} isDisabled={loading} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EditStudentModal;
