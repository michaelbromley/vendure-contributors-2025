import { useMemo, useState } from 'react';
import { useDataContext } from '../../App';
import type { Release } from '../../types';
import Tooltip from './Tooltip';

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
    cursor: 'pointer',
    filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.8))',
  },
  releaseDotPatch: {
    fill: 'rgba(251, 191, 36, 0.5)',
    cursor: 'pointer',
  },
};

interface TooltipData {
  type: 'month' | 'release';
  month?: string;
  commits?: number;
  releases?: Release[];
  release?: Release;
  x: number;
  y: number;
}

export default function MonthlyTrend() {
  const { allCommits, releases } = useDataContext();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  
  const { points, linePath, areaPath, gridLines, releasesByMonth, maxValue, months } = useMemo(() => {
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
    
    return { points, linePath, areaPath, gridLines, releasesByMonth, maxValue, months, chartWidth, chartHeight, padding, width, height };
  }, [allCommits, releases]);
  
  const width = 800;
  const height = 180;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;
  
  const minorCount = releases.filter(r => r.release_type === 'minor').length;
  const patchCount = releases.filter(r => r.release_type === 'patch').length;
  
  const handlePointHover = (point: typeof points[0], e: React.MouseEvent) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    setTooltip({
      type: 'month',
      month: point.month,
      commits: point.val,
      releases: releasesByMonth[point.month] || [],
      x: rect.right,
      y: rect.top,
    });
  };
  
  const handleReleaseHover = (release: Release, e: React.MouseEvent) => {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    setTooltip({
      type: 'release',
      release,
      x: rect.right,
      y: rect.top,
    });
  };
  
  return (
    <div className="glass-card p-4 md:p-6 mt-6" role="region" aria-label="Monthly activity trend chart">
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
                      onMouseEnter={(e) => handleReleaseHover(release, e)}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => window.open(release.html_url, '_blank')}
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
                onMouseEnter={(e) => handlePointHover(point, e)}
                onMouseLeave={() => setTooltip(null)}
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
      
      {tooltip && (
        <Tooltip x={tooltip.x} y={tooltip.y}>
          {tooltip.type === 'month' ? (
            <MonthTooltipContent 
              month={tooltip.month!} 
              commits={tooltip.commits!} 
              releases={tooltip.releases!} 
            />
          ) : (
            <ReleaseTooltipContent release={tooltip.release!} />
          )}
        </Tooltip>
      )}
    </div>
  );
}

function MonthTooltipContent({ month, commits, releases }: { month: string; commits: number; releases: Release[] }) {
  return (
    <div className="min-w-[200px]">
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
          <div className="space-y-1">
            {releases.map(r => (
              <a 
                key={r.tag_name}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReleaseTooltipContent({ release }: { release: Release }) {
  return (
    <div className="min-w-[250px]">
      <div className="flex items-center gap-2">
        <span>🚀</span>
        <span className={`font-semibold ${
          release.release_type === 'minor' ? 'text-release-minor' : 'text-white'
        }`}>
          {release.tag_name}
        </span>
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
        <div className="mt-3">
          <span className="text-text-secondary text-xs">
            {release.contributors.length} contributor{release.contributors.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      <a 
        href={release.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-vendure-primary text-xs mt-2 block hover:underline"
      >
        Click to view release notes →
      </a>
    </div>
  );
}
