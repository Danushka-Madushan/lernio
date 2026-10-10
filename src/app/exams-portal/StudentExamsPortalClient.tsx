'use client';

import { useState, useEffect } from 'react';
import StudentExamCard from '@/components/exams/StudentExamCard';
import LoadingScreen from '@/components/LoadingScreen';
import { Award, Search, Sparkles, Filter, CheckCircle2, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

interface StudentExamItem {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  grade: any;
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
}

export default function StudentExamsPortalClient() {
  const [exams, setExams] = useState<StudentExamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  useEffect(() => {
    async function fetchExams() {
      try {
        const res = await fetch('/api/student/exams');
        if (!res.ok) {
          throw new Error('Failed to load your exams');
        }
        const data = await res.json();
        setExams(data.exams || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchExams();
  }, []);

  const subjects = Array.from(new Set(exams.map((e) => e.subject)));

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.examGroup && exam.examGroup.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject = selectedSubject === 'all' || exam.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  // Calculate high-level student performance metrics
  const gradedExams = exams.filter((e) => e.myResult.isGraded);
  const passedExams = gradedExams.filter((e) => e.myResult.isAboveThreshold);
  const avgPercentage =
    gradedExams.length > 0
      ? Math.round(
          (gradedExams.reduce((acc, curr) => acc + (curr.myResult.marks || 0), 0) /
            gradedExams.reduce((acc, curr) => acc + curr.maxMarks, 0)) *
            100
        )
      : 0;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Overview Header */}
      <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Award size={220} />
        </div>

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-2">
            <Sparkles size={13} />
            Student Academic Log
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Exams & Results Portal
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1.5">
            Review your physical exam marks, pass threshold comparisons, and class performance distribution charts.
          </p>
        </div>

        {/* Quick Summary Pill Row (Mobile-first glance) */}
        {gradedExams.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-white/20 text-center">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-[11px] text-blue-100 block">Total Exams</span>
              <span className="text-lg sm:text-xl font-bold">{exams.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-[11px] text-blue-100 block">Passed</span>
              <span className="text-lg sm:text-xl font-bold">
                {passedExams.length}/{gradedExams.length}
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
              <span className="text-[11px] text-blue-100 block">Average</span>
              <span className="text-lg sm:text-xl font-bold">{avgPercentage}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Search & Subject Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search exam or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Subject Pills Filter */}
        {subjects.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSubject === sub
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs">
          <Award size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-semibold text-gray-800 text-base">No Exams Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No exams match your search criteria. Try clearing the search query.'
              : 'You have not been assigned to any exams yet. Your teacher will log marks once exams are conducted.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => (
            <StudentExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  );
}
