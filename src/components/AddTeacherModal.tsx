"use client";

import { Loader2, Plus, RefreshCw, RotateCcw, UserCheck, X, CheckSquare, Square } from 'lucide-react';
import CopyButton from './CopyButton';
import { generatePassword } from '@/lib/utils';
import ShareCredentialsCard from './ShareCredentialsCard';
import Button from '@/components/ui/Button';
import { Grade } from '@/generated/client/enums';
import { ALL_GRADES, GRADE_COLORS, GRADE_LABELS } from '@/lib/constants';

interface ShareInfo {
  username: string;
  password: string;
}

const AddTeacherModal = ({
  username,
  nameAlias = '',
  password,
  allowedGrades,
  gradeAliases,
  creating,
  error,
  success,
  shareInfo,
  onUsernameChange,
  onNameAliasChange,
  onPasswordChange,
  onAllowedGradesChange,
  onGradeAliasesChange,
  onSubmit,
  onCancel,
  onDismissShareInfo,
}: {
  username: string;
  nameAlias?: string;
  password: string;
  allowedGrades: Grade[];
  gradeAliases: Record<string, string>;
  creating: boolean;
  error: string;
  success: string;
  shareInfo: ShareInfo | null;
  onUsernameChange: (v: string) => void;
  onNameAliasChange?: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onAllowedGradesChange: (grades: Grade[]) => void;
  onGradeAliasesChange: (aliases: Record<string, string>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onDismissShareInfo: () => void;
}) => {
  const toggleGrade = (grade: Grade) => {
    if (allowedGrades.includes(grade)) {
      if (allowedGrades.length === 1) return; // Must have at least 1 grade
      onAllowedGradesChange(allowedGrades.filter((g) => g !== grade));
    } else {
      onAllowedGradesChange([...allowedGrades, grade]);
    }
  };

  const selectAllGrades = () => {
    onAllowedGradesChange([...ALL_GRADES]);
  };

  const handleAliasChange = (grade: Grade, val: string) => {
    const next = { ...gradeAliases };
    if (val.trim() === '') {
      delete next[grade];
    } else {
      next[grade] = val;
    }
    onGradeAliasesChange(next);
  };

  const resetAlias = (grade: Grade) => {
    const next = { ...gradeAliases };
    delete next[grade];
    onGradeAliasesChange(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !creating && onCancel()}
    >
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
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

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-[#fad2cf] bg-[#fce8e6] px-3.5 py-2.5 text-[13px] leading-5 text-[#c5221f]">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-[#ceead6] bg-[#e6f4ea] px-3.5 py-2.5 text-[13px] leading-5 text-[#137333]">
              {success}
            </div>
          )}

          <form id="add-teacher-form" onSubmit={onSubmit} className="space-y-4">
            {/* Account Credentials */}
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
                Used by the teacher to log into the staff portal.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">
                Display Name / Teacher Alias <span className="font-normal text-[#9aa0a6]">(optional)</span>
              </label>
              <input
                type="text"
                value={nameAlias}
                onChange={(e) => onNameAliasChange?.(e.target.value)}
                disabled={creating}
                placeholder="e.g. Science with David (shown to students)"
                className="w-full rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-purple-500/20"
              />
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

            {/* Allowed Grades Selection */}
            <div className="pt-2 border-t border-[#f1f3f4]">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#202124]">
                    Assigned / Allowed Grades
                  </label>
                  <p className="text-[11px] text-[#5f6368]">
                    Select which grades this teacher is permitted to teach ({allowedGrades.length} of {ALL_GRADES.length} selected).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={selectAllGrades}
                  disabled={creating}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline"
                >
                  Select All
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {ALL_GRADES.map((g) => {
                  const isChecked = allowedGrades.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(g)}
                      disabled={creating}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        isChecked
                          ? 'border-purple-300 bg-purple-50 text-purple-900 shadow-2xs ring-1 ring-purple-200'
                          : 'border-[#dadce0] bg-white text-[#5f6368] hover:bg-[#f8f9fa]'
                      }`}
                    >
                      <span className="truncate">{GRADE_LABELS[g]}</span>
                      {isChecked ? (
                        <CheckSquare size={14} className="text-purple-600 shrink-0 ml-1.5" />
                      ) : (
                        <Square size={14} className="text-[#9aa0a6] shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grade Class Name Aliases */}
            <div className="pt-2 border-t border-[#f1f3f4]">
              <div className="mb-2">
                <label className="text-xs font-semibold text-[#202124]">
                  Class Name Aliases <span className="font-normal text-[#9aa0a6]">(Optional)</span>
                </label>
                <p className="text-[11px] text-[#5f6368]">
                  Custom display names for this teacher&apos;s grades. The underlying system retains the canonical grade ID.
                </p>
              </div>

              <div className="space-y-2">
                {ALL_GRADES.filter((g) => allowedGrades.includes(g)).map((g) => {
                  const currentAlias = gradeAliases[g] ?? '';
                  return (
                    <div key={g} className="flex items-center gap-2">
                      <span
                        className={`w-20 shrink-0 text-center rounded-md px-2 py-1 text-[11px] font-medium ${GRADE_COLORS[g]}`}
                      >
                        {GRADE_LABELS[g]}
                      </span>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={currentAlias}
                          onChange={(e) => handleAliasChange(g, e.target.value)}
                          disabled={creating}
                          placeholder={`Default: ${GRADE_LABELS[g]}`}
                          className="w-full rounded-lg border border-[#dadce0] bg-white py-1.5 pl-3 pr-8 text-xs text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-purple-500/20"
                        />
                        {currentAlias && (
                          <button
                            type="button"
                            onClick={() => resetAlias(g)}
                            title="Reset to default grade name"
                            aria-label={`Reset ${GRADE_LABELS[g]} alias`}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#202124] transition-colors"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>

          {shareInfo && (
            <div className="mt-4">
              <ShareCredentialsCard
                title="Teacher Credentials"
                info={shareInfo}
                onDismiss={onDismissShareInfo}
              />
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
