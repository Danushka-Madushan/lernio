"use client";

import { useState } from 'react';
import { Check, CheckSquare, Loader2, Pencil, RotateCcw, Square, X } from 'lucide-react';
import { Button } from '@heroui/react';
import { Grade } from '@/generated/client/enums';
import { ALL_GRADES, GRADE_COLORS, GRADE_LABELS } from '@/lib/constants';

interface TeacherTarget {
  id: string;
  username: string;
  allowedGrades?: Grade[];
  gradeAliases?: Record<string, string> | null;
}

const EditTeacherModal = ({
  teacher,
  loading,
  onConfirm,
  onCancel,
}: {
  teacher: TeacherTarget;
  loading: boolean;
  onConfirm: (allowedGrades: Grade[], gradeAliases: Record<string, string>) => void;
  onCancel: () => void;
}) => {
  const [allowedGrades, setAllowedGrades] = useState<Grade[]>(
    teacher.allowedGrades && teacher.allowedGrades.length > 0
      ? teacher.allowedGrades
      : [...ALL_GRADES]
  );

  const [gradeAliases, setGradeAliases] = useState<Record<string, string>>(
    teacher.gradeAliases ? { ...teacher.gradeAliases } : {}
  );

  const toggleGrade = (grade: Grade) => {
    if (allowedGrades.includes(grade)) {
      if (allowedGrades.length === 1) return; // Must have at least 1 grade
      setAllowedGrades(allowedGrades.filter((g) => g !== grade));
    } else {
      setAllowedGrades([...allowedGrades, grade]);
    }
  };

  const selectAllGrades = () => {
    setAllowedGrades([...ALL_GRADES]);
  };

  const handleAliasChange = (grade: Grade, val: string) => {
    const next = { ...gradeAliases };
    if (val.trim() === '') {
      delete next[grade];
    } else {
      next[grade] = val;
    }
    setGradeAliases(next);
  };

  const resetAlias = (grade: Grade) => {
    const next = { ...gradeAliases };
    delete next[grade];
    setGradeAliases(next);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(allowedGrades, gradeAliases);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}
    >
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="relative bg-linear-to-br from-purple-600 via-[#6d28d9] to-[#4c1d95] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Pencil size={16} className="text-white" />
              <div>
                <span className="text-[15px] font-semibold text-white">Edit Teacher Grades & Aliases</span>
                <p className="text-[12px] text-purple-200">
                  Configure allowed grades and class aliases for <span className="font-mono font-medium text-white">{teacher.username}</span>
                </p>
              </div>
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

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          <form id="edit-teacher-form" onSubmit={handleSave} className="space-y-4">
            {/* Allowed Grades */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-[#202124]">
                    Assigned / Allowed Grades
                  </label>
                  <p className="text-[11px] text-[#5f6368]">
                    Select which grades this teacher conducts ({allowedGrades.length} of {ALL_GRADES.length} selected).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={selectAllGrades}
                  disabled={loading}
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
                      disabled={loading}
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

            {/* Class Name Aliases */}
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
                          disabled={loading}
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            isPending={loading}
            type="submit"
            form="edit-teacher-form"
            isDisabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
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
};

export default EditTeacherModal;
