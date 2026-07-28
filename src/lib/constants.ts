import { Grade } from './db';

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
