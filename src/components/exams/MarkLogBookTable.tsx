'use client';

import { useState, useRef } from 'react';
import { Button } from '@heroui/react';
import { Check, Loader2, Save, UserX, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { getStudentColor, evaluateStudentMark } from '@/lib/exams';

export interface RosterStudent {
  studentId: string;
  username: string;
  grade: string;
  marks: number | null;
  isAbsent: boolean;
  remarks?: string;
  markId?: string | null;
}

interface MarkLogBookTableProps {
  examId: string;
  examTitle: string;
  thresholdMarks: number;
  maxMarks: number;
  initialRoster: RosterStudent[];
  onSaved?: () => void;
}

export default function MarkLogBookTable({
  examId,
  examTitle,
  thresholdMarks,
  maxMarks,
  initialRoster,
  onSaved,
}: MarkLogBookTableProps) {
  const [roster, setRoster] = useState<RosterStudent[]>(initialRoster);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleMarkChange = (index: number, val: string) => {
    setHasChanges(true);
    setSaveSuccess(false);

    setRoster((prev) => {
      const next = [...prev];
      if (val === '') {
        next[index] = { ...next[index], marks: null, isAbsent: false };
      } else {
        const num = parseFloat(val);
        const clamped = isNaN(num) ? null : Math.max(0, Math.min(num, maxMarks));
        next[index] = { ...next[index], marks: clamped, isAbsent: false };
      }
      return next;
    });
  };

  const handleAbsentToggle = (index: number) => {
    setHasChanges(true);
    setSaveSuccess(false);

    setRoster((prev) => {
      const next = [...prev];
      const current = next[index];
      const willBeAbsent = !current.isAbsent;
      next[index] = {
        ...current,
        isAbsent: willBeAbsent,
        marks: willBeAbsent ? null : current.marks,
      };
      return next;
    });
  };

  const handleRemarkChange = (index: number, val: string) => {
    setHasChanges(true);
    setSaveSuccess(false);

    setRoster((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], remarks: val };
      return next;
    });
  };

  // Keyboard navigation: Enter or Down arrow moves focus to next student
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (index + 1 < roster.length) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index - 1 >= 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleMarkAllUngradedAbsent = () => {
    setHasChanges(true);
    setRoster((prev) =>
      prev.map((s) => {
        if (s.marks === null && !s.isAbsent) {
          return { ...s, isAbsent: true };
        }
        return s;
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        marks: roster.map((r) => ({
          studentId: r.studentId,
          marks: r.isAbsent ? null : r.marks,
          isAbsent: r.isAbsent,
          remarks: r.remarks,
        })),
      };

      const res = await fetch(`/api/exams/${examId}/marks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save marks');
      }

      setHasChanges(false);
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving marks');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Bulk Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
            Marks Log Book ({roster.length} Students)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Type marks directly (0 to {maxMarks}). Press Enter to jump to next student.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
            onPress={handleMarkAllUngradedAbsent}
          >
            <UserX size={14} className="mr-1" />
            Mark Ungraded as Absent
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold h-8 bg-blue-600 text-white hover:bg-blue-700"
            onPress={handleSave}
            isDisabled={(!hasChanges && !saveSuccess) || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1" /> Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check size={14} className="mr-1" /> Saved!
              </>
            ) : (
              <>
                <Save size={14} className="mr-1" /> Save All Marks
              </>
            )}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Roster Table (Mobile-friendly rows) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="divide-y divide-gray-100">
          {roster.map((student, idx) => {
            const colors = getStudentColor(student.username);
            const isGraded = !student.isAbsent && student.marks !== null;
            const evaluation = isGraded ? evaluateStudentMark(student.marks, thresholdMarks, maxMarks) : null;

            return (
              <div
                key={student.studentId}
                className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  student.isAbsent ? 'bg-amber-50/30' : 'hover:bg-gray-50/60'
                }`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 min-w-44">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs"
                    style={{ backgroundColor: colors.color }}
                  >
                    {student.username.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {student.username}
                    </p>
                    <p className="text-[11px] text-gray-500">Student #{idx + 1}</p>
                  </div>
                </div>

                {/* Score Input & Absent Switch */}
                <div className="flex items-center gap-3 flex-1 max-w-md justify-between sm:justify-start">
                  {/* Mark Input */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="number"
                      inputMode="decimal"
                      disabled={student.isAbsent}
                      min={0}
                      max={maxMarks}
                      step="any"
                      placeholder="-"
                      value={student.marks !== null ? student.marks : ''}
                      onChange={(e) => handleMarkChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className={`w-20 px-3 py-2 text-center font-bold text-base rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                        student.isAbsent
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : evaluation?.isPass
                          ? 'bg-emerald-50/40 border-emerald-300 text-emerald-800 focus:ring-emerald-400'
                          : evaluation?.variant === 'encouraging'
                          ? 'bg-amber-50/40 border-amber-300 text-amber-800 focus:ring-amber-400'
                          : evaluation?.variant === 'support'
                          ? 'bg-rose-50/40 border-rose-300 text-rose-800 focus:ring-rose-400'
                          : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
                      }`}
                    />
                    <span className="text-xs text-gray-400 font-medium">/{maxMarks}</span>
                  </div>

                  {/* Absent Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleAbsentToggle(idx)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                      student.isAbsent
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {student.isAbsent ? 'Absent ✓' : 'Mark Absent'}
                  </button>

                  {/* Status Tag */}
                  <div className="min-w-24">
                    {student.isAbsent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Absent
                      </span>
                    ) : isGraded && evaluation ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${evaluation.badgeClass}`}
                      >
                        {evaluation.variant === 'excellent' || evaluation.variant === 'good' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertCircle size={12} />
                        )}
                        {evaluation.shortLabel}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not graded</span>
                    )}
                  </div>
                </div>

                {/* Optional Teacher Remarks */}
                <div className="w-full sm:w-56 mt-1 sm:mt-0">
                  <input
                    type="text"
                    placeholder="Feedback / remark (optional)"
                    value={student.remarks || ''}
                    onChange={(e) => handleRemarkChange(idx, e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Mobile Bottom Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-40 bg-gray-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between border border-gray-800 animate-in slide-in-from-bottom-4">
          <span className="text-xs font-medium">Unsaved mark changes</span>
          <Button
            size="sm"
            className="text-xs font-bold px-4 h-8 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
            onPress={handleSave}
            isDisabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Marks'}
          </Button>
        </div>
      )}
    </div>
  );
}
