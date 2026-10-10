'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ExamPerformanceChart from '@/components/exams/ExamPerformanceChart';
import ExamStatsOverview from '@/components/exams/ExamStatsOverview';
import { getGradeLabel } from '@/lib/constants';
import { evaluateStudentMark } from '@/lib/exams';
import LoadingScreen from '@/components/LoadingScreen';
import { Button } from '@heroui/react';
import {
  Award,
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react';

interface ExamViewClientProps {
  examId: string;
  isStudent: boolean;
}

export default function ExamViewClient({ examId, isStudent }: ExamViewClientProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExam() {
      try {
        const endpoint = isStudent ? `/api/student/exams/${examId}` : `/api/exams/${examId}`;
        const res = await fetch(endpoint);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load exam data');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchExam();
  }, [examId, isStudent]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-3">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h3 className="font-bold text-gray-900 text-lg">Unable to load exam</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">{error}</p>
        <Link href="/exams-portal">
          <Button size="sm" variant="outline" className="mt-2 text-xs">
            Back to Exams Portal
          </Button>
        </Link>
      </div>
    );
  }

  const { exam, stats, marks } = data;
  const mySummary = isStudent ? data.mySummary : null;
  const evaluation =
    isStudent && mySummary?.isGraded
      ? evaluateStudentMark(mySummary.marks, exam.thresholdMarks, exam.maxMarks)
      : null;
  const gradeLabel = getGradeLabel(exam.grade, exam.teacher?.gradeAliases);
  const formattedDate = new Date(exam.examDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Back button & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/exams-portal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Exams
        </Link>

        {!isStudent && (
          <Link href={`/exams-portal/exams/${examId}/marks`}>
            <Button
              className="text-xs font-semibold h-9 px-4 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700"
            >
              <FileSpreadsheet size={15} />
              Open Marks Log Book
            </Button>
          </Link>
        )}
      </div>

      {/* Main Exam Title Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {exam.subject}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {gradeLabel}
            </span>
            {exam.examGroup && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                <Layers size={11} /> {exam.examGroup.name}
              </span>
            )}
          </div>

          <div className="flex items-center text-xs text-gray-500 gap-1.5">
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          {exam.title}
        </h1>

        {exam.description && (
          <p className="text-xs sm:text-sm text-gray-600">{exam.description}</p>
        )}

        {exam.teacher && (
          <div className="flex items-center gap-1 text-xs text-gray-500 pt-1 border-t border-gray-100">
            <User size={12} />
            <span>Teacher: {exam.teacher.username}</span>
          </div>
        )}
      </div>

      {/* Student Personal Performance Highlight Card (Mobile-First prominence) */}
      {isStudent && mySummary && (
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-5 sm:p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-100 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={14} /> Your Exam Result
            </span>
            {mySummary.rank && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md">
                Rank #{mySummary.rank} of {mySummary.totalGraded}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              {mySummary.isAbsent ? (
                <span className="text-3xl font-extrabold text-amber-300">Absent</span>
              ) : mySummary.isGraded ? (
                <>
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                    {mySummary.marks}
                  </span>
                  <span className="text-sm font-medium text-blue-200">
                    / {exam.maxMarks} marks
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-blue-200">Pending Evaluation</span>
              )}
            </div>

            {mySummary.isGraded && evaluation && (
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    evaluation.variant === 'excellent'
                      ? 'bg-emerald-400 text-emerald-950'
                      : evaluation.variant === 'good'
                      ? 'bg-blue-300 text-blue-950'
                      : evaluation.variant === 'encouraging'
                      ? 'bg-amber-300 text-amber-950'
                      : 'bg-rose-300 text-rose-950'
                  }`}
                >
                  {evaluation.variant === 'excellent' || evaluation.variant === 'good' ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  <span>
                    {evaluation.label}
                    {mySummary.diffFromThreshold !== null && (
                      <span className="font-normal opacity-90 ml-1">
                        ({mySummary.isAboveThreshold ? `+${mySummary.diffFromThreshold}` : mySummary.diffFromThreshold})
                      </span>
                    )}
                  </span>
                </span>
              </div>
            )}
          </div>

          {mySummary.remarks && (
            <p className="mt-3 text-xs italic text-blue-100 bg-white/10 p-3 rounded-xl">
              Teacher Feedback: &ldquo;{mySummary.remarks}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Class Statistics Overview Grid */}
      {stats && (
        <ExamStatsOverview
          stats={stats}
          thresholdMarks={exam.thresholdMarks}
          maxMarks={exam.maxMarks}
        />
      )}

      {/* Result Distribution Diagram (Interactive Chart) */}
      <ExamPerformanceChart
        examTitle={exam.title}
        maxMarks={exam.maxMarks}
        thresholdMarks={exam.thresholdMarks}
        marks={marks}
        isStudentView={isStudent}
      />
    </div>
  );
}
