import { useMemo, useState, useRef, useCallback } from 'react';
import { useDataContext, useSnowMode } from '../../App';
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

// Theme-aware heatmap colors
const getHeatmapColors = (isKitz: boolean) => ({
  0: isKitz ? 'rgba(20, 184, 198, 0.15)' : 'rgba(255, 255, 255, 0.1)',
  1: isKitz ? 'rgba(20, 184, 198, 0.35)' : 'rgba(23, 193, 255, 0.25)',
  2: isKitz ? 'rgba(20, 184, 198, 0.55)' : 'rgba(23, 193, 255, 0.5)',
  3: isKitz ? 'rgba(20, 184, 198, 0.8)' : 'rgba(23, 193, 255, 0.75)',
  4: isKitz ? '#0d9ba8' : '#17c1ff',
} as const);

// Theme-aware release glow colors
const getReleaseGlow = (isKitz: boolean, type: 'minor' | 'patch') => {
  const color = isKitz ? '202, 138, 4' : '251, 191, 36';
  if (type === 'minor') {
    return `0 0 8px rgba(${color}, 0.8), inset 0 0 0 1px rgba(${color}, 0.6)`;
  }
  return `0 0 4px rgba(${color}, 0.4), inset 0 0 0 1px rgba(${color}, 0.3)`;
};

interface TooltipData {
  date: string;
  commits: number;
  release?: Release;
}

function LegendCell({ level, isRelease, releaseType, isKitz }: { level?: number; isRelease?: boolean; releaseType?: 'minor' | 'patch'; isKitz: boolean }) {
  const heatmapColors = getHeatmapColors(isKitz);
  const style: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: 2,
    background: level !== undefined ? heatmapColors[level as keyof typeof heatmapColors] : heatmapColors[0],
  };

  if (isRelease && releaseType) {
    style.boxShadow = getReleaseGlow(isKitz, releaseType);
  }

  return <div style={style} />;
}

