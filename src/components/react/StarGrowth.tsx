import { useMemo, useState, useEffect, useRef } from 'react';
import { useSnowMode } from '../../App';
import starsData from '../../data/stars-2025.json';

// Easing function for smooth animation
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Get ISO week number from date
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get the Monday of a week
function getWeekStart(year: number, week: number): Date {
  const jan1 = new Date(year, 0, 1);
  const daysOffset = (jan1.getDay() || 7) - 1; // Days since Monday
  const firstMonday = new Date(year, 0, 1 - daysOffset + (jan1.getDay() <= 4 ? 0 : 7));
  return new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
}

interface WeeklyData {
  week: number;
  weekLabel: string;
  gained: number;
  total: number;
}

export default function StarGrowth() {
  const { mode } = useSnowMode();
  const isKitz = mode === 'kitz';
  const [animationProgress, setAnimationProgress] = useState(0); // Eased progress for dots
  const [lineProgress, setLineProgress] = useState(0); // Linear progress for lines
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Aggregate daily data into weekly data
  const weeklyData = useMemo(() => {
    const dailyData = starsData.daily2025;
    if (!dailyData || dailyData.length === 0) return [];

    const weekMap = new Map<number, { gained: number; lastTotal: number }>();

    dailyData.forEach(day => {
      const date = new Date(day.date);
      const week = getWeekNumber(date);

      const existing = weekMap.get(week);
      if (existing) {
        existing.gained += day.count;
        existing.lastTotal = day.total;
      } else {
        weekMap.set(week, { gained: day.count, lastTotal: day.total });
      }
    });

    // Get current week number to filter incomplete future weeks
    const currentWeek = getWeekNumber(new Date());

    // Convert to array and sort by week
    const weeks: WeeklyData[] = Array.from(weekMap.entries())
      .filter(([week]) => week <= currentWeek)
      .sort((a, b) => a[0] - b[0])
      .map(([week, data]) => {
        const weekStart = getWeekStart(2025, week);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const weekLabel = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;

        return {
          week,
          weekLabel,
          gained: data.gained,
          total: data.lastTotal,
        };
      });

    return weeks;
  }, []);

  const startOfYearStars = starsData.starsAtStartOf2025;
  const currentTotal = weeklyData[weeklyData.length - 1]?.total || startOfYearStars;
  const totalGained = currentTotal - startOfYearStars;

  // Intersection observer to trigger animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  // Animation loop
  useEffect(() => {
    if (!isVisible) return;

    const dotDuration = 2500; // 2.5 seconds for dots
    const lineDuration = 7500; // 7.5 seconds for lines (3x longer)
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;

      // Dots complete in 2.5s with easing
      const dotProgress = Math.min(elapsed / dotDuration, 1);
      const easedDotProgress = easeOutCubic(dotProgress);

      // Lines complete in 7.5s (3x longer)
      const lineProgressVal = Math.min(elapsed / lineDuration, 1);

      setAnimationProgress(easedDotProgress); // Eased for dots
      setLineProgress(lineProgressVal); // Slower linear for lines

      if (lineProgressVal < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible]);

  // SVG chart calculations with dual axes
  const chartData = useMemo(() => {
    if (weeklyData.length === 0) return null;

    const width = 900;
    const height = 240;
    const padding = { top: 30, right: 60, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Total stars (left y-axis)
    const totalValues = weeklyData.map(w => w.total);
    const minTotal = startOfYearStars * 0.98;
    const maxTotal = Math.max(...totalValues) * 1.02;
    const totalRange = maxTotal - minTotal;

    // Weekly gains (right y-axis) - using log scale to show variation
    const gainedValues = weeklyData.map(w => w.gained);
    const maxGained = Math.max(...gainedValues);
    const minGainedLog = Math.log10(1); // log10(1) = 0
    const maxGainedLog = Math.log10(maxGained);
    const gainedLogRange = maxGainedLog - minGainedLog;

    // Points for cumulative line
    const totalPoints = totalValues.map((val, i) => ({
      x: padding.left + (i / (weeklyData.length - 1 || 1)) * chartWidth,
      y: padding.top + chartHeight - ((val - minTotal) / totalRange) * chartHeight,
      val,
      week: weeklyData[i].week,
      weekLabel: weeklyData[i].weekLabel,
    }));

    // Points for weekly gains line (log scale)
    const gainedPoints = gainedValues.map((val, i) => {
      const logVal = Math.log10(Math.max(val, 1)); // Ensure minimum of 1 for log
      return {
        x: padding.left + (i / (weeklyData.length - 1 || 1)) * chartWidth,
        y: padding.top + chartHeight - ((logVal - minGainedLog) / gainedLogRange) * chartHeight,
        val,
        week: weeklyData[i].week,
        weekLabel: weeklyData[i].weekLabel,
      };
    });

    // Create smooth curved line paths using bezier curves
    const createSmoothPath = (points: typeof totalPoints) => {
      if (points.length < 2) return '';

      let path = `M ${points[0].x} ${points[0].y}`;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const tension = 0.3;

        const cp1x = prev.x + (curr.x - prev.x) * tension;
        const cp1y = prev.y;
        const cp2x = curr.x - (curr.x - prev.x) * tension;
        const cp2y = curr.y;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }

      return path;
    };

    const totalLinePath = createSmoothPath(totalPoints);
    const gainedLinePath = createSmoothPath(gainedPoints);

    // Create area path for totals
    const totalAreaPath = totalLinePath +
      ` L ${totalPoints[totalPoints.length - 1]?.x || padding.left} ${padding.top + chartHeight}` +
      ` L ${padding.left} ${padding.top + chartHeight} Z`;

    // Grid lines for left axis (totals)
    const leftGridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
      y: padding.top + chartHeight * (1 - pct),
      val: Math.round(minTotal + totalRange * pct),
    }));

    // Grid lines for right axis (gains) - log scale with nice round numbers
    const logTicks = [1, 5, 10, 25, 50, 100, 250, 500, 1000].filter(v => v <= maxGained * 1.1);
    const rightGridLines = logTicks.map(val => {
      const logVal = Math.log10(val);
      return {
        y: padding.top + chartHeight - ((logVal - minGainedLog) / gainedLogRange) * chartHeight,
        val,
      };
    });

    return {
      totalPoints,
      gainedPoints,
      totalLinePath,
      gainedLinePath,
      totalAreaPath,
      leftGridLines,
      rightGridLines,
      width,
      height,
      padding,
      chartHeight,
      chartWidth,
    };
  }, [weeklyData, startOfYearStars]);

  if (!chartData) return null;

  const { width, height, padding, totalPoints, gainedPoints, totalLinePath, gainedLinePath, totalAreaPath, leftGridLines, rightGridLines } = chartData;

  // Animated values
  const animatedTotal = Math.round(startOfYearStars + totalGained * animationProgress);
  const animatedGained = Math.round(totalGained * animationProgress);

  // Calculate path length for stroke animation
  const pathLength = 3000;

  // Determine which X-axis labels to show (every 4th week to avoid crowding)
  const xAxisLabels = weeklyData.filter((_, i) => i % 4 === 0 || i === weeklyData.length - 1);

  return (
    <section
      ref={containerRef}
      className="glass-card p-4 md:p-6"
      aria-label="GitHub star growth chart"
    >
      {/* Header with animated counter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            Star Growth
          </h3>
          <p className="text-text-secondary text-sm mt-1">
            Weekly GitHub star growth in 2025
          </p>
        </div>

        <div className="flex gap-4 sm:gap-6">
          <div className="text-center">
            <div
              className="text-3xl sm:text-4xl font-bold text-vendure-primary tabular-nums"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              {animatedTotal.toLocaleString()}
            </div>
            <div className="text-text-secondary text-xs sm:text-sm">Total Stars</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl sm:text-3xl font-bold text-green-400 tabular-nums"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              +{animatedGained.toLocaleString()}
            </div>
            <div className="text-text-secondary text-xs sm:text-sm">This Year</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-[#fbbf24]" />
          <span className={`text-xs ${isKitz ? 'text-yellow-700' : 'text-text-secondary'}`}>Total Stars</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded bg-[#22c55e]" />
          <span className="text-xs text-text-secondary">New Stars/Week (log)</span>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[700px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto"
            aria-label="Line chart showing weekly star growth throughout 2025"
          >
            <defs>
              {/* Gradient for the total area fill */}
              <linearGradient id="starAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </linearGradient>

              {/* Glow filter for the total line */}
              <filter id="starGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Glow filter for the gained line */}
              <filter id="gainedGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {leftGridLines.map(({ y, val }) => (
              <g key={`grid-${val}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isKitz ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}
                  strokeWidth={1}
                />
                {/* Left axis labels (totals) */}
                <text
                  x={padding.left - 8}
                  y={y}
                  fill={isKitz ? '#a16207' : '#fbbf24'}
                  fontSize="10"
                  textAnchor="end"
                  dominantBaseline="middle"
                >
                  {(val / 1000).toFixed(1)}k
                </text>
              </g>
            ))}

            {/* Right axis labels (gains) */}
            {rightGridLines.map(({ y, val }) => (
              <text
                key={`right-${val}`}
                x={width - padding.right + 8}
                y={y}
                fill={isKitz ? '#15803d' : '#22c55e'}
                fontSize="10"
                textAnchor="start"
                dominantBaseline="middle"
              >
                +{val}
              </text>
            ))}

            {/* Total area fill - animated */}
            <path
              d={totalAreaPath}
              fill="url(#starAreaGradient)"
              style={{
                opacity: animationProgress,
                transition: 'opacity 0.3s ease',
              }}
            />

            {/* Total line - animated with stroke-dasharray using linear progress */}
            <path
              d={totalLinePath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#starGlow)"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength * (1 - lineProgress),
              }}
            />

            {/* Gained line - animated with stroke-dasharray using linear progress */}
            <path
              d={gainedLinePath}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#gainedGlow)"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: pathLength * (1 - lineProgress),
              }}
            />

            {/* Total data points - only show every 4th to avoid crowding */}
            {totalPoints.filter((_, i) => i % 4 === 0 || i === totalPoints.length - 1).map((point, i, arr) => {
              const originalIndex = i === arr.length - 1 ? totalPoints.length - 1 : i * 4;
              const pointProgress = originalIndex / (totalPoints.length - 1);
              const pointVisible = animationProgress >= pointProgress;

              return (
                <circle
                  key={`total-${point.week}`}
                  cx={point.x}
                  cy={point.y}
                  r={pointVisible ? 4 : 0}
                  fill="#fbbf24"
                  stroke={isKitz ? '#fef3c7' : '#92400e'}
                  strokeWidth={2}
                  style={{
                    transition: 'r 0.3s ease',
                    filter: 'drop-shadow(0 0 3px rgba(251, 191, 36, 0.6))',
                  }}
                />
              );
            })}

            {/* Gained data points - show peaks and every 4th */}
            {gainedPoints.map((point, i) => {
              const pointProgress = i / (gainedPoints.length - 1);
              const pointVisible = animationProgress >= pointProgress;
              const isPeak = point.val > 100; // Show points with significant gains
              const showPoint = isPeak || i % 4 === 0 || i === gainedPoints.length - 1;

              if (!showPoint) return null;

              return (
                <g key={`gained-${point.week}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={pointVisible ? (isPeak ? 5 : 3) : 0}
                    fill="#22c55e"
                    stroke={isKitz ? '#bbf7d0' : '#14532d'}
                    strokeWidth={2}
                    style={{
                      transition: 'r 0.3s ease',
                      filter: 'drop-shadow(0 0 3px rgba(34, 197, 94, 0.6))',
                    }}
                  />
                  {/* Value label for peaks */}
                  {pointVisible && isPeak && (
                    <text
                      x={point.x}
                      y={point.y - 12}
                      fill={isKitz ? '#15803d' : '#22c55e'}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      style={{
                        opacity: animationProgress >= pointProgress + 0.02 ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                      }}
                    >
                      +{point.val}
                    </text>
                  )}
                </g>
              );
            })}

            {/* X axis labels - show every 4th week */}
            {xAxisLabels.map((week) => {
              const originalIndex = weeklyData.findIndex(w => w.week === week.week);
              const x = padding.left + (originalIndex / (weeklyData.length - 1 || 1)) * (width - padding.left - padding.right);

              return (
                <text
                  key={week.week}
                  x={x}
                  y={height - 15}
                  fill={isKitz ? '#6b7280' : '#a8d8ea'}
                  fontSize="10"
                  textAnchor="middle"
                >
                  {week.weekLabel}
                </text>
              );
            })}

            {/* Invisible hit areas for hover interaction */}
            {weeklyData.map((week, i) => {
              const x = padding.left + (i / (weeklyData.length - 1 || 1)) * (width - padding.left - padding.right);
              const hitWidth = (width - padding.left - padding.right) / weeklyData.length;

              return (
                <rect
                  key={`hit-${week.week}`}
                  x={x - hitWidth / 2}
                  y={padding.top}
                  width={hitWidth}
                  height={height - padding.top - padding.bottom}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredWeekIndex(i)}
                  onMouseLeave={() => setHoveredWeekIndex(null)}
                />
              );
            })}

            {/* Tooltip */}
            {hoveredWeekIndex !== null && lineProgress === 1 && (() => {
              const week = weeklyData[hoveredWeekIndex];
              const totalPoint = totalPoints[hoveredWeekIndex];
              const gainedPoint = gainedPoints[hoveredWeekIndex];

              // Position tooltip - flip if too close to right edge
              const tooltipWidth = 100;
              const tooltipHeight = 58;
              const tooltipX = totalPoint.x > width - padding.right - tooltipWidth - 20
                ? totalPoint.x - tooltipWidth - 10
                : totalPoint.x + 10;
              const tooltipY = Math.max(padding.top, Math.min(totalPoint.y, gainedPoint.y) - tooltipHeight / 2);

              return (
                <g style={{ pointerEvents: 'none' }}>
                  {/* Vertical line indicator */}
                  <line
                    x1={totalPoint.x}
                    y1={padding.top}
                    x2={totalPoint.x}
                    y2={height - padding.bottom}
                    stroke={isKitz ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />

                  {/* Highlight circles */}
                  <circle
                    cx={totalPoint.x}
                    cy={totalPoint.y}
                    r={6}
                    fill="#fbbf24"
                    stroke={isKitz ? '#fef3c7' : '#92400e'}
                    strokeWidth={2}
                  />
                  <circle
                    cx={gainedPoint.x}
                    cy={gainedPoint.y}
                    r={6}
                    fill="#22c55e"
                    stroke={isKitz ? '#bbf7d0' : '#14532d'}
                    strokeWidth={2}
                  />

                  {/* Tooltip box */}
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx={6}
                    fill={isKitz ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.95)'}
                    stroke={isKitz ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}
                    strokeWidth={1}
                  />

                  {/* Week label */}
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 14}
                    fill={isKitz ? '#374151' : '#e2e8f0'}
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {week.weekLabel}
                  </text>

                  {/* Total stars */}
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 30}
                    fill={isKitz ? '#a16207' : '#fbbf24'}
                    fontSize="10"
                    fontWeight="500"
                  >
                    Total: {week.total.toLocaleString()}
                  </text>

                  {/* New stars */}
                  <text
                    x={tooltipX + 8}
                    y={tooltipY + 46}
                    fill={isKitz ? '#15803d' : '#22c55e'}
                    fontSize="10"
                    fontWeight="500"
                  >
                    New: +{week.gained.toLocaleString()}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Stats footer */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-6 pt-4 border-t border-white/10">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary">
            {starsData.starsAtStartOf2025.toLocaleString()}
          </div>
          <div className="text-text-muted text-xs">Start of Year</div>
        </div>
        <div className="text-2xl text-text-muted">→</div>
        <div className="text-center">
          <div className="text-lg font-semibold text-vendure-primary">
            {currentTotal.toLocaleString()}
          </div>
          <div className="text-text-muted text-xs">Current</div>
        </div>
        <div className="text-center ml-4">
          <div className="text-lg font-semibold text-green-400">
            +{((totalGained / startOfYearStars) * 100).toFixed(0)}%
          </div>
          <div className="text-text-muted text-xs">Growth</div>
        </div>
      </div>
    </section>
  );
}
