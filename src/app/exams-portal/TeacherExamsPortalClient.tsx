'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Grade } from '@/generated/client/enums';
import { getGradeLabel } from '@/lib/constants';
import CreateExamModal from '@/components/exams/CreateExamModal';
import CreateExamGroupModal from '@/components/exams/CreateExamGroupModal';
import { Button } from '@heroui/react';
import {
  Award,
  Plus,
  Search,
  Layers,
  Calendar,
  Users,
  TrendingUp,
  BarChart2,
  Trash2,
  FileSpreadsheet,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface TeacherExamsPortalClientProps {
  teacherId: string;
  allowedGrades?: Grade[] | null;
  gradeAliases?: Record<string, string> | null;
  isAdmin: boolean;
}

export default function TeacherExamsPortalClient({
  teacherId,
  allowedGrades,
  gradeAliases,
  isAdmin,
}: TeacherExamsPortalClientProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [examsRes, groupsRes] = await Promise.all([
        fetch('/api/exams'),
        fetch('/api/exam-groups'),
      ]);

      if (!examsRes.ok || !groupsRes.ok) {
        throw new Error('Failed to load portal data');
      }

      const examsData = await examsRes.json();
      const groupsData = await groupsRes.json();

      setExams(examsData.exams || []);
      setGroups(groupsData.groups || []);
    } catch (err: any) {
      setError(err.message || 'Error loading exams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteExam = async (examId: string) => {
    if (!window.confirm('Are you sure you want to delete this exam? All logged marks will be permanently removed.')) {
      return;
    }

    setDeletingExamId(examId);
    try {
      const res = await fetch(`/api/exams/${examId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete exam');
      }
      setExams((prev) => prev.filter((e) => e.id !== examId));
    } catch (err: any) {
      alert(err.message || 'Error deleting exam');
    } finally {
      setDeletingExamId(null);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.examGroup && exam.examGroup.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade = selectedGrade === 'all' || exam.grade === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  // Aggregate stats across teacher exams
  const totalAssignedMarks = exams.reduce((acc, curr) => acc + (curr.stats?.totalGraded || 0), 0);
  const overallAvgPassRate =
    exams.length > 0
      ? Math.round(
          exams.reduce((acc, curr) => acc + (curr.stats?.passRate || 0), 0) / exams.length
        )
      : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Loading exams portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-2">
            <Award size={12} />
            Academic Examination Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Exams & Evaluation Portal
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
            Create physical test records, manage multi-part test groups (e.g. Science I & II), log marks in the roster book, and track class score distributions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onPress={() => setIsCreateGroupOpen(true)}
            className="text-xs font-semibold h-10 px-4 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
          >
            <Layers size={16} />
            New Exam Group
          </Button>

          <Button
            onPress={() => setIsCreateExamOpen(true)}
            className="text-xs font-semibold h-10 px-4.5 rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700"
          >
            <Plus size={16} />
            Create Exam
          </Button>
        </div>
      </div>

      {/* Aggregate Overview Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500 block">Total Exams Conducted</span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block">{exams.length}</span>
          <span className="text-[11px] text-gray-400 mt-0.5 block">{groups.length} active exam groups</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500 block">Students Evaluated</span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block">{totalAssignedMarks}</span>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Logged mark entries</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="text-xs font-medium text-gray-500 block">Average Pass Rate</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">{overallAvgPassRate}%</span>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Above pass mark</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search exams by title, subject, or group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Grade Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedGrade('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGrade === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Grades
          </button>
          {Object.values(Grade).map((g) => {
            if (allowedGrades && allowedGrades.length > 0 && !allowedGrades.includes(g)) {
              return null;
            }
            return (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedGrade === g
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {getGradeLabel(g, gradeAliases)}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Exams Cards Grid */}
      {filteredExams.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs">
          <Award size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-semibold text-gray-800 text-base">No Exams Yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No exams match your search criteria.'
              : 'Create your first physical examination log to enter marks and view distribution diagrams.'}
          </p>
          <Button
            onPress={() => setIsCreateExamOpen(true)}
            className="mt-4 text-xs font-semibold px-4 h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={15} className="mr-1" /> Create Exam
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const gradeLabel = getGradeLabel(exam.grade, gradeAliases);
            const formattedDate = new Date(exam.examDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div className="p-4 sm:p-5">
                  {/* Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
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

                    <div className="flex items-center text-xs text-gray-500 gap-1">
                      <Calendar size={13} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 text-base mb-3 line-clamp-1">
                    {exam.title}
                  </h3>

                  {/* Quick Stat Pill */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-center mb-3">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Graded</span>
                      <span className="text-sm font-bold text-gray-900">
                        {exam.stats?.totalGraded || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Avg Mark</span>
                      <span className="text-sm font-bold text-blue-600">
                        {exam.stats?.averageMark || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase block">Pass Mark</span>
                      <span className="text-sm font-bold text-rose-600">
                        {exam.thresholdMarks}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Link href={`/exams-portal/exams/${exam.id}`} className="flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs font-semibold h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 rounded-lg"
                      >
                        <TrendingUp size={14} />
                        Chart
                      </Button>
                    </Link>

                    <Link href={`/exams-portal/exams/${exam.id}/marks`} className="flex-1">
                      <Button
                        size="sm"
                        className="w-full text-xs font-semibold h-8 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                      >
                        <FileSpreadsheet size={14} />
                        Log Book
                      </Button>
                    </Link>
                  </div>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    disabled={deletingExamId === exam.id}
                    title="Delete Exam"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateExamModal
        isOpen={isCreateExamOpen}
        onClose={() => setIsCreateExamOpen(false)}
        onCreated={(newExam) => {
          setExams((prev) => [newExam, ...prev]);
        }}
        allowedGrades={allowedGrades}
        gradeAliases={gradeAliases}
        examGroups={groups}
        onCreateGroupRequested={() => {
          setIsCreateExamOpen(false);
          setIsCreateGroupOpen(true);
        }}
      />

      <CreateExamGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreated={(newGroup) => {
          setGroups((prev) => [newGroup, ...prev]);
        }}
      />
    </div>
  );
}
