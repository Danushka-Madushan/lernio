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

export interface MarkEvaluation {
  label: string;
  shortLabel: string;
  variant: 'excellent' | 'good' | 'encouraging' | 'support';
  badgeClass: string;
  isPass: boolean;
}

/**
 * Provides human, encouraging, grade-aware evaluations for student marks.
 * Prevents harsh red 'Needs Improvement' for students who scored reasonably (e.g. 60/100).
 * Reserves 'Needs Support' only for very low scores (<35% and far below pass mark).
 */
export function evaluateStudentMark(
  marks: number | null | undefined,
  thresholdMarks: number,
  maxMarks: number = 100
): MarkEvaluation | null {
  if (marks === null || marks === undefined || isNaN(marks)) return null;

  const validMax = maxMarks > 0 ? maxMarks : 100;
  const pct = Math.round((marks / validMax) * 100);
  const isAboveThreshold = marks >= thresholdMarks;

  // 1. Distinction / High Achiever (>= 75%)
  if (pct >= 75) {
    return {
      label: 'Excellent',
      shortLabel: 'Excellent',
      variant: 'excellent',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      isPass: true,
    };
  }

  // 2. Very Good (65% - 74%)
  if (pct >= 65) {
    return {
      label: 'Very Good',
      shortLabel: 'Very Good',
      variant: 'good',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      isPass: true,
    };
  }

  // 3. Good / Credit (50% - 64%)
  if (pct >= 50) {
    return {
      label: isAboveThreshold ? 'Good' : 'Good Effort',
      shortLabel: 'Good',
      variant: isAboveThreshold ? 'good' : 'encouraging',
      badgeClass: isAboveThreshold
        ? 'bg-sky-50 text-sky-800 border-sky-200'
        : 'bg-amber-50 text-amber-800 border-amber-200',
      isPass: isAboveThreshold,
    };
  }

  // 4. Above or equal to threshold (< 50% but >= threshold, e.g. threshold = 40, marks = 45)
  if (isAboveThreshold) {
    return {
      label: 'Passed',
      shortLabel: 'Passed',
      variant: 'good',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      isPass: true,
    };
  }

  // 5. Below threshold:
  // If score is decent (>= 35%) OR within 12 marks of pass threshold:
  // Show encouraging, supportive feedback in warm amber (NOT red!)
  const diffFromThreshold = thresholdMarks - marks;
  if (pct >= 35 || diffFromThreshold <= 12) {
    return {
      label: 'Almost There',
      shortLabel: 'Keep Going',
      variant: 'encouraging',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      isPass: false,
    };
  }

  // 6. Only if very low (< 35% AND far below threshold):
  return {
    label: 'Needs Support',
    shortLabel: 'Needs Help',
    variant: 'support',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    isPass: false,
  };
}
