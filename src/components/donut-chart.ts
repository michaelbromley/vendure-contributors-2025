// =====================================================
// DONUT CHART COMPONENT
// Contribution types breakdown
// =====================================================

import { getAllCommits } from '../services/data-service';
import { COMMIT_TYPE_COLORS } from '../utils/constants';
import { getCommitType, escapeHtml } from '../utils/helpers';

/**
 * Render contribution types donut chart
 */
export function renderContributionTypes(): string {
  const commits = getAllCommits();
  const types: Record<string, number> = {};
  
  commits.forEach(commit => {
    const type = getCommitType(commit.message);
    types[type] = (types[type] || 0) + 1;
  });
  
  const total = commits.length;
  
  // Sort by count
  const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);
  
  // Create SVG donut chart
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
    const escapedType = escapeHtml(type);
    const percentageText = (percentage * 100).toFixed(1);
    
    return `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${color}" class="donut-segment" role="img" aria-label="${escapedType}: ${count} commits, ${percentageText}%"><title>${escapedType}: ${count} (${percentageText}%)</title></path>`;
  }).join('');
  
  const legend = sortedTypes.slice(0, 6).map(([type, count]) => {
    const color = COMMIT_TYPE_COLORS[type] || '#475569';
    const percentage = ((count / total) * 100).toFixed(0);
    const escapedType = escapeHtml(type);
    return `<div class="legend-item"><span class="legend-color" style="background: ${color}" aria-hidden="true"></span><span class="legend-label">${escapedType}</span><span class="legend-value">${percentage}%</span></div>`;
  }).join('');
  
  return `
    <div class="viz-card" role="region" aria-label="Contribution types breakdown">
      <h3>Contribution Types</h3>
      <div class="donut-container">
        <svg viewBox="0 0 160 160" class="donut-chart" role="img" aria-label="Donut chart showing ${total} total commits by type">
          ${paths}
          <text x="${cx}" y="${cy}" text-anchor="middle" dy="0.3em" class="donut-center-text">${total}</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-label">commits</text>
        </svg>
        <div class="donut-legend" role="list" aria-label="Commit type legend">${legend}</div>
      </div>
    </div>
  `;
}
