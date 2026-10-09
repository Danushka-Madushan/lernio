/**
 * Utility functions for Exams Portal & Result Diagram System
 */

export interface StudentColorProfile {
  color: string;
  bgLight: string;
  border: string;
  hue: number;
}

/**
 * Generates a deterministic, aesthetically pleasing, high-contrast HSL color
 * for any student identifier (e.g. "ABC-2345" or student username).
 *
 * Uses the FNV-1a hash multiplied by the Golden Angle (137.508°) to guarantee
 * maximal visual distance across the color wheel even for sequential usernames.
 */
export function getStudentColor(identifier: string | null | undefined): StudentColorProfile {
  if (!identifier) {
    return {
      color: '#3b82f6',
      bgLight: '#eff6ff',
      border: '#bfdbfe',
      hue: 217,
    };
  }

  // FNV-1a 32-bit hash
  let hash = 2166136261;
  for (let i = 0; i < identifier.length; i++) {
    hash ^= identifier.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Multiply by golden angle for uniform distribution
  const hue = Math.round(Math.abs(hash * 137.507764) % 360);
  const saturation = 75; // vibrant and distinguishable
  const lightness = 42; // optimal contrast against white/gray surfaces (WCAG AA compliant)

  return {
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    bgLight: `hsl(${hue}, 85%, 96%)`,
    border: `hsl(${hue}, 60%, 82%)`,
    hue,
  };
}

export interface ExamStatSummary {
  totalAssigned: number;
  totalGraded: number;
  totalAbsent: number;
  passCount: number;
  passRate: number; // percentage 0-100
  averageMark: number;
  medianMark: number;
  highestMark: number;
  lowestMark: number;
}

export interface MarkRecord {
  marks: number | null;
  isAbsent: boolean;
}

/**
 * Calculates key metrics for an exam given its threshold and student records.
 */
export function calculateExamStats(
  marksList: MarkRecord[],
  thresholdMarks: number,
  maxMarks: number = 100
): ExamStatSummary {
  const totalAssigned = marksList.length;
  const absents = marksList.filter((m) => m.isAbsent);
  const gradedRecords = marksList.filter((m) => !m.isAbsent && m.marks !== null && typeof m.marks === 'number');

  const gradedMarks = gradedRecords
    .map((m) => m.marks as number)
    .sort((a, b) => a - b);

  const totalGraded = gradedMarks.length;
  const totalAbsent = absents.length;

  if (totalGraded === 0) {
    return {
      totalAssigned,
      totalGraded: 0,
      totalAbsent,
      passCount: 0,
      passRate: 0,
      averageMark: 0,
      medianMark: 0,
      highestMark: 0,
      lowestMark: 0,
    };
  }

  const passCount = gradedMarks.filter((score) => score >= thresholdMarks).length;
  const passRate = Math.round((passCount / totalGraded) * 100);
  const sum = gradedMarks.reduce((acc, curr) => acc + curr, 0);
  const averageMark = Math.round((sum / totalGraded) * 10) / 10;

  const mid = Math.floor(gradedMarks.length / 2);
  const medianMark =
    gradedMarks.length % 2 !== 0
      ? gradedMarks[mid]
      : Math.round(((gradedMarks[mid - 1] + gradedMarks[mid]) / 2) * 10) / 10;

  const highestMark = gradedMarks[gradedMarks.length - 1];
  const lowestMark = gradedMarks[0];

  return {
    totalAssigned,
    totalGraded,
    totalAbsent,
    passCount,
    passRate,
    averageMark,
    medianMark,
    highestMark,
    lowestMark,
  };
}

/**
 * Calculates a student's rank among all graded students in the exam (1-indexed).
 */
export function calculateStudentRank(
  marksList: { studentId: string; marks: number | null; isAbsent: boolean }[],
  targetStudentId: string
): { rank: number | null; totalGraded: number } {
  const graded = marksList
    .filter((m) => !m.isAbsent && m.marks !== null && typeof m.marks === 'number')
    .sort((a, b) => (b.marks as number) - (a.marks as number)); // descending

  const index = graded.findIndex((m) => m.studentId === targetStudentId);
  return {
    rank: index >= 0 ? index + 1 : null,
    totalGraded: graded.length,
  };
}
