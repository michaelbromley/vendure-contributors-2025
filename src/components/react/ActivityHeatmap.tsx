import { useMemo, useState, useRef } from 'react';
import { useDataContext } from '../../App';
import type { Release } from '../../types';
import Tooltip from './Tooltip';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Heatmap color levels
const HEATMAP_COLORS = {
  0: 'rgba(255, 255, 255, 0.1)',
  1: 'rgba(23, 193, 255, 0.25)',
  2: 'rgba(23, 193, 255, 0.5)',
  3: 'rgba(23, 193, 255, 0.75)',
  4: '#17c1ff',
} as const;

interface TooltipData {
  date: string;
  commits: number;
  release?: Release;
  x: number;
  y: number;
}

interface CellProps {
  date: string;
  level: number;
  release?: Release;
  onHover: (date: string, e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: (date: string) => void;
}

function HeatmapCell({ date, level, release, onHover, onLeave, onClick }: CellProps) {
  const baseStyle: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: 2,
    background: HEATMAP_COLORS[level as keyof typeof HEATMAP_COLORS],
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: release ? 'pointer' : 'default',
  };

  // Add release glow
  if (release?.release_type === 'minor') {
    baseStyle.boxShadow = '0 0 8px rgba(251, 191, 36, 0.8), inset 0 0 0 1px rgba(251, 191, 36, 0.6)';
  } else if (release?.release_type === 'patch') {
    baseStyle.boxShadow = '0 0 4px rgba(251, 191, 36, 0.4), inset 0 0 0 1px rgba(251, 191, 36, 0.3)';
  }

  return (
    <div
      style={baseStyle}
      className="hover:scale-130 hover:z-10"
      role="gridcell"
      onMouseEnter={(e) => onHover(date, e)}
      onMouseLeave={onLeave}
      onClick={() => onClick(date)}
    />
  );
}

function LegendCell({ level, isRelease, releaseType }: { level?: number; isRelease?: boolean; releaseType?: 'minor' | 'patch' }) {
  const style: React.CSSProperties = {
    width: 12,
    height: 12,
    borderRadius: 2,
    background: level !== undefined ? HEATMAP_COLORS[level as keyof typeof HEATMAP_COLORS] : HEATMAP_COLORS[0],
  };

  if (isRelease && releaseType === 'minor') {
    style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.8), inset 0 0 0 1px rgba(251, 191, 36, 0.6)';
  } else if (isRelease && releaseType === 'patch') {
    style.boxShadow = '0 0 4px rgba(251, 191, 36, 0.4), inset 0 0 0 1px rgba(251, 191, 36, 0.3)';
  }

  return <div style={style} />;
}

export default function ActivityHeatmap() {
  const { allCommits, releases } = useDataContext();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  
  const currentMonth = new Date().getMonth();
  const monthLabels = MONTH_NAMES.slice(0, currentMonth + 1);
  
  const minorCount = releases.filter(r => r.release_type === 'minor').length;
  const patchCount = releases.filter(r => r.release_type === 'patch').length;
  
  const handleCellHover = (date: string, e: React.MouseEvent) => {
    if (!date) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      date,
      commits: commitsByDate[date] || 0,
      release: releasesByDate[date],
      x: rect.right,
      y: rect.top,
    });
  };
  
  const handleCellClick = (date: string) => {
    const release = releasesByDate[date];
    if (release) {
      window.open(release.html_url, '_blank');
    }
  };
  
  const getLevel = (count: number) => {
    if (count === 0) return 0;
    return Math.min(4, Math.ceil((count / maxCommits) * 4));
  };
  
  return (
    <div className="glass-card p-4 md:p-6" role="region" aria-label="Activity heatmap">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Activity Heatmap</h3>
      
      <div className="overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0" ref={containerRef}>
        <div className="min-w-[700px] md:min-w-0">
          {/* Month labels */}
          <div className="flex mb-1 text-xs text-text-secondary">
            {monthLabels.map(m => (
              <span key={m} className="flex-1 text-center">{m}</span>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex gap-[3px]" role="grid" aria-label="Commit activity calendar">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]" role="row">
                {week.map((date, di) => {
                  if (!date) {
                    return <div key={di} className="w-3 h-3" />;
                  }
                  
                  const count = commitsByDate[date] || 0;
                  const level = getLevel(count);
                  const release = releasesByDate[date];
                  
                  return (
                    <HeatmapCell
                      key={date}
                      date={date}
                      level={level}
                      release={release}
                      onHover={handleCellHover}
                      onLeave={() => setTooltip(null)}
                      onClick={handleCellClick}
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
          <LegendCell key={level} level={level} />
        ))}
        <span>More</span>
        <span className="mx-2 text-white/30">|</span>
        <LegendCell isRelease releaseType="minor" />
        <span>Minor ({minorCount})</span>
        <LegendCell isRelease releaseType="patch" />
        <span>Patch ({patchCount})</span>
      </div>
      
      {tooltip && (
        <Tooltip x={tooltip.x} y={tooltip.y}>
          <HeatmapTooltipContent 
            date={tooltip.date} 
            commits={tooltip.commits} 
            release={tooltip.release} 
          />
        </Tooltip>
      )}
    </div>
  );
}

function HeatmapTooltipContent({ date, commits, release }: { date: string; commits: number; release?: Release }) {
  const dateFormatted = new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  return (
    <div className="min-w-[200px]">
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
            <span 
              className="font-semibold"
              style={{ color: release.release_type === 'minor' ? '#fbbf24' : 'rgba(255,255,255,0.8)' }}
            >
              {release.tag_name}
            </span>
          </div>
          {release.highlights && (
            <p className="text-text-secondary text-xs mt-1 line-clamp-2">
              {release.highlights}
            </p>
          )}
          <p className="text-vendure-primary text-xs mt-2">Click to view release notes →</p>
        </div>
      )}
    </div>
  );
}
