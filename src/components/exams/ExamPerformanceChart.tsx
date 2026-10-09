'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { getStudentColor, evaluateStudentMark } from '@/lib/exams';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@heroui/react';

export interface ChartMarkItem {
  id: string;
  studentId: string;
  username: string;
  marks: number | null;
  isAbsent: boolean;
  remarks?: string | null;
  isCurrentUser?: boolean;
}

interface ExamPerformanceChartProps {
  examTitle: string;
  maxMarks: number;
  thresholdMarks: number;
  marks: ChartMarkItem[];
  isStudentView?: boolean;
}

export default function ExamPerformanceChart({
  examTitle,
  maxMarks,
  thresholdMarks,
  marks,
  isStudentView = false,
}: ExamPerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<ChartMarkItem | null>(null);

  // Filter & sort graded students low to high along the single line
  const gradedStudents = useMemo(() => {
    return marks
      .filter((m) => !m.isAbsent && m.marks !== null && typeof m.marks === 'number')
      .map((m) => ({
        ...m,
        score: m.marks as number,
      }))
      .sort((a, b) => a.score - b.score);
  }, [marks]);

  const absentStudents = useMemo(() => {
    return marks.filter((m) => m.isAbsent);
  }, [marks]);

  const currentUserStudent = useMemo(() => {
    return marks.find((m) => m.isCurrentUser);
  }, [marks]);

  // Chart Dimensions & Spacing
  const paddingLeft = 52;
  const paddingRight = 48;
  const paddingTop = 50;
  const paddingBottom = 125; // Breathable room for vertical rotated labels and gap
  const chartHeight = 240;
  const totalSvgHeight = paddingTop + chartHeight + paddingBottom;

  const pointSpacing = 56;
  const innerWidth = Math.max(gradedStudents.length * pointSpacing, 340);
  const totalSvgWidth = paddingLeft + innerWidth + paddingRight;

  // Coordinate mappings
  const getY = (score: number) => {
    const clamped = Math.max(0, Math.min(score, maxMarks));
    const ratio = clamped / maxMarks;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  const getX = (index: number) => {
    if (gradedStudents.length <= 1) {
      return paddingLeft + innerWidth / 2;
    }
    return paddingLeft + (index / (gradedStudents.length - 1)) * innerWidth;
  };

  const thresholdY = getY(thresholdMarks);
  const baselineY = getY(0);
  const cautionMark = Math.max(0, Math.min(Math.round(thresholdMarks * 0.75), Math.round(maxMarks * 0.35)));
  const cautionY = getY(cautionMark);
  const labelStartY = paddingTop + chartHeight + 26; // Clean vertical separation from baseline

  // Polyline points
  const linePoints = gradedStudents
    .map((s, idx) => `${getX(idx)},${getY(s.score)}`)
    .join(' ');

  // Auto-scroll to "You" on mount for mobile screens
  useEffect(() => {
    if (currentUserStudent && containerRef.current && !currentUserStudent.isAbsent && currentUserStudent.marks !== null) {
      const userIndex = gradedStudents.findIndex((s) => s.studentId === currentUserStudent.studentId);
      if (userIndex >= 0) {
        const xPos = getX(userIndex);
        const containerWidth = containerRef.current.clientWidth;
        containerRef.current.scrollTo({
          left: Math.max(0, xPos - containerWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [currentUserStudent, gradedStudents]);

  const scrollToUser = () => {
    if (currentUserStudent && containerRef.current && !currentUserStudent.isAbsent && currentUserStudent.marks !== null) {
      const userIndex = gradedStudents.findIndex((s) => s.studentId === currentUserStudent.studentId);
      if (userIndex >= 0) {
        const xPos = getX(userIndex);
        const containerWidth = containerRef.current.clientWidth;
        containerRef.current.scrollTo({
          left: Math.max(0, xPos - containerWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  };

  // Evaluation for selected student drawer
  const selectedEvaluation = selectedStudent && selectedStudent.marks !== null
    ? evaluateStudentMark(selectedStudent.marks, thresholdMarks, maxMarks)
    : null;

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Chart Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp size={18} />
            </span>
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
              Result Distribution Diagram
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Class scores arranged ascending from lowest to highest along the curve
          </p>
        </div>

        {/* Minimal, Professional Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-red-500 inline-block"></span>
            <span>Pass Mark: {thresholdMarks}</span>
          </div>

          {currentUserStudent && !currentUserStudent.isAbsent && (
            <Button
              size="sm"
              variant="outline"
              onPress={scrollToUser}
              className="text-xs font-semibold px-3 py-1 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
            >
              <Sparkles size={13} className="mr-1 text-blue-500" />
              Find My Dot (You)
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-[11px] text-gray-500 flex items-center justify-between sm:hidden">
        <span>↔ Swipe sideways to view all students</span>
        <span className="font-medium text-gray-600">{gradedStudents.length} students</span>
      </div>

      {/* SVG Canvas Scroll Area - Pure Authentic White Surface */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-hidden select-none bg-white"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          width={totalSvgWidth}
          height={totalSvgHeight}
          className="block"
          style={{ minWidth: '100%' }}
        >
          <defs>
            {/* Subtle shadow for "You" callout badge */}
            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.15" floodColor="#0f172a" />
            </filter>

            {/* Three Soft Pastel Zone Gradients for Authentic, Subtle Tinting */}
            <linearGradient id="zoneGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="zoneYellowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="zoneRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.07" />
            </linearGradient>
          </defs>

          {/* ── Soft Pastel Performance Zones (Green / Yellow / Red) ── */}
          {/* Green Zone (Pass & Above) */}
          {thresholdY > getY(maxMarks) && (
            <rect
              x={paddingLeft}
              y={getY(maxMarks)}
              width={innerWidth}
              height={Math.max(0, thresholdY - getY(maxMarks))}
              fill="url(#zoneGreenGrad)"
            />
          )}

          {/* Yellow Zone (Approaching / Moderate) */}
          {cautionY > thresholdY && (
            <rect
              x={paddingLeft}
              y={thresholdY}
              width={innerWidth}
              height={Math.max(0, cautionY - thresholdY)}
              fill="url(#zoneYellowGrad)"
            />
          )}

          {/* Red Zone (Needs Support) */}
          {baselineY > cautionY && (
            <rect
              x={paddingLeft}
              y={cautionY}
              width={innerWidth}
              height={Math.max(0, baselineY - cautionY)}
              fill="url(#zoneRedGrad)"
            />
          )}

          {/* Horizontal Grid lines (25, 50, 75, 100) */}
          {[25, 50, 75, 100].map((tick) => {
            const y = getY(tick);
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke="#e8eaed"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="500"
                  fill="#5f6368"
                  fontFamily="system-ui, sans-serif"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Left Y-axis line */}
          <line
            x1={paddingLeft}
            y1={getY(maxMarks)}
            x2={paddingLeft}
            y2={baselineY}
            stroke="#dadce0"
            strokeWidth="1"
          />

          {/* Bottom X-axis baseline (0 mark) */}
          <line
            x1={paddingLeft}
            y1={baselineY}
            x2={paddingLeft + innerWidth}
            y2={baselineY}
            stroke="#dadce0"
            strokeWidth="1"
          />
          <text
            x={paddingLeft - 8}
            y={baselineY + 4}
            textAnchor="end"
            fontSize="11"
            fontWeight="500"
            fill="#5f6368"
            fontFamily="system-ui, sans-serif"
          >
            0
          </text>

          {/* ── Threshold Indicator: Red Dot on Y-axis + Mark Number Only ── */}
          <g>
            {/* Refined horizontal dashed line from Y-axis across chart */}
            <line
              x1={paddingLeft}
              y1={thresholdY}
              x2={paddingLeft + innerWidth}
              y2={thresholdY}
              stroke="#ea4335"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              strokeOpacity="0.85"
            />
            {/* Red dot at the Y-axis intersection */}
            <circle
              cx={paddingLeft}
              cy={thresholdY}
              r="3.5"
              fill="#ea4335"
            />
            {/* Threshold mark number only on the Y-axis, in bold red */}
            <text
              x={paddingLeft - 8}
              y={thresholdY + 4}
              textAnchor="end"
              fontSize="11"
              fontWeight="700"
              fill="#ea4335"
              fontFamily="system-ui, sans-serif"
            >
              {thresholdMarks}
            </text>
          </g>

          {/* ── Ascending Score Curve Line (Sleek, Authentic Blue) ── */}
          {gradedStudents.length > 1 && (
            <polyline
              points={linePoints}
              fill="none"
              stroke="#1a73e8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Vertical Grid Drop Lines from points to baseline */}
          {gradedStudents.map((s, idx) => {
            const x = getX(idx);
            const y = getY(s.score);
            const isUser = s.isCurrentUser;
            return (
              <line
                key={`dropline-${s.id}`}
                x1={x}
                y1={y + 6}
                x2={x}
                y2={baselineY}
                stroke={isUser ? '#1a73e8' : '#e8eaed'}
                strokeWidth={isUser ? '1.5' : '1'}
                strokeDasharray={isUser ? '3 2' : 'none'}
              />
            );
          })}

          {/* ── Student Dots and Vertical Labels ── */}
          {gradedStudents.map((s, idx) => {
            const x = getX(idx);
            const y = getY(s.score);
            const colors = getStudentColor(s.username);
            const isUser = s.isCurrentUser;

            return (
              <g
                key={`dot-group-${s.id}`}
                className="cursor-pointer group"
                onClick={() => setSelectedStudent(s)}
              >
                {/* Large Invisible Hit Area for Touch Devices (minimum 44x44px target) */}
                <circle cx={x} cy={y} r="22" fill="transparent" />

                {/* Pulse Ring for "You" dot */}
                {isUser && (
                  <>
                    <circle
                      cx={x}
                      cy={y}
                      r="14"
                      fill="#1a73e8"
                      fillOpacity="0.15"
                      className="animate-ping"
                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '2s' }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="11"
                      fill="#1a73e8"
                      fillOpacity="0.2"
                    />
                  </>
                )}

                {/* Main Student Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isUser ? 7.5 : 5.5}
                  fill={isUser ? '#1a73e8' : colors.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform duration-150 group-hover:scale-125"
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />

                {/* "You" Minimal Callout Badge */}
                {isUser && (
                  <g filter="url(#badgeShadow)">
                    <rect
                      x={x - 28}
                      y={y - 34}
                      width="56"
                      height="22"
                      rx="11"
                      fill="#1a73e8"
                    />
                    <polygon
                      points={`${x - 3},${y - 12} ${x + 3},${y - 12} ${x},${y - 8}`}
                      fill="#1a73e8"
                    />
                    <text
                      x={x}
                      y={y - 20}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#ffffff"
                      fontFamily="system-ui, sans-serif"
                    >
                      You ({s.score})
                    </text>
                  </g>
                )}

                {/* Vertical Label (Rotated 90 degrees) with comfortable breathing room */}
                <g transform={`translate(${x}, ${labelStartY})`}>
                  <text
                    transform="rotate(-90)"
                    x="-90"
                    y="4"
                    textAnchor="start"
                    fontSize={isUser ? '12' : '11'}
                    fontWeight={isUser ? '700' : '500'}
                    fill={isUser ? '#1a73e8' : '#5f6368'}
                    fontFamily="system-ui, sans-serif"
                    letterSpacing="0.01em"
                  >
                    {s.username} • {s.score}
                  </text>

                  {/* Indicator Dot at the bottom */}
                  <circle
                    cx="0"
                    cy="92"
                    r={isUser ? 3.5 : 2.5}
                    fill={colors.color}
                  />
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Student Mobile Detail Drawer / Bottom Card */}
      {selectedStudent && (
        <div className="p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0"
              style={{ backgroundColor: getStudentColor(selectedStudent.username).color }}
            >
              {selectedStudent.username.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">
                  {selectedStudent.username}
                </span>
                {selectedStudent.isCurrentUser && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Score: <span className="font-bold text-gray-900">{selectedStudent.marks}</span> / {maxMarks} marks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedStudent.marks !== null && selectedEvaluation && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${selectedEvaluation.badgeClass}`}
              >
                {selectedEvaluation.variant === 'excellent' || selectedEvaluation.variant === 'good' ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                <span>
                  {selectedEvaluation.label}
                  <span className="font-normal opacity-85 ml-1">
                    ({selectedStudent.marks >= thresholdMarks ? `+${selectedStudent.marks - thresholdMarks}` : selectedStudent.marks - thresholdMarks})
                  </span>
                </span>
              </span>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-gray-500 h-7 px-2 min-w-0"
              onPress={() => setSelectedStudent(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Absent Students Section (if any) */}
      {absentStudents.length > 0 && (
        <div className="p-3 bg-amber-50/50 border-t border-amber-100 flex flex-wrap items-center gap-2 text-xs text-amber-800">
          <span className="font-semibold">Absent ({absentStudents.length}):</span>
          {absentStudents.map((abs) => (
            <span
              key={`absent-${abs.id}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono text-[11px]"
            >
              {abs.username}
              {abs.isCurrentUser && ' (You)'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
