'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { getStudentColor, evaluateStudentMark, getStudentDisplayNumber } from '@/lib/exams';
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
  examTitle: _examTitle,
  maxMarks,
  thresholdMarks,
  marks,
  isStudentView: _isStudentView = false,
}: ExamPerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [selectedStudent, setSelectedStudent] = useState<ChartMarkItem | null>(null);
  const [hoveredStudent, setHoveredStudent] = useState<ChartMarkItem | null>(null);

  // Measure container width via ResizeObserver for fixed responsive X-axis
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          setContainerWidth(w);
        }
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

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
  const paddingRight = 36;
  const paddingTop = 44;
  const paddingBottom = 36;
  const chartHeight = 350; // Increased height for clear 10 and 5 intervals
  const totalSvgHeight = paddingTop + chartHeight + paddingBottom;

  // Fixed length X-axis: spans container width, does not expand with student count
  const totalSvgWidth = Math.max(containerWidth, 320);
  const innerWidth = Math.max(totalSvgWidth - paddingLeft - paddingRight, 200);

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

  // Polyline points
  const linePoints = gradedStudents
    .map((s, idx) => `${getX(idx)},${getY(s.score)}`)
    .join(' ');

  // Major Grid Ticks: 0, 10, 20, 30... up to maxMarks
  const majorTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let m = 0; m <= maxMarks; m += 10) {
      ticks.push(m);
    }
    if (ticks[ticks.length - 1] !== maxMarks) {
      ticks.push(maxMarks);
    }
    return ticks;
  }, [maxMarks]);

  // Minor Grid Ticks: 5, 15, 25, 35... faded in between
  const minorTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let m = 5; m < maxMarks; m += 10) {
      if (!majorTicks.includes(m)) {
        ticks.push(m);
      }
    }
    return ticks;
  }, [maxMarks, majorTicks]);

  // Active student for on-hover price tag
  const activeStudent = hoveredStudent || selectedStudent;

  // Highlight Current User
  const highlightCurrentUser = () => {
    if (currentUserStudent && !currentUserStudent.isAbsent && currentUserStudent.marks !== null) {
      setSelectedStudent(currentUserStudent);
      setHoveredStudent(currentUserStudent);
    }
  };

  // Evaluation for selected student drawer
  const selectedEvaluation = selectedStudent && selectedStudent.marks !== null
    ? evaluateStudentMark(selectedStudent.marks, thresholdMarks, maxMarks)
    : null;

  // Interactive scrubbing handler across the SVG
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (gradedStudents.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    if (mouseX < paddingLeft - 10 || mouseX > paddingLeft + innerWidth + 10) {
      return;
    }
    let closest = gradedStudents[0];
    let minDiff = Infinity;
    gradedStudents.forEach((s, idx) => {
      const sx = getX(idx);
      const diff = Math.abs(mouseX - sx);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    });
    const thresholdDist = Math.max(innerWidth / Math.max(gradedStudents.length - 1, 1), 28);
    if (minDiff < thresholdDist) {
      setHoveredStudent(closest);
    }
  };

  const handlePointerLeave = () => {
    setHoveredStudent(null);
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

        {/* Legend & Chart Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Green Tick Pass Mark Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-2xs">
            <CheckCircle2 size={13.5} className="text-emerald-600 shrink-0" />
            <span>Pass Mark: {thresholdMarks}</span>
          </div>

          {/* Interactive Hint */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 text-xs">
            <span>Hover / tap dot for ID</span>
          </div>

          {currentUserStudent && !currentUserStudent.isAbsent && (
            <Button
              size="sm"
              variant="outline"
              onPress={highlightCurrentUser}
              className="text-xs font-semibold px-3 py-1 h-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
            >
              <Sparkles size={13} className="mr-1 text-blue-500" />
              Find My Dot (You)
            </Button>
          )}
        </div>
      </div>

      {/* SVG Canvas Area - Fixed Width, No Horizontal Scroll Overflows */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden select-none bg-white relative"
      >
        <svg
          width={totalSvgWidth}
          height={totalSvgHeight}
          className="block w-full touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <defs>
            {/* Subtle shadow for "You" callout badge */}
            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.15" floodColor="#0f172a" />
            </filter>

            {/* Subtle shadow for enlarged price tag */}
            <filter id="tagShadow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" floodColor="#0f172a" />
            </filter>

            {/* Three Soft Pastel Zone Gradients for Subtle Visual Guidance */}
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

          {/* Minor Grid Lines: Faded 5s (5, 15, 25, 35...) */}
          {minorTicks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={`minor-grid-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke="#f1f3f4"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <line
                  x1={paddingLeft - 3}
                  y1={y}
                  x2={paddingLeft}
                  y2={y}
                  stroke="#dadce0"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fontWeight="400"
                  fill="#9aa0a6"
                  fontFamily="system-ui, sans-serif"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Major Grid Lines: 10 by 10 (0, 10, 20, 30... 100) */}
          {majorTicks.map((tick) => {
            const y = getY(tick);
            const isBaseline = tick === 0;
            return (
              <g key={`major-grid-${tick}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke={isBaseline ? '#dadce0' : '#e8eaed'}
                  strokeWidth="1"
                  strokeDasharray={isBaseline ? 'none' : '3 3'}
                />
                <line
                  x1={paddingLeft - 5}
                  y1={y}
                  x2={paddingLeft}
                  y2={y}
                  stroke="#dadce0"
                  strokeWidth="1"
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

          {/* Left Y-axis baseline */}
          <line
            x1={paddingLeft}
            y1={getY(maxMarks)}
            x2={paddingLeft}
            y2={baselineY}
            stroke="#dadce0"
            strokeWidth="1"
          />

          {/* ── Threshold Indicator: Encouraging Green Dot on Y-axis + Mark Number Only ── */}
          <g>
            {/* Horizontal dashed pass line from Y-axis across chart */}
            <line
              x1={paddingLeft}
              y1={thresholdY}
              x2={paddingLeft + innerWidth}
              y2={thresholdY}
              stroke="#10b981"
              strokeWidth="1.2"
              strokeDasharray="4 4"
              strokeOpacity="0.85"
            />
            {/* Green dot at the Y-axis intersection */}
            <circle
              cx={paddingLeft}
              cy={thresholdY}
              r="3.5"
              fill="#10b981"
            />
            {/* Threshold mark number only on the Y-axis, in bold emerald */}
            <rect x={paddingLeft - 65} y={thresholdY - 12} width="60" height="20" fill="#D9FFE7"/>
            <text
              x={paddingLeft - 6}
              y={thresholdY + 4}
              textAnchor="end"
              fontSize="15"
              fontWeight="700"
              
              fill="#059669"
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
            const isActive = activeStudent?.id === s.id;
            // Clean view: if class is large, only show dropline for active or current user
            if (gradedStudents.length > 50 && !isUser && !isActive) return null;

            return (
              <line
                key={`dropline-${s.id}`}
                x1={x}
                y1={y + (isActive ? 7 : 5)}
                x2={x}
                y2={baselineY}
                stroke={isActive || isUser ? '#1a73e8' : '#e8eaed'}
                strokeWidth={isActive ? '1.5' : isUser ? '1.2' : '0.8'}
                strokeDasharray={isActive || isUser ? '3 2' : 'none'}
                strokeOpacity={isActive ? 1 : isUser ? 0.9 : 0.6}
              />
            );
          })}

          {/* ── Student Dots ── */}
          {gradedStudents.map((s, idx) => {
            const x = getX(idx);
            const y = getY(s.score);
            const colors = getStudentColor(s.username);
            const isUser = s.isCurrentUser;
            const isActive = activeStudent?.id === s.id;

            return (
              <g
                key={`dot-group-${s.id}`}
                className="cursor-pointer group"
                onPointerEnter={() => setHoveredStudent(s)}
                onClick={() => {
                  setSelectedStudent(s);
                  setHoveredStudent(s);
                }}
              >
                {/* Generous Hit Area for Touch Devices (minimum 44x44px target) */}
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
                      r="10"
                      fill="#1a73e8"
                      fillOpacity="0.2"
                    />
                  </>
                )}

                {/* Halo for active/hovered dot */}
                {isActive && !isUser && (
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill={colors.color}
                    fillOpacity="0.2"
                  />
                )}

                {/* Main Student Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 7.5 : isUser ? 6.5 : 5}
                  fill={isUser ? '#1a73e8' : colors.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-transform duration-150"
                  style={{ transformOrigin: `${x}px ${y}px` }}
                />

                {/* Default "You" Callout Pill (visible when not hovering another dot) */}
                {isUser && !activeStudent && (
                  <g filter="url(#badgeShadow)">
                    <rect
                      x={x - 22}
                      y={y < 100 ? y + 12 : y - 28}
                      width="44"
                      height="18"
                      rx="9"
                      fill="#1a73e8"
                    />
                    <text
                      x={x}
                      y={y < 100 ? y + 24 : y - 16}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill="#ffffff"
                      fontFamily="system-ui, sans-serif"
                    >
                      You
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Single Enlarged Horizontal Price Tag (shown only on hover / active) ── */}
          {activeStudent && (() => {
            const activeIdx = gradedStudents.findIndex((s) => s.id === activeStudent.id);
            if (activeIdx < 0) return null;

            const studentItem = gradedStudents[activeIdx];
            const x = getX(activeIdx);
            const y = getY(studentItem.score);
            const isUser = activeStudent.isCurrentUser;
            const colors = getStudentColor(activeStudent.username);
            const displayNumber = getStudentDisplayNumber(activeStudent.username);

            // Generous card dimensions for comfortable viewing
            const cardW = 80;
            const cardH = 50;
            const isDown = y < 110;

            // Clamp card within chart horizontal boundaries
            const cardX = Math.max(
              paddingLeft + 4,
              Math.min(x - cardW / 2, totalSvgWidth - paddingRight - cardW - 4)
            );
            const cardY = isDown ? y + 16 : y - 16 - cardH;
            const eyeletY = isDown ? cardY + 6 : cardY + cardH - 6;
            const clampedEyeletX = Math.max(cardX + 10, Math.min(x, cardX + cardW - 10));

            return (
              <g
                key={`active-tag-${activeStudent.id}`}
                className="pointer-events-none transition-all duration-150"
              >
                {/* Connecting Thread from Dot to Price Tag */}
                <line
                  x1={x}
                  y1={isDown ? y + 6 : y - 6}
                  x2={clampedEyeletX}
                  y2={isDown ? cardY : cardY + cardH}
                  stroke={isUser ? '#1a73e8' : colors.color}
                  strokeWidth="1.2"
                  strokeDasharray="2 2"
                />

                <g filter="url(#tagShadow)">
                  {/* Price Tag Body */}
                  <rect
                    x={cardX}
                    y={cardY}
                    width={cardW}
                    height={cardH}
                    rx="8"
                    fill="#ffffff"
                    stroke={isUser ? '#1a73e8' : colors.color}
                    strokeWidth="1.8"
                  />

                  {/* Price Tag Eyelet Hole */}
                  <circle
                    cx={clampedEyeletX}
                    cy={eyeletY}
                    r="2.5"
                    fill="#f8f9fa"
                    stroke={isUser ? '#1a73e8' : colors.color}
                    strokeWidth="1"
                  />

                  {/* 4-Digit Student ID (Large & Clear) */}
                  <text
                    x={cardX + cardW / 2}
                    y={cardY + (isDown ? 24 : 19)}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fill={isUser ? '#1a73e8' : '#111827'}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    letterSpacing="0.04em"
                  >
                    #{displayNumber}
                  </text>

                  {/* Student Score */}
                  <text
                    x={cardX + cardW / 2}
                    y={cardY + (isDown ? 38 : 34)}
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="600"
                    fill={studentItem.score >= thresholdMarks ? '#059669' : '#d97706'}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  >
                    {studentItem.score} Marks {isUser ? '(You)' : ''}
                  </text>
                </g>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Selected Student Detail Drawer / Bottom Card */}
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
                <span className="font-mono text-xs text-gray-500">
                  (ID: #{getStudentDisplayNumber(selectedStudent.username)})
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
              {abs.username} (#{getStudentDisplayNumber(abs.username)})
              {abs.isCurrentUser && ' (You)'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
