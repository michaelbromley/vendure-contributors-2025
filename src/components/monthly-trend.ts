// =====================================================
// MONTHLY TREND COMPONENT
// Line chart showing monthly commit activity
// =====================================================

import { getAllCommits } from '../services/data-service';
import { MONTH_NAMES } from '../utils/constants';
import { getMonthName, escapeHtml } from '../utils/helpers';

/**
 * Render monthly trend line chart
 */
export function renderMonthlyTrend(): string {
  const commits = getAllCommits();
  const monthlyData: Record<string, number> = {};
  
  // Initialize all months up to current
  const currentMonth = new Date().getMonth();
  for (let i = 0; i <= currentMonth; i++) {
    monthlyData[MONTH_NAMES[i]] = 0;
  }
  
  // Count commits per month
  commits.forEach(commit => {
    const month = getMonthName(new Date(commit.date).getMonth());
    if (monthlyData[month] !== undefined) {
      monthlyData[month]++;
    }
  });
  
  const months = Object.keys(monthlyData);
  const values = Object.values(monthlyData);
  const maxValue = Math.max(...values, 1);
  
  // SVG dimensions - wider to fill container
  const width = 800;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 35, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate points
  const points = values.map((val, i) => {
    const x = padding.left + (i / (months.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
    return { x, y, val };
  });
  
  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Create area path
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding.left} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;
  
  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const y = padding.top + chartHeight * (1 - pct);
    const val = Math.round(maxValue * pct);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="grid-line"/><text x="${padding.left - 5}" y="${y}" class="axis-label" text-anchor="end" dy="0.3em">${val}</text>`;
  }).join('');
  
  // X axis labels
  const xLabels = months.map((month, i) => {
    const x = padding.left + (i / (months.length - 1 || 1)) * chartWidth;
    return `<text x="${x}" y="${height - 8}" class="axis-label" text-anchor="middle">${escapeHtml(month)}</text>`;
  }).join('');
  
  // Data points with accessible titles
  const dataPoints = points.map((p, i) => {
    const monthName = months[i];
    return `<circle cx="${p.x}" cy="${p.y}" r="4" class="data-point" role="img" aria-label="${escapeHtml(monthName)}: ${p.val} commits"><title>${p.val} commits</title></circle>`;
  }).join('');
  
  // Calculate summary for screen readers
  const totalCommits = values.reduce((a, b) => a + b, 0);
  const avgCommits = Math.round(totalCommits / months.length);
  
  return `
    <div class="viz-card viz-card-wide" role="region" aria-label="Monthly activity trend chart">
      <h3>Monthly Activity Trend</h3>
      <p class="sr-only">Chart showing ${totalCommits} total commits over ${months.length} months, averaging ${avgCommits} commits per month.</p>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="line-chart" role="img" aria-label="Line chart of monthly commit activity">
        ${gridLines}
        <path d="${areaPath}" class="chart-area"/>
        <path d="${linePath}" class="chart-line"/>
        ${dataPoints}
        ${xLabels}
      </svg>
    </div>
  `;
}
