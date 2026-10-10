'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CreateExamGroupModal from '@/components/exams/CreateExamGroupModal';
import ExamGroupDeleteConfirmModal from '@/components/exams/ExamGroupDeleteConfirmModal';
import LoadingScreen from '@/components/LoadingScreen';
import { Button } from '@heroui/react';
import {
  Layers,
  Plus,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function GroupsClient() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exam-groups');
      if (!res.ok) {
        throw new Error('Failed to load exam groups');
      }
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message || 'Error loading groups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleConfirmDeleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam-groups/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete group');
      }
      setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || 'Error deleting group');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/exams-portal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Exams
        </Link>

        <Button
          onPress={() => setIsCreateOpen(true)}
          className="text-xs font-semibold h-9 px-4 rounded-xl bg-purple-600 text-white shadow-xs hover:bg-purple-700"
        >
          <Plus size={15} />
          Create Exam Group
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1 rounded-lg bg-purple-50 text-purple-600">
            <Layers size={18} />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Exam Groups (Multi-Part Tests)
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl">
          Group related physical examination papers together (e.g. Science Paper I and Paper II). View aggregate student performances and combined scores.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 shadow-2xs">
          <Layers size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-semibold text-gray-800 text-base">No Groups Created Yet</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Exam groups allow you to package tests like Term 1 Science (Paper 1 + Paper 2) together.
          </p>
          <Button
            onPress={() => setIsCreateOpen(true)}
            className="mt-4 text-xs font-semibold px-4 h-9 rounded-xl bg-purple-600 text-white hover:bg-purple-700"
          >
            <Plus size={15} className="mr-1" /> New Exam Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                    <Layers size={11} /> {group.exams?.length || 0} Papers
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(group.createdAt).toLocaleDateString('en-GB', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1">
                  {group.name}
                </h3>

                {group.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                    {group.description}
                  </p>
                )}

                {/* Child Exams Preview */}
                <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                  {group.exams && group.exams.length > 0 ? (
                    group.exams.map((ex: any) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-gray-50 text-gray-700"
                      >
                        <span className="truncate font-medium">{ex.title}</span>
                        <span className="text-[11px] text-gray-500 shrink-0 font-mono">
                          {ex.thresholdMarks} cutoff
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">No exams assigned to this group yet</p>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2">
                <Link href={`/exams-portal/groups/${group.id}`} className="flex-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-semibold h-8 rounded-lg bg-purple-50 text-purple-700 border-purple-200"
                  >
                    View Group Analytics
                    <ChevronRight size={14} />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(group)}
                  disabled={deleteLoading && deleteTarget?.id === group.id}
                  title="Delete Group"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ExamGroupDeleteConfirmModal
          target={deleteTarget}
          loading={deleteLoading}
          onConfirm={handleConfirmDeleteGroup}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <CreateExamGroupModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newGroup) => {
          setGroups((prev) => [newGroup, ...prev]);
        }}
      />
    </div>
  );
}
