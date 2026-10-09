'use client';

import Link from 'next/link';
import { Grade } from '@/generated/client/enums';
import { getGradeLabel } from '@/lib/constants';
import { ChevronRight, Calendar, User, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { Button } from '@heroui/react';

interface StudentExamCardProps {
  exam: {
    id: string;
    title: string;
    description?: string | null;
    subject: string;
    grade: Grade;
    examGroup?: { id: string; name: string } | null;
    teacher?: { id: string; username: string; gradeAliases?: Record<string, string> | null } | null;
    thresholdMarks: number;
    maxMarks: number;
    examDate: string;
    myResult: {
      marks: number | null;
      isAbsent: boolean;
      remarks?: string | null;
      isGraded: boolean;
      isAboveThreshold: boolean;
      diffFromThreshold: number | null;
      rank: number | null;
      totalGraded: number;
    };
  };
}

export default function StudentExamCard({ exam }: StudentExamCardProps) {
  const { myResult } = exam;
  const gradeLabel = getGradeLabel(exam.grade, exam.teacher?.gradeAliases);

  const formattedDate = new Date(exam.examDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between">
      {/* Top Banner / Tags */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {exam.subject}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {gradeLabel}
            </span>
            {exam.examGroup && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                <Layers size={11} /> {exam.examGroup.name}
              </span>
            )}
          </div>

          <div className="flex items-center text-xs text-gray-500 gap-1">
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-3 line-clamp-1">
          {exam.title}
        </h3>

        {/* Score & Threshold Callout Box (Mobile-first prominent display) */}
        <div className="bg-[#f8f9fa] rounded-xl p-3.5 border border-gray-200/80 mb-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Your Result
            </span>
            {myResult.rank && (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Rank #{myResult.rank} of {myResult.totalGraded}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-baseline gap-2">
            {myResult.isAbsent ? (
              <span className="text-2xl font-bold text-amber-600">Absent</span>
            ) : myResult.isGraded ? (
              <>
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {myResult.marks}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  / {exam.maxMarks} marks
                </span>
              </>
            ) : (
              <span className="text-xl font-bold text-gray-400">Not Graded Yet</span>
            )}
          </div>

          {/* Threshold Pill */}
          {myResult.isGraded && (
            <div className="mt-2.5 flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  myResult.isAboveThreshold
                    ? 'bg-emerald-100/80 text-emerald-800'
                    : 'bg-rose-100/80 text-rose-800'
                }`}
              >
                {myResult.isAboveThreshold ? (
                  <>
                    <CheckCircle2 size={13} /> Passed (+{myResult.diffFromThreshold} marks)
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} /> Needs Improvement ({myResult.diffFromThreshold} marks)
                  </>
                )}
              </span>
            </div>
          )}

          {myResult.remarks && (
            <p className="mt-2 text-xs italic text-gray-600 border-t border-gray-200/60 pt-2">
              Teacher Note: &ldquo;{myResult.remarks}&rdquo;
            </p>
          )}
        </div>

        {/* Teacher Info */}
        {exam.teacher && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={13} />
            <span>Teacher: {exam.teacher.username}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3 bg-gray-50/70 border-t border-gray-100">
        <Link href={`/exams-portal/exams/${exam.id}`} className="block w-full">
          <Button
            variant="outline"
            className="w-full text-xs font-semibold h-9 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 transition-colors"
          >
            View Result Diagram & Analytics
            <ChevronRight size={15} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
