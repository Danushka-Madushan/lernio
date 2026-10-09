'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { getStudentColor } from '@/lib/exams';
import { Award, ChevronRight, Sparkles, TrendingUp, AlertCircle, CheckCircle2, User } from 'lucide-react';
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
  // Spacing per student is kept at 56px so labels & dots never overlap on small screens
  const paddingLeft = 52;
  const paddingRight = 48;
  const paddingTop = 60;
  const paddingBottom = 110; // Extra room for vertical rotated labels
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

        {/* Legend & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
            <span className="w-2 h-0.5 border-t-2 border-dashed border-rose-500 inline-block"></span>
            <span>Threshold ({thresholdMarks})</span>
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

      {/* SVG Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-hidden select-none bg-linear-to-b from-gray-50/40 via-white to-gray-50/20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <svg
          width={totalSvgWidth}
          height={totalSvgHeight}
          className="block"
          style={{ minWidth: '100%' }}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="scoreLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            {/* Above Threshold Safe Area Tint */}
            <linearGradient id="passZoneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ecfdf5" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0.05" />
            </linearGradient>

            {/* Shadow for You badge */}
            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" floodColor="#1e3a8a" />
            </filter>
          </defs>

          {/* Pass Zone Tint */}
          <rect
            x={paddingLeft}
            y={getY(maxMarks)}
            width={innerWidth}
            height={thresholdY - getY(maxMarks)}
            fill="url(#passZoneGrad)"
          />

          {/* Horizontal Grid lines (0, 25, 50, 75, 100) */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = getY(tick);
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="500"
                  fill="#9ca3af"
                  fontFamily="system-ui, sans-serif"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Threshold Dashed Marker Line */}
          <g>
            <line
              x1={paddingLeft}
              y1={thresholdY}
              x2={paddingLeft + innerWidth}
              y2={thresholdY}
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            {/* Threshold Label Tag at right */}
            <rect
              x={paddingLeft + innerWidth - 92}
              y={thresholdY - 18}
              width="90"
              height="18"
              rx="4"
              fill="#ffe4e6"
              stroke="#fda4af"
              strokeWidth="1"
            />
            <text
              x={paddingLeft + innerWidth - 47}
              y={thresholdY - 5}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#e11d48"
              fontFamily="system-ui, sans-serif"
            >
              Cutoff: {thresholdMarks}
            </text>
          </g>

          {/* The Single Ascending Score Curve Line */}
          {gradedStudents.length > 1 && (
            <polyline
              points={linePoints}
              fill="none"
              stroke="url(#scoreLineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Vertical Grid Drop Lines from points to axis */}
          {gradedStudents.map((s, idx) => {
            const x = getX(idx);
            const y = getY(s.score);
            const isUser = s.isCurrentUser;
            return (
              <line
                key={`dropline-${s.id}`}
                x1={x}
                y1={y}
                x2={x}
                y2={paddingTop + chartHeight + 10}
                stroke={isUser ? '#3b82f6' : '#f1f5f9'}
                strokeWidth={isUser ? '1.5' : '1'}
                strokeDasharray={isUser ? '3 2' : 'none'}
              />
            );
          })}

          {/* Student Dots and Vertical Labels */}
          {gradedStudents.map((s, idx) => {
            const x = getX(idx);
            const y = getY(s.score);
            const colors = getStudentColor(s.username);
            const isUser = s.isCurrentUser;
            const isAbove = s.score >= thresholdMarks;

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
                      r="16"
                      fill="#3b82f6"
                      fillOpacity="0.2"
                      className="animate-ping"
                      style={{ transformOrigin: `${x}px ${y}px`, animationDuration: '2s' }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="13"
                      fill="#3b82f6"
                      fillOpacity="0.25"
                    />
                  </>
                )}

                {/* Main Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isUser ? 8 : 5.5}
                  fill={isUser ? '#2563eb' : colors.color}
                  stroke="#ffffff"
                  strokeWidth={isUser ? 3 : 2}
                  className="transition-transform duration-200 group-hover:scale-125"
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />

                {/* "You" Floating Callout Badge */}
                {isUser && (
                  <g filter="url(#badgeShadow)">
                    {/* Callout box */}
                    <rect
                      x={x - 38}
                      y={y - 44}
                      width="76"
                      height="26"
                      rx="13"
                      fill={isAbove ? '#15803d' : '#be123c'}
                    />
                    {/* Downward triangle pointer */}
                    <polygon
                      points={`${x - 4},${y - 18} ${x + 4},${y - 18} ${x},${y - 13}`}
                      fill={isAbove ? '#15803d' : '#be123c'}
                    />
                    <text
                      x={x}
                      y={y - 27}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#ffffff"
                      fontFamily="system-ui, sans-serif"
                    >
                      You ({s.score})
                    </text>
                  </g>
                )}

                {/* Vertical Label (Rotated 90 degrees) */}
                <g transform={`translate(${x}, ${paddingTop + chartHeight + 20})`}>
                  {/* Rotated text group */}
                  <text
                    transform="rotate(-90)"
                    x="-80"
                    y="4"
                    textAnchor="start"
                    fontSize={isUser ? '12' : '11'}
                    fontWeight={isUser ? '700' : '500'}
                    fill={isUser ? '#1d4ed8' : '#4b5563'}
                    fontFamily="system-ui, sans-serif"
                    letterSpacing="0.02em"
                  >
                    {s.username} • {s.score}
                  </text>

                  {/* Indicator Dot at the bottom */}
                  <circle
                    cx="0"
                    cy="82"
                    r={isUser ? 4 : 3}
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
        <div className="p-4 bg-linear-to-r from-blue-50/80 via-white to-indigo-50/80 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              <p className="text-xs text-gray-600">
                Score: <span className="font-bold text-gray-900">{selectedStudent.marks}</span> / {maxMarks} marks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedStudent.marks !== null && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedStudent.marks >= thresholdMarks
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {selectedStudent.marks >= thresholdMarks ? (
                  <>
                    <CheckCircle2 size={13} /> Above Cutoff (+{selectedStudent.marks - thresholdMarks})
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} /> Needs Improvement (-{thresholdMarks - selectedStudent.marks})
                  </>
                )}
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
        <div className="p-3 bg-amber-50/60 border-t border-amber-100 flex flex-wrap items-center gap-2 text-xs text-amber-800">
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
