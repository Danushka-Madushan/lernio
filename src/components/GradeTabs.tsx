// ── Grade Tabs ──────────────────────────────────────────────────────────────────

import { Grade } from '@/generated/client/enums';
import Link from 'next/link';

export interface GradeTabItem {
  label: string;
  value: Grade;
}

const defaultGradeMapping: GradeTabItem[] = [
  { label: 'Grade 6', value: Grade.GRADE_6 },
  { label: 'Grade 7', value: Grade.GRADE_7 },
  { label: 'Grade 8', value: Grade.GRADE_8 },
  { label: 'Grade 9', value: Grade.GRADE_9 },
  { label: 'Grade 10', value: Grade.GRADE_10 },
  { label: 'Grade 11', value: Grade.GRADE_11 },
];

const GradeTabs = ({
  activeGrade,
  grades,
}: {
  activeGrade?: Grade;
  grades?: GradeTabItem[];
}) => {
  const displayGrades = grades && grades.length > 0 ? grades : defaultGradeMapping;

  return (
    <div className="flex flex-wrap gap-2 border-b border-[#e8eaed] pb-5">
      <Link
        href="/"
        className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
          !activeGrade
            ? 'bg-blue-500 text-white shadow-sm'
            : 'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4]'
        }`}
      >
        All Grades
      </Link>
      {displayGrades.map((g) => (
        <Link
          key={g.value}
          href={`/?grade=${g.value}`}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
            activeGrade === g.value
              ? 'bg-blue-500 text-white shadow-sm'
              : 'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4]'
          }`}
        >
          {g.label}
        </Link>
      ))}
    </div>
  );
};

export default GradeTabs;
