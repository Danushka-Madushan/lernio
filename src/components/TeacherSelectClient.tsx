'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Grade } from '@/generated/client/enums';
import { getTeacherGrades } from '@/lib/constants';
import LogoutButton from '@/components/LogoutButton';
import { Users, GraduationCap, CheckCircle2, ChevronRight, Loader2, BookOpen } from 'lucide-react';

interface TeacherItem {
  id: string;
  username: string;
  allowedGrades: Grade[];
  gradeAliases: Record<string, string> | null;
}

interface TeacherSelectClientProps {
  teachers: TeacherItem[];
  currentActiveTeacherId: string | null;
  studentUsername: string;
}

export default function TeacherSelectClient({
  teachers,
  currentActiveTeacherId,
  studentUsername,
}: TeacherSelectClientProps) {
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectTeacher = async (teacherId: string) => {
    if (selectingId) return;
    setSelectingId(teacherId);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/student/active-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to select classroom.');
      }

      // Hard redirect to root dashboard to ensure fresh server layout and cookie state
      window.location.href = '/';
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while switching classroom.');
      setSelectingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 shrink-0">
              <Image
                src="/icon.svg"
                alt="Lernio Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-semibold tracking-tight text-blue-600">
              Lernio
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline-block">
              Logged in as <strong className="text-gray-800">{studentUsername}</strong>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs mb-4">
            <Users size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Choose Your Classroom
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-md mx-auto">
            You are enrolled with multiple teachers. Select a classroom to view their video lessons, live sessions, and announcements.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm max-w-lg mx-auto w-full text-center">
            {errorMessage}
          </div>
        )}

        {teachers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-md mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <GraduationCap size={24} />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No Classrooms Available</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              You are not currently enrolled under any teacher. Please contact your school administrator to assign you to a classroom.
            </p>
            <LogoutButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
            {teachers.map((teacher) => {
              const isSelected = teacher.id === currentActiveTeacherId;
              const isPending = selectingId === teacher.id;
              const teacherGrades = getTeacherGrades(
                teacher.allowedGrades,
                teacher.gradeAliases
              );

              return (
                <button
                  key={teacher.id}
                  onClick={() => handleSelectTeacher(teacher.id)}
                  disabled={Boolean(selectingId)}
                  className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  } ${Boolean(selectingId) && !isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {/* Top info */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-lg flex items-center justify-center shadow-xs">
                        {teacher.username.charAt(0).toUpperCase()}
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 size={12} className="text-blue-600" />
                          Current Active
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {teacher.username}
                    </h2>

                    {/* Grades list */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {teacherGrades.length > 0 ? (
                        teacherGrades.map((g) => (
                          <span
                            key={g.value}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200"
                          >
                            <BookOpen size={10} className="text-gray-500" />
                            {g.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">All Grades</span>
                      )}
                    </div>
                  </div>

                  {/* Action footer */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-blue-600">
                    <span>
                      {isPending
                        ? 'Entering Classroom...'
                        : isSelected
                        ? 'Resume Classroom'
                        : 'Enter Classroom'}
                    </span>
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
