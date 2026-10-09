'use client';

import { ExamStatSummary } from '@/lib/exams';
import { Award, Users, TrendingUp, CheckCircle, BarChart2 } from 'lucide-react';

interface ExamStatsOverviewProps {
  stats: ExamStatSummary;
  thresholdMarks: number;
  maxMarks?: number;
}

export default function ExamStatsOverview({
  stats,
  thresholdMarks,
  maxMarks = 100,
}: ExamStatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Pass Rate */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 mb-2">
          <span className="text-xs font-medium">Pass Rate</span>
          <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle size={15} />
          </span>
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            {stats.passRate}%
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {stats.passCount} of {stats.totalGraded} passed
          </p>
        </div>
      </div>

      {/* Class Average */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 mb-2">
          <span className="text-xs font-medium">Class Average</span>
          <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp size={15} />
          </span>
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            {stats.averageMark}
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Median: {stats.medianMark}
          </p>
        </div>
      </div>

      {/* Highest Mark */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 mb-2">
          <span className="text-xs font-medium">Highest Mark</span>
          <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
            <Award size={15} />
          </span>
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            {stats.highestMark}
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Lowest: {stats.lowestMark}
          </p>
        </div>
      </div>

      {/* Threshold Cutoff */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-gray-500 mb-2">
          <span className="text-xs font-medium">Pass Mark</span>
          <span className="p-1 rounded-lg bg-rose-50 text-rose-600">
            <BarChart2 size={15} />
          </span>
        </div>
        <div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            {thresholdMarks}
          </span>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Out of {maxMarks} marks
          </p>
        </div>
      </div>
    </div>
  );
}
