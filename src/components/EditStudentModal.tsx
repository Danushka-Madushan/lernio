"use client";

import { ALL_GRADES, GRADE_LABELS, getTeacherGrades } from '@/lib/constants';
import { Grade } from '@/generated/client/enums';
import { BookOpen, Check, ChevronDown, Clock, Loader2, Lock, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import DateTimePicker from './DateTimePicker';
import Button from '@/components/ui/Button';

type AccessMode = 'GRADE' | 'CUSTOM';

interface TeacherOption {
  id: string;
  username: string;
  nameAlias?: string | null;
  role: string;
  allowedGrades?: Grade[];
  gradeAliases?: Record<string, string> | null;
}

interface Student {
  id: string;
  username: string;
  grade: Grade | null;
  activeFrom: string | null;
  activeTo: string | null;
  accessMode: AccessMode;
  teacherId?: string | null;
  teacher?: {
    id: string;
    username: string;
    nameAlias?: string | null;
    allowedGrades?: Grade[];
    gradeAliases?: Record<string, string> | null;
  } | null;
  teachers?: TeacherOption[];
  createdAt: string;
}

const EditStudentModal = ({
  student,
  teachers = [],
  isAdmin = false,
  loading,
  onConfirm,
  onCancel,
}: {
  student: Student;
  teachers?: TeacherOption[];
  isAdmin?: boolean;
  loading: boolean;
  onConfirm: (
    activeFrom: string,
    activeTo: string,
    accessMode: AccessMode,
    grade: Grade | '',
    teacherIds?: string[]
  ) => void;
  onCancel: () => void;
}) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalDatetime = (d: Date | null) =>
    d
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`
      : '';

  const [activeFrom, setActiveFrom] = useState(
    student.activeFrom ? toLocalDatetime(new Date(student.activeFrom)) : ''
  );
  const [activeTo, setActiveTo] = useState(
    student.activeTo ? toLocalDatetime(new Date(student.activeTo)) : ''
  );
  const [accessMode, setAccessMode] = useState<AccessMode>(student.accessMode);
  const [grade, setGrade] = useState<Grade | ''>(student.grade || '');

  const initialTeacherIds =
    student.teachers && student.teachers.length > 0
      ? student.teachers.map((t) => t.id)
      : student.teacherId
      ? [student.teacherId]
      : [];
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(initialTeacherIds);

  const toggleTeacher = (id: string) => {
    if (selectedTeacherIds.includes(id)) {
      if (selectedTeacherIds.length > 1) {
        setSelectedTeacherIds(selectedTeacherIds.filter((tid) => tid !== id));
      }
    } else {
      setSelectedTeacherIds([...selectedTeacherIds, id]);
    }
  };

  const selectedTeachers = teachers.filter((t) => selectedTeacherIds.includes(t.id));
  const combinedAllowedGrades = selectedTeachers.reduce<Grade[]>((acc, t) => {
    if (!t.allowedGrades || t.allowedGrades.length === 0) {
      return ALL_GRADES;
    }
    return Array.from(new Set([...acc, ...t.allowedGrades]));
  }, []);

  const gradeOptions = getTeacherGrades(
    combinedAllowedGrades.length > 0 ? combinedAllowedGrades : ALL_GRADES,
    selectedTeachers[0]?.gradeAliases as Record<string, string>
  );

  const hasCurrentGradeOption = !grade || gradeOptions.some((g) => g.value === grade);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onCancel()}
    >
      <div className="w-full max-w-md my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-6 py-4">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-[15px] font-semibold text-white">Edit Student Account</span>
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
        <div className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
          <p className="text-[13px] text-[#5f6368]">
            Editing settings for <span className="font-semibold text-[#202124]">{student.username}</span>.
          </p>

          {/* Assigned Teacher Section */}
          {isAdmin ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-[#5f6368]">
                  Assigned Teacher(s) <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-[#9aa0a6]">{selectedTeacherIds.length} selected</span>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-[#dadce0] bg-white p-1.5 space-y-1">
                {teachers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-500">
                    No teachers found.
                  </div>
                ) : (
                  teachers.map((t) => {
                    const isChecked = selectedTeacherIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-blue-300 bg-blue-50/70 text-blue-900 font-medium'
                            : 'border-transparent text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTeacher(t.id)}
                            disabled={loading || (isChecked && selectedTeacherIds.length === 1)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="truncate">
                            {t.nameAlias ? `${t.nameAlias} (${t.username})` : t.username}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                          {t.role === 'ADMIN' ? 'Admin Teacher' : 'Teacher'}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="mt-1 text-[11px] text-[#9aa0a6]">
                Assigned teachers can see this student and student can switch between their classrooms.
              </p>
            </div>
          ) : (
            (student.teachers && student.teachers.length > 0 ? student.teachers : student.teacher ? [student.teacher] : []).length > 0 && (
              <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
                <div className="flex items-center gap-1.5 font-medium">
                  <UserCheck size={14} />
                  <span>Assigned Teachers:</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(student.teachers && student.teachers.length > 0 ? student.teachers : student.teacher ? [student.teacher] : []).map((t) => (
                    <span key={t.id} className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px]">
                      {t.nameAlias || t.username}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">
              Grade <span className="font-normal text-[#9aa0a6]">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade | '')}
                disabled={loading}
                className="w-full appearance-none rounded-lg border border-[#dadce0] bg-white px-3.5 py-2.5 text-sm text-[#202124] outline-none transition-all hover:border-[#c4c7cc] focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">- Select grade -</option>
                {gradeOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
                {!hasCurrentGradeOption && grade && (
                  <option key={grade} value={grade}>
                    {GRADE_LABELS[grade as Grade] || grade} (Current)
                  </option>
                )}
              </select>
              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#5f6368]">Access Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(['GRADE', 'CUSTOM'] as AccessMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAccessMode(mode)}
                  disabled={loading}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                    accessMode === mode
                      ? mode === 'CUSTOM'
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-blue-500/30 bg-blue-100 text-blue-500'
                      : 'border-[#e8eaed] bg-white text-[#5f6368] hover:bg-[#f8f9fa]'
                  }`}
                >
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
            <DateTimePicker
              label="Active From (blank = immediate)"
              value={activeFrom}
              onChange={setActiveFrom}
              disabled={loading}
            />
            <DateTimePicker
              label="Active Until (blank = no expiry)"
              value={activeTo}
              onChange={setActiveTo}
              disabled={loading}
              minDate={activeFrom}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button type="button" variant="outline" onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            isPending={loading}
            onPress={() => onConfirm(activeFrom, activeTo, accessMode, grade, isAdmin ? selectedTeacherIds : undefined)}
            isDisabled={loading}
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

export default EditStudentModal;
