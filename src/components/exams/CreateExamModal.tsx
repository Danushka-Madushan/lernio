'use client';

import { useState } from 'react';
import { Grade } from '@/generated/client/enums';
import { getTeacherGrades } from '@/lib/constants';
import { Button } from '@heroui/react';
import { X, Award, Plus, Calendar, Layers, FileText, ChevronDown, Loader2 } from 'lucide-react';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newExam: any) => void;
  allowedGrades?: Grade[] | null;
  gradeAliases?: Record<string, string> | null;
  examGroups: { id: string; name: string }[];
  onCreateGroupRequested?: () => void;
}

export default function CreateExamModal({
  isOpen,
  onClose,
  onCreated,
  allowedGrades,
  gradeAliases,
  examGroups,
  onCreateGroupRequested,
}: CreateExamModalProps) {
  const gradeOptions = getTeacherGrades(allowedGrades, gradeAliases);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState<Grade | ''>(gradeOptions[0]?.value || '');
  const [examGroupId, setExamGroupId] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [thresholdMarks, setThresholdMarks] = useState('50');
  const [maxMarks, setMaxMarks] = useState('100');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !grade || !examDate) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          grade,
          examGroupId: examGroupId || null,
          examDate: new Date(examDate).toISOString(),
          thresholdMarks: parseFloat(thresholdMarks) || 50,
          maxMarks: parseFloat(maxMarks) || 100,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create exam');
      }

      onCreated(data.exam);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating the exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs overflow-y-auto"
      onKeyDown={(e) => e.key === 'Escape' && !isSubmitting && onClose()}
    >
      <div className="w-full max-w-lg my-auto overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300">
        {/* Modal Header */}
        <div className="bg-linear-to-br from-blue-600 via-blue-500 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award size={18} className="text-white" />
              <span className="text-base font-semibold text-white">Create New Exam</span>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Exam Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Exam Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Science Paper I (MCQ)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject & Grade Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Grade <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  className="w-full appearance-none px-3.5 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                >
                  {gradeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Exam Group Selection (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Layers size={13} /> Exam Group (Optional)
              </label>
              {onCreateGroupRequested && (
                <button
                  type="button"
                  onClick={onCreateGroupRequested}
                  className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                >
                  <Plus size={12} /> New Group
                </button>
              )}
            </div>
            <div className="relative">
              <select
                value={examGroupId}
                onChange={(e) => setExamGroupId(e.target.value)}
                className="w-full appearance-none px-3.5 py-2 text-sm rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
              >
                <option value="">Standalone Exam (No Group)</option>
                {examGroups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Grouping links multi-part tests like Science I and Science II together.
            </p>
          </div>

          {/* Exam Date & Threshold Marks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Pass Mark (Cutoff)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={thresholdMarks}
                onChange={(e) => setThresholdMarks(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Max Marks
              </label>
              <input
                type="number"
                min={1}
                required
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Provide test instructions, syllabus units, or physical exam details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onPress={onClose}
              isDisabled={isSubmitting}
              className="text-xs font-medium h-9 px-4 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isDisabled={isSubmitting}
              className="text-xs font-semibold h-9 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Create Exam'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
