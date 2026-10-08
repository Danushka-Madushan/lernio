import { Grade } from '@/generated/client/enums';

export const GRADE_LABELS: Record<Grade, string> = {
  GRADE_6: 'Grade 6',
  GRADE_7: 'Grade 7',
  GRADE_8: 'Grade 8',
  GRADE_9: 'Grade 9',
  GRADE_10: 'Grade 10',
  GRADE_11: 'Grade 11',
};

export const GRADE_COLORS: Record<Grade, string> = {
  GRADE_6: 'bg-purple-50 text-purple-700',
  GRADE_7: 'bg-blue-50 text-blue-700',
  GRADE_8: 'bg-cyan-50 text-cyan-700',
  GRADE_9: 'bg-green-50 text-green-700',
  GRADE_10: 'bg-yellow-50 text-yellow-700',
  GRADE_11: 'bg-orange-50 text-orange-700',
};

export const ALL_GRADES: Grade[] = [
  Grade.GRADE_6,
  Grade.GRADE_7,
  Grade.GRADE_8,
  Grade.GRADE_9,
  Grade.GRADE_10,
  Grade.GRADE_11,
];

export function getGradeLabel(
  grade: Grade | string | null | undefined,
  aliases?: Record<string, string> | null
): string {
  if (!grade) return '';
  const key = grade as string;
  if (aliases && typeof aliases[key] === 'string' && aliases[key].trim()) {
    return aliases[key].trim();
  }
  return GRADE_LABELS[grade as Grade] || String(grade).replace('GRADE_', 'Grade ');
}

export function getTeacherGrades(
  allowedGrades?: Grade[] | null,
  aliases?: Record<string, string> | null
): { value: Grade; label: string }[] {
  const permitted =
    allowedGrades && allowedGrades.length > 0
      ? ALL_GRADES.filter((g) => allowedGrades.includes(g))
      : ALL_GRADES;

  return permitted.map((g) => ({
    value: g,
    label: getGradeLabel(g, aliases),
  }));
}

