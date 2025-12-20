import { useMemo, useState, useRef, useCallback } from 'react';
import { useDataContext } from '../../App';
import type { Release } from '../../types';
import {
  useFloating,
  offset,
  flip,
  shift,
  FloatingPortal,
  autoUpdate,
} from '@floating-ui/react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Inline styles for SVG elements
const chartStyles = {
  line: {
    fill: 'none',
    stroke: '#17c1ff',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  },
  area: {
    fill: 'url(#areaGradient)',
  },
  gridLine: {
    stroke: 'rgba(255, 255, 255, 0.1)',
    strokeWidth: 1,
  },
  axisLabel: {
    fill: '#a8d8ea',
    fontSize: '11px',
  },
  dataPoint: {
    fill: '#17c1ff',
    stroke: '#0a1929',
    strokeWidth: 2,
    cursor: 'pointer',
  },
  releaseLineMinor: {
    strokeDasharray: '4 4',
    strokeWidth: 1,
    stroke: '#fbbf24',
    opacity: 0.6,
  },
  releaseLinePatch: {
    strokeDasharray: '4 4',
    strokeWidth: 1,
    stroke: 'rgba(251, 191, 36, 0.5)',
    opacity: 0.4,
  },
  releaseDotMinor: {
    fill: '#fbbf24',
    filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.8))',
  },
  releaseDotPatch: {
    fill: 'rgba(251, 191, 36, 0.5)',
  },
};

interface TooltipData {
  type: 'month' | 'release';
  month?: string;
  commits?: number;
  releases?: Release[];
  release?: Release;
  element: SVGElement;
}

