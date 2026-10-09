'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStudentColor } from '@/lib/exams';
import { Button } from '@heroui/react';
import {
  Layers,
  ArrowLeft,
  Calendar,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Award,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface GroupDetailClientProps {
  groupId: string;
}

export default function GroupDetailClient({ groupId }: GroupDetailClientProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const res = await fetch(`/api/exam-groups/${groupId}`);
        if (!res.ok) {
          throw new Error('Failed to load exam group details');
        }
        const json = await res.json();
        setData(json.group);
      } catch (err: any) {
        setError(err.message || 'Error loading group');
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroup();
  }, [groupId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-purple-600" />
        <p className="text-sm font-medium text-gray-500">Loading group analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-3">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h3 className="font-bold text-gray-900 text-lg">Unable to load group</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">{error}</p>
        <Link href="/exams-portal/groups">
          <Button size="sm" variant="outline" className="mt-2 text-xs">
            Back to Groups
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/exams-portal/groups"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Exam Groups
        </Link>
      </div>

      {/* Group Info Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-purple-50 text-purple-600">
            <Layers size={18} />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700">
            Multi-Part Exam Group
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          {data.name}
        </h1>
        {data.description && (
          <p className="text-xs sm:text-sm text-gray-600 max-w-xl">{data.description}</p>
        )}
      </div>

      {/* Child Exams in this Group */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Award size={18} className="text-blue-600" />
          Papers In This Group ({data.exams?.length || 0})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.exams?.map((exam: any) => (
            <div
              key={exam.id}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 text-xs text-gray-500">
                  <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {exam.subject}
                  </span>
                  <span>{new Date(exam.examDate).toLocaleDateString('en-GB')}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-base">{exam.title}</h3>

                <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 bg-gray-50 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Graded</span>
                    <span className="font-bold text-gray-800">{exam.stats?.totalGraded || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Avg Mark</span>
                    <span className="font-bold text-blue-600">{exam.stats?.averageMark || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Pass Mark</span>
                    <span className="font-bold text-rose-600">{exam.thresholdMarks}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                <Link href={`/exams-portal/exams/${exam.id}`} className="flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-semibold h-8 rounded-lg bg-blue-50 text-blue-600 border-blue-200"
                  >
                    <TrendingUp size={14} />
                    View Chart
                  </Button>
                </Link>
                <Link href={`/exams-portal/exams/${exam.id}/marks`} className="flex-1">
                  <Button
                    size="sm"
                    className="w-full text-xs font-semibold h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <FileSpreadsheet size={14} />
                    Log Book
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Combined Performance Roster */}
      {data.combinedRoster && data.combinedRoster.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-base">
              Combined Student Performances ({data.combinedRoster.length} Students)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregate score calculated across all papers in this exam group
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {data.combinedRoster.map((student: any) => {
              const colors = getStudentColor(student.username);
              return (
                <div
                  key={student.studentId}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs"
                      style={{ backgroundColor: colors.color }}
                    >
                      {student.username.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {student.username}
                        </span>
                        {student.isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        {student.scores?.map((sc: any) => (
                          <span key={sc.examId} className="bg-gray-100 px-2 py-0.5 rounded-md font-mono text-[11px]">
                            {sc.examTitle}: {sc.isAbsent ? 'Absent' : sc.marks ?? '-'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:justify-end">
                    <div className="text-right">
                      <span className="font-bold text-gray-900 text-base">
                        {student.totalMarks} / {student.maxPossible}
                      </span>
                      <span className="text-xs font-semibold text-purple-600 block">
                        {student.percentage}% Combined
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
