"use client";

import { Grade } from '@/lib/db';
import { BookOpen, ChevronDown, Clock, Loader2, Lock, Plus, RefreshCw, UserPlus, X } from 'lucide-react';
import CopyButton from './CopyButton';
import UsernameInput from './UsernameInput';
import { generatePassword } from '@/lib/utils';
import { GRADE_LABELS } from '@/lib/constants';
import DateTimePicker from './DateTimePicker';
import ShareCredentialsCard from './ShareCredentialsCard';
import { Button } from '@heroui/react';

type AccessMode = 'GRADE' | 'CUSTOM';

interface ShareInfo {
  username: string;
  password: string;
}

const AddStudentModal = ({
  usernamePrefix, usernameSuffix, password, grade, accessMode, activeFrom, activeTo,
  creating, error, success, shareInfo,
  onPrefixChange, onSuffixChange, onSuffixBulkSet, onPasswordChange,
  onGradeChange, onAccessModeChange, onActiveFromChange, onActiveToChange,
  onSubmit, onCancel, onDismissShareInfo,
}: {
  usernamePrefix: string; usernameSuffix: string[]; password: string;
  grade: Grade | ''; accessMode: AccessMode; activeFrom: string; activeTo: string;
  creating: boolean; error: string; success: string; shareInfo: ShareInfo | null;
  onPrefixChange: (v: string) => void;
  onSuffixChange: (i: number, v: string) => void;
  onSuffixBulkSet: (digits: string[]) => void;
  onPasswordChange: (v: string) => void;
  onGradeChange: (v: Grade | '') => void;
  onAccessModeChange: (v: AccessMode) => void;
  onActiveFromChange: (v: string) => void;
  onActiveToChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDismissShareInfo: () => void;
}) => {
  const computedUsername =
    usernamePrefix && usernameSuffix.every((d) => d)
      ? `${usernamePrefix}-${usernameSuffix.join('')}`
      : '';

  return (
    <div role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !creating && onCancel()}>
      <div className="w-full max-w-fit my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserPlus size={16} className="text-white" />
              <span className="text-[15px] font-semibold text-white">Create Student Account</span>
            </div>
            <button type="button" onClick={onCancel} disabled={creating} aria-label="Close"
              className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">{success}</div>
          )}

          <form id="add-student-form" onSubmit={onSubmit} className="space-x-4 flex">
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#5f6368]">Username</label>
                  <CopyButton text={computedUsername} label="Copy" />
                </div>
                <UsernameInput prefix={usernamePrefix} suffix={usernameSuffix} disabled={creating}
                  onPrefixChange={onPrefixChange}
                  onSuffixChange={onSuffixChange}
                  onSuffixBulkSet={onSuffixBulkSet} />
                <p className="mt-1 text-[11px] text-[#9aa0a6]">Format: <span className="font-mono">username-XXXX</span></p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-[#5f6368]">Password</label>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onPasswordChange(generatePassword(6))} disabled={creating}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">
                      <RefreshCw size={12} /><span>Generate</span>
                    </button>
                    <CopyButton text={password} label="Copy" />
                  </div>
                </div>
                <input type="text" value={password} onChange={(e) => onPasswordChange(e.target.value)}
                  disabled={creating} placeholder="Initial password"
                  className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all  hover:border-[#c4c7cc]  focus:ring-2 focus:ring-blue-500/20  "
                  required />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Grade <span className="font-normal text-[#9aa0a6]">(optional)</span></label>
                <div className="relative">
                  <select value={grade} onChange={(e) => onGradeChange(e.target.value as Grade | '')} disabled={creating}
                    className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc]  focus:ring-2 focus:ring-blue-500/20 ">
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
                    <button key={mode} type="button" onClick={() => onAccessModeChange(mode)} disabled={creating}
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
                <p className="mt-1 text-[11px] text-[#9aa0a6]">
                  {accessMode === 'CUSTOM' ? 'Manually pick which videos this student can access.' : 'Student sees videos matching their grade.'}
                </p>
              </div>
            </div>

            <div className="space-y-2 h-fit rounded-xl border border-[#e8eaed] bg-[#f8f9fa] p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#5f6368]">
                <Clock size={11} /> Account Validity
              </p>
              <DateTimePicker label="Active From (blank = immediate)" value={activeFrom} onChange={onActiveFromChange} disabled={creating} />
              <DateTimePicker label="Active Until (blank = no expiry)" value={activeTo} onChange={onActiveToChange} disabled={creating} minDate={activeFrom} />
            </div>
          </form>

          {shareInfo && <ShareCredentialsCard info={shareInfo} onDismiss={onDismissShareInfo} />}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant='outline' onPress={onCancel} isDisabled={creating}>
            Cancel
          </Button>
          <Button isPending={creating} type="submit" form="add-student-form" isDisabled={creating} >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Student
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddStudentModal;