export default function MonthlyTrend() {
  const { allCommits, releases, members } = useDataContext();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const isTooltipHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { refs, floatingStyles } = useFloating({
    open: !!tooltip,
    placement: 'top',
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 10 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Simple CSS transition instead of useTransitionStyles for reliability
  const isOpen = !!tooltip;

  const { points, linePath, areaPath, gridLines, releasesByMonth, months } = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    const releasesByMonth: Record<string, Release[]> = {};

    // Initialize all months up to current
    const currentMonth = new Date().getMonth();
    for (let i = 0; i <= currentMonth; i++) {
      monthlyData[MONTH_NAMES[i]] = 0;
    }

    // Count commits per month
    allCommits.forEach(commit => {
      const month = MONTH_NAMES[new Date(commit.date).getMonth()];
      if (monthlyData[month] !== undefined) {
        monthlyData[month]++;
      }
    });

    // Group releases by month
    releases.forEach(release => {
      const monthIdx = new Date(release.published_at).getMonth();
      const monthName = MONTH_NAMES[monthIdx];
      if (!releasesByMonth[monthName]) {
        releasesByMonth[monthName] = [];
      }
      releasesByMonth[monthName].push(release);
    });

    // Sort releases within each month
    Object.values(releasesByMonth).forEach(monthReleases => {
      monthReleases.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    });

    const months = Object.keys(monthlyData);
    const values = Object.values(monthlyData);
    const maxValue = Math.max(...values, 1);

    // SVG dimensions
    const width = 800;
    const height = 180;
    const padding = { top: 25, right: 30, bottom: 35, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Generate points
    const points = values.map((val, i) => ({
      x: padding.left + (i / (months.length - 1 || 1)) * chartWidth,
      y: padding.top + chartHeight - (val / maxValue) * chartHeight,
      val,
      month: months[i]
    }));

    // Create line path
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Create area path
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding.left} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    // Grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
      y: padding.top + chartHeight * (1 - pct),
      val: Math.round(maxValue * pct)
    }));

    return { points, linePath, areaPath, gridLines, releasesByMonth, months };
  }, [allCommits, releases]);

  const width = 800;
  const height = 180;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;

  // Create a lookup map for member avatars
  const membersByLogin = useMemo(() => {
    const map: Record<string, { avatar_url: string; html_url: string }> = {};
    members.forEach(m => {
      map[m.login] = { avatar_url: m.avatar_url, html_url: m.html_url };
    });
    return map;
  }, [members]);

  const minorCount = releases.filter(r => r.release_type === 'minor').length;
  const patchCount = releases.filter(r => r.release_type === 'patch').length;

  // Clear any pending hide timeout
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }, []);

  // Schedule tooltip hide with delay
  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      // Use ref for current value to avoid stale closure
      if (!isTooltipHoveredRef.current) {
        setTooltip(null);
      }
    }, 150);
  }, [clearHideTimeout]);

  const handlePointEnter = useCallback((point: typeof points[0], element: SVGElement) => {
    clearHideTimeout();
    refs.setReference(element);
    setTooltip({
      type: 'month',
      month: point.month,
      commits: point.val,
      releases: releasesByMonth[point.month] || [],
      element,
    });
  }, [releasesByMonth, refs, clearHideTimeout]);

  const handleReleaseEnter = useCallback((release: Release, element: SVGElement) => {
    clearHideTimeout();
    refs.setReference(element);
    setTooltip({
      type: 'release',
      release,
      element,
    });
  }, [refs, clearHideTimeout]);

  const handleElementLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleTooltipEnter = useCallback(() => {
    clearHideTimeout();
    isTooltipHoveredRef.current = true;
    setIsTooltipHovered(true);
  }, [clearHideTimeout]);

  const handleTooltipLeave = useCallback(() => {
    isTooltipHoveredRef.current = false;
    setIsTooltipHovered(false);
    scheduleHide();
  }, [scheduleHide]);

  return (
    <div className="glass-card p-4 md:p-6" role="region" aria-label="Monthly activity trend chart">
      <style>{`
        .trend-data-point { transition: r 0.2s ease; }
        .trend-data-point:hover { r: 8; }
        .trend-release-dot { transition: r 0.2s ease, filter 0.2s ease; }
        .trend-release-dot:hover { filter: drop-shadow(0 0 10px rgba(251, 191, 36, 1)) !important; }
      `}</style>

      <h3 className="text-lg font-semibold text-text-primary mb-4">Monthly Activity Trend</h3>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="min-w-[600px]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-auto"
            role="img"
            aria-label="Line chart of monthly commit activity"
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#17c1ff" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#17c1ff" stopOpacity="0"/>
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {gridLines.map(({ y, val }) => (
              <g key={val}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} style={chartStyles.gridLine} />
                <text x={padding.left - 5} y={y} style={chartStyles.axisLabel} textAnchor="end" dy="0.3em">
                  {val}
                </text>
              </g>
            ))}

            {/* Release markers */}
            {months.map((month, i) => {
              const monthReleases = releasesByMonth[month];
              if (!monthReleases?.length) return null;

              const x = padding.left + (i / (months.length - 1 || 1)) * (width - padding.left - padding.right);

              return monthReleases.map((release, ri) => {
                const offsetX = monthReleases.length > 1 ? (ri - (monthReleases.length - 1) / 2) * 10 : 0;
                const markerX = x + offsetX;
                const dotRadius = release.release_type === 'minor' ? 6 : 3;
                const isMinor = release.release_type === 'minor';

                return (
                  <g key={release.tag_name}>
                    <line
                      x1={markerX}
                      y1={padding.top}
                      x2={markerX}
                      y2={padding.top + chartHeight}
                      style={isMinor ? chartStyles.releaseLineMinor : chartStyles.releaseLinePatch}
                    />
                    <circle
                      cx={markerX}
                      cy={padding.top - 8}
                      r={dotRadius}
                      className="trend-release-dot"
                      style={isMinor ? chartStyles.releaseDotMinor : chartStyles.releaseDotPatch}
                      onMouseEnter={(e) => handleReleaseEnter(release, e.currentTarget)}
                      onMouseLeave={handleElementLeave}
                    />
                  </g>
                );
              });
            })}

            {/* Area and line */}
            <path d={areaPath} style={chartStyles.area} />
            <path d={linePath} style={chartStyles.line} />

            {/* Data points */}
            {points.map((point) => (
              <circle
                key={point.month}
                cx={point.x}
                cy={point.y}
                r={5}
                className="trend-data-point"
                style={chartStyles.dataPoint}
                onMouseEnter={(e) => handlePointEnter(point, e.currentTarget)}
                onMouseLeave={handleElementLeave}
              />
            ))}

            {/* X axis labels */}
            {months.map((month, i) => (
              <text
                key={month}
                x={padding.left + (i / (months.length - 1 || 1)) * (width - padding.left - padding.right)}
                y={height - 8}
                style={chartStyles.axisLabel}
                textAnchor="middle"
              >
                {month}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-vendure-primary" />
          <span className="text-text-secondary">Commits</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-release-minor" />
          <span className="text-text-secondary">Minor ({minorCount})</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-release-patch" />
          <span className="text-text-secondary">Patch ({patchCount})</span>
        </span>
      </div>

      {/* Tooltip using floating-ui - interactive so users can click links */}
      {isOpen && tooltip && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              zIndex: 10000,
              maxWidth: 'min(320px, calc(100vw - 20px))',
            }}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
          >
            <div className="bg-bg-dark/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl p-3 text-sm">
              {tooltip.type === 'month' ? (
                <MonthTooltipContent
                  month={tooltip.month!}
                  commits={tooltip.commits!}
                  releases={tooltip.releases!}
                  membersByLogin={membersByLogin}
                />
              ) : (
                <ReleaseTooltipContent release={tooltip.release!} membersByLogin={membersByLogin} />
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

interface MonthTooltipProps {
  month: string;
  commits: number;
  releases: Release[];
  membersByLogin: Record<string, { avatar_url: string; html_url: string }>;
}

function MonthTooltipContent({ month, commits, releases, membersByLogin }: MonthTooltipProps) {
  return (
    <>
      <div className="text-white font-medium">{month} 2025</div>
      <div className="text-text-secondary mt-1">
        <span className="text-vendure-primary font-semibold">{commits}</span> commits
      </div>

      {releases.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span>🚀</span>
            <span className="text-text-secondary">
              {releases.length} release{releases.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {releases.map(r => (
              <div key={r.tag_name}>
                <a
                  href={r.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block px-2 py-1 rounded text-xs hover:bg-white/5 ${
                    r.release_type === 'minor'
                      ? 'border-l-2 border-release-minor text-release-minor'
                      : 'border-l border-release-patch text-white/80'
                  }`}
                >
                  {r.tag_name}
                </a>
                {r.contributors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 ml-2">
                    {r.contributors.map(login => {
                      const member = membersByLogin[login];
                      return (
                        <a
                          key={login}
                          href={member?.html_url || `https://github.com/${login}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-1 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                          title={login}
                        >
                          <img
                            src={member?.avatar_url || `https://github.com/${login}.png?size=40`}
                            alt=""
                            className="w-3 h-3 rounded-full"
                          />
                          <span className="text-[10px] text-text-secondary">{login}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

interface ReleaseTooltipProps {
  release: Release;
  membersByLogin: Record<string, { avatar_url: string; html_url: string }>;
}

function ReleaseTooltipContent({ release, membersByLogin }: ReleaseTooltipProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span>🚀</span>
        <a
          href={release.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-semibold hover:underline ${
            release.release_type === 'minor' ? 'text-release-minor' : 'text-white'
          }`}
        >
          {release.tag_name}
        </a>
      </div>
      <div className="text-text-secondary text-xs mt-1">
        {release.release_type === 'minor' ? 'Minor Release' : 'Patch Release'} · {' '}
        {new Date(release.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
      {release.highlights && (
        <p className="text-text-secondary text-xs mt-2 line-clamp-3">
          {release.highlights}
        </p>
      )}
      {release.contributors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="text-text-secondary text-xs mb-1.5">Contributors:</div>
          <div className="flex flex-wrap gap-1.5">
            {release.contributors.map(login => {
              const member = membersByLogin[login];
              return (
                <a
                  key={login}
                  href={member?.html_url || `https://github.com/${login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                  title={login}
                >
                  <img
                    src={member?.avatar_url || `https://github.com/${login}.png?size=40`}
                    alt=""
                    className="w-4 h-4 rounded-full"
                  />
                  <span className="text-xs text-text-secondary">{login}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