export default function ActivityHeatmap() {
  const { allCommits, releases, members } = useDataContext();
  const { mode } = useSnowMode();
  const isKitz = mode === 'kitz';
  const heatmapColors = getHeatmapColors(isKitz);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const isTooltipHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const { weeks, commitsByDate, releasesByDate, maxCommits } = useMemo(() => {
    const commitsByDate: Record<string, number> = {};
    const releasesByDate: Record<string, Release> = {};

    allCommits.forEach(commit => {
      const date = new Date(commit.date).toISOString().split('T')[0];
      commitsByDate[date] = (commitsByDate[date] || 0) + 1;
    });

    releases.forEach(r => {
      releasesByDate[r.published_at] = r;
    });

    const startDate = new Date('2025-01-01');
    const endDate = new Date();
    const weeks: string[][] = [];
    let currentWeek: string[] = [];

    const firstDayOfWeek = startDate.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push('');
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      currentWeek.push(dateStr);

      if (current.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    const maxCommits = Math.max(...Object.values(commitsByDate), 1);

    return { weeks, commitsByDate, releasesByDate, maxCommits };
  }, [allCommits, releases]);

  // Create a lookup map for member avatars
  const membersByLogin = useMemo(() => {
    const map: Record<string, { avatar_url: string; html_url: string }> = {};
    members.forEach(m => {
      map[m.login] = { avatar_url: m.avatar_url, html_url: m.html_url };
    });
    return map;
  }, [members]);

  const currentMonth = new Date().getMonth();
  const monthLabels = MONTH_NAMES.slice(0, currentMonth + 1);

  const minorCount = releases.filter(r => r.release_type === 'minor').length;
  const patchCount = releases.filter(r => r.release_type === 'patch').length;

  // Clear any pending hide timeout
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Schedule tooltip hide with delay
  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      // Only hide if not hovering the tooltip itself - use ref for current value
      if (!isTooltipHoveredRef.current) {
        setTooltip(null);
      }
    }, 150);
  }, [clearHideTimeout]);

  const handleCellEnter = useCallback((date: string, element: HTMLElement) => {
    if (!date) return;

    clearHideTimeout();
    refs.setReference(element);
    setTooltip({
      date,
      commits: commitsByDate[date] || 0,
      release: releasesByDate[date],
    });
  }, [commitsByDate, releasesByDate, refs, clearHideTimeout]);

  const handleCellLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleTooltipEnter = useCallback(() => {
    clearHideTimeout();
    isTooltipHoveredRef.current = true;
  }, [clearHideTimeout]);

  const handleTooltipLeave = useCallback(() => {
    isTooltipHoveredRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  const getLevel = (count: number) => {
    if (count === 0) return 0;
    return Math.min(4, Math.ceil((count / maxCommits) * 4));
  };

  // Memoize cell styles to avoid recreating objects on every render
  const cellBaseStyle = useMemo(() => ({
    width: 12,
    height: 12,
    borderRadius: 2,
    transition: 'transform 0.2s, box-shadow 0.2s',
  }), []);

  // Event delegation handler - single handler instead of 365+ individual handlers
  const handleGridMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const date = target.dataset.date;
    if (date) {
      handleCellEnter(date, target);
    }
  }, [handleCellEnter]);

  const handleGridMouseOut = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.date) {
      handleCellLeave();
    }
  }, [handleCellLeave]);

  return (
    <div className="glass-card p-4 md:p-6" role="region" aria-label="Activity heatmap">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Activity Heatmap</h3>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="inline-block min-w-max">
          {/* Month labels */}
          <div className="flex mb-1 text-xs text-text-secondary">
            {monthLabels.map(m => (
              <span key={m} className="flex-1 text-center">{m}</span>
            ))}
          </div>

          {/* Heatmap grid - uses event delegation instead of individual handlers */}
          <div
            className="flex gap-[3px]"
            role="grid"
            aria-label="Commit activity calendar"
            onMouseOver={handleGridMouseOver}
            onMouseOut={handleGridMouseOut}
          >
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]" role="row">
                {week.map((date, di) => {
                  if (!date) {
                    return <div key={di} className="w-3 h-3" />;
                  }

                  const count = commitsByDate[date] || 0;
                  const level = getLevel(count);
                  const release = releasesByDate[date];
                  const releaseType = release?.release_type;

                  return (
                    <div
                      key={date}
                      data-date={date}
                      style={{
                        ...cellBaseStyle,
                        background: heatmapColors[level as keyof typeof heatmapColors],
                        boxShadow: releaseType ? getReleaseGlow(isKitz, releaseType) : undefined,
                      }}
                      className="hover:scale-125 hover:z-10 cursor-pointer"
                      role="gridcell"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-text-secondary flex-wrap">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <LegendCell key={level} level={level} isKitz={isKitz} />
        ))}
        <span>More</span>
        <span className={isKitz ? 'mx-2 text-black/20' : 'mx-2 text-white/30'}>|</span>
        <LegendCell isRelease releaseType="minor" isKitz={isKitz} />
        <span>Minor ({minorCount})</span>
        <LegendCell isRelease releaseType="patch" isKitz={isKitz} />
        <span>Patch ({patchCount})</span>
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
              <HeatmapTooltipContent
                date={tooltip.date}
                commits={tooltip.commits}
                release={tooltip.release}
                membersByLogin={membersByLogin}
              />
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}

interface HeatmapTooltipProps {
  date: string;
  commits: number;
  release?: Release;
  membersByLogin: Record<string, { avatar_url: string; html_url: string }>;
}

function HeatmapTooltipContent({ date, commits, release, membersByLogin }: HeatmapTooltipProps) {
  const dateFormatted = new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <>
      <div className="text-white font-medium">{dateFormatted}</div>
      <div className="text-text-secondary mt-1">
        <span className="text-vendure-primary font-semibold">{commits}</span> commit{commits !== 1 ? 's' : ''}
      </div>

      {release && (
        <div
          className="mt-3 p-2 rounded border-l-2"
          style={{
            borderColor: release.release_type === 'minor' ? '#fbbf24' : 'rgba(251, 191, 36, 0.5)',
            background: release.release_type === 'minor' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.05)',
          }}
        >
          <div className="flex items-center gap-2">
            <span>🚀</span>
            <a
              href={release.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: release.release_type === 'minor' ? '#fbbf24' : 'rgba(255,255,255,0.8)' }}
            >
              {release.tag_name}
            </a>
          </div>
          {release.highlights && (
            <p className="text-text-secondary text-xs mt-1 line-clamp-2">
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
        </div>
      )}
    </>
  );
}
