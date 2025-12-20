import { useMemo } from 'react';
import { useDataContext, useSnowMode } from '../../App';
import { getCommitType } from '../../utils/helpers';

const COMMIT_TYPE_COLORS: Record<string, string> = {
  feat: '#17c1ff',
  fix: '#f87171',
  docs: '#a78bfa',
  refactor: '#fbbf24',
  chore: '#64748b',
  test: '#34d399',
  style: '#f472b6',
  perf: '#fb923c',
  ci: '#60a5fa',
  build: '#94a3b8',
  revert: '#ef4444',
  other: '#475569'
};

// Inline styles for SVG elements (can't use Tailwind easily)
const styles = {
  segment: {
    transition: 'transform 0.2s ease, filter 0.2s ease',
    transformOrigin: 'center',
    cursor: 'pointer',
  } as React.CSSProperties,
  centerText: {
    fill: '#e0f2fe',
    fontSize: 24,
    fontWeight: 700,
  } as React.CSSProperties,
  centerLabel: {
    fill: '#a8d8ea',
    fontSize: 10,
  } as React.CSSProperties,
};

export default function DonutChart() {
  const { allCommits } = useDataContext();
  const { mode } = useSnowMode();
  const isKitz = mode === 'kitz';
  
  const { paths, sortedTypes, total } = useMemo(() => {
    const types: Record<string, number> = {};
    
    allCommits.forEach(commit => {
      const type = getCommitType(commit.message);
      types[type] = (types[type] || 0) + 1;
    });
    
    const total = allCommits.length;
    const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);
    
    let currentAngle = 0;
    const radius = 60;
    const innerRadius = 35;
    const cx = 80;
    const cy = 80;
    
    const paths = sortedTypes.map(([type, count]) => {
      const percentage = count / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      const startRad = (startAngle - 90) * Math.PI / 180;
      const endRad = (endAngle - 90) * Math.PI / 180;
      
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const x3 = cx + innerRadius * Math.cos(endRad);
      const y3 = cy + innerRadius * Math.sin(endRad);
      const x4 = cx + innerRadius * Math.cos(startRad);
      const y4 = cy + innerRadius * Math.sin(startRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      const color = COMMIT_TYPE_COLORS[type] || '#475569';
      
      return {
        type,
        count,
        percentage: (percentage * 100).toFixed(1),
        color,
        d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
      };
    });
    
    return { paths, sortedTypes, total };
  }, [allCommits]);
  
  return (
    <div className="glass-card p-4 md:p-6" role="region" aria-label="Contribution types breakdown">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Contribution Types</h3>
      
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut chart */}
        <svg 
          viewBox="0 0 160 160" 
          className="w-40 h-40 flex-shrink-0"
          role="img" 
          aria-label={`Donut chart showing ${total} total commits by type`}
        >
          <style>{`
            .donut-segment:hover {
              transform: scale(1.02);
              filter: brightness(1.2);
            }
          `}</style>
          {paths.map(({ type, count, percentage, color, d }) => (
            <path
              key={type}
              d={d}
              fill={color}
              style={styles.segment}
              className="donut-segment"
              role="img"
              aria-label={`${type}: ${count} commits, ${percentage}%`}
            >
              <title>{type}: {count} ({percentage}%)</title>
            </path>
          ))}
          <text
            x="80"
            y="80"
            textAnchor="middle"
            dy="0.3em"
            style={{ ...styles.centerText, fill: isKitz ? '#0d9488' : '#e0f2fe' }}
          >
            {total}
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            style={{ ...styles.centerLabel, fill: isKitz ? '#4b5563' : '#a8d8ea' }}
          >
            commits
          </text>
        </svg>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center sm:justify-start" role="list">
          {sortedTypes.slice(0, 6).map(([type, count]) => {
            const color = COMMIT_TYPE_COLORS[type] || '#475569';
            const percentage = ((count / total) * 100).toFixed(0);
            return (
              <div key={type} className="flex items-center gap-2 text-sm" role="listitem">
                <span 
                  className="w-3 h-3 rounded-sm flex-shrink-0" 
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="text-text-secondary">{type}</span>
                <span className="text-text-primary font-medium">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
