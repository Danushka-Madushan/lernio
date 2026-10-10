'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MarkLogBookTable, { RosterStudent } from '@/components/exams/MarkLogBookTable';
import LoadingScreen from '@/components/LoadingScreen';
import { ArrowLeft, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@heroui/react';

interface MarksLogBookClientProps {
  examId: string;
}

export default function MarksLogBookClient({ examId }: MarksLogBookClientProps) {
  const [data, setData] = useState<{
    exam: {
      id: string;
      title: string;
      grade: string;
      thresholdMarks: number;
      maxMarks: number;
    };
    roster: RosterStudent[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoster = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exams/${examId}/marks`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load student roster');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [examId]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-3">
        <AlertCircle size={40} className="text-rose-500 mx-auto" />
        <h3 className="font-bold text-gray-900 text-lg">Unable to load roster</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">{error}</p>
        <Link href="/exams-portal">
          <Button size="sm" variant="outline" className="mt-2 text-xs">
            Back to All Exams
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/exams-portal"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to All Exams
        </Link>

        <Link href={`/exams-portal/exams/${examId}`}>
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-semibold h-8 rounded-xl bg-blue-50 text-blue-600 border-blue-200"
          >
            <TrendingUp size={14} />
            View Result Diagram
          </Button>
        </Link>
      </div>

      {/* Roster & Grading Table */}
      <MarkLogBookTable
        examId={examId}
        examTitle={data.exam.title}
        thresholdMarks={data.exam.thresholdMarks}
        maxMarks={data.exam.maxMarks}
        initialRoster={data.roster}
        onSaved={loadRoster}
      />
    </div>
  );
}
