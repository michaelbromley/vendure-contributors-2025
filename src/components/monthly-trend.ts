// =====================================================
// MONTHLY TREND COMPONENT
// Line chart showing monthly commit activity with release markers
// =====================================================

import { getAllCommits } from '../services/data-service';
import { MONTH_NAMES } from '../utils/constants';
import { getMonthName, escapeHtml } from '../utils/helpers';
import type { Release } from '../types';
import releasesData from '../data/releases-2025.json';
import { initTooltip, showTooltip, hideTooltip, getChartTooltipContent, getReleaseTooltipContent } from './tooltip';

// Store data for interactive tooltips
let chartData: {
  monthlyData: Record<string, number>;
  releasesByMonth: Record<string, Release[]>;
  releases: Release[];
} | null = null;

/**
 * Render monthly trend line chart with release markers
 */
export function renderMonthlyTrend(): string {
  const commits = getAllCommits();
  const releases = releasesData as Release[];
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
  
  // Group releases by month and sort by date within each month
  const releasesByMonth: Record<string, Release[]> = {};
  releases.forEach(release => {
    const monthIdx = new Date(release.published_at).getMonth();
    const monthName = MONTH_NAMES[monthIdx];
    if (!releasesByMonth[monthName]) {
      releasesByMonth[monthName] = [];
    }
    releasesByMonth[monthName].push(release);
  });
  // Sort releases within each month by date (earliest first)
  Object.values(releasesByMonth).forEach(monthReleases => {
    monthReleases.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
  });
  
  // Store for interactivity
  chartData = { monthlyData, releasesByMonth, releases };
  
  const months = Object.keys(monthlyData);
  const values = Object.values(monthlyData);
  const maxValue = Math.max(...values, 1);
  
  // SVG dimensions - wider to fill container
  const width = 800;
  const height = 180;
  const padding = { top: 25, right: 30, bottom: 35, left: 50 };
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
  
  // Data points with month data
  const dataPoints = points.map((p, i) => {
    const monthName = months[i];
    return `<circle cx="${p.x}" cy="${p.y}" r="5" class="data-point" data-month="${escapeHtml(monthName)}" data-commits="${p.val}"></circle>`;
  }).join('');
  
  // Release markers - vertical lines with dots, differentiated by type
  const releaseMarkers = months.map((month, i) => {
    const monthReleases = releasesByMonth[month];
    if (!monthReleases || monthReleases.length === 0) return '';
    
    const x = padding.left + (i / (months.length - 1 || 1)) * chartWidth;
    const releaseCount = monthReleases.length;
    
    // Create markers for each release in the month (staggered if multiple)
    return monthReleases.map((release, ri) => {
      const offsetX = releaseCount > 1 ? (ri - (releaseCount - 1) / 2) * 10 : 0;
      const markerX = x + offsetX;
      const typeClass = release.release_type;
      return `
        <line x1="${markerX}" y1="${padding.top}" x2="${markerX}" y2="${padding.top + chartHeight}" class="release-marker-line ${typeClass}" />
        <circle cx="${markerX}" cy="${padding.top - 8}" r="5" class="release-marker-dot ${typeClass}" data-release="${escapeHtml(release.tag_name)}"></circle>
      `;
    }).join('');
  }).join('');
  
  // Calculate summary
  const totalCommits = values.reduce((a, b) => a + b, 0);
  const avgCommits = Math.round(totalCommits / months.length);
  const minorCount = releases.filter(r => r.release_type === 'minor').length;
  const patchCount = releases.filter(r => r.release_type === 'patch').length;
  
  return `
    <div class="viz-card viz-card-wide" role="region" aria-label="Monthly activity trend chart">
      <h3>Monthly Activity Trend</h3>
      <p class="sr-only">Chart showing ${totalCommits} total commits over ${months.length} months, averaging ${avgCommits} commits per month. ${releases.length} releases marked.</p>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="line-chart" role="img" aria-label="Line chart of monthly commit activity" id="monthly-trend-chart">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#17c1ff" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#17c1ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridLines}
        ${releaseMarkers}
        <path d="${areaPath}" class="chart-area"/>
        <path d="${linePath}" class="chart-line"/>
        ${dataPoints}
        ${xLabels}
      </svg>
      <div class="chart-legend">
        <span class="legend-item"><span class="legend-dot commits"></span> Commits</span>
        <span class="legend-item"><span class="legend-dot minor"></span> Minor (${minorCount})</span>
        <span class="legend-item"><span class="legend-dot patch"></span> Patch (${patchCount})</span>
      </div>
    </div>
  `;
}

/**
 * Initialize chart interactivity (call after DOM is ready)
 */
export function initChartInteractivity(): void {
  initTooltip();
  
  const chart = document.getElementById('monthly-trend-chart');
  if (!chart || !chartData) return;
  
  // Data point hover
  chart.querySelectorAll('.data-point').forEach(point => {
    point.addEventListener('mouseenter', (e) => {
      const el = e.target as SVGCircleElement;
      const month = el.dataset.month;
      const commits = parseInt(el.dataset.commits || '0', 10);
      if (!month) return;
      
      const releases = chartData!.releasesByMonth[month] || [];
      const content = getChartTooltipContent(month, commits, releases);
      
      const rect = el.getBoundingClientRect();
      showTooltip(content, rect.right, rect.top);
    });
    
    point.addEventListener('mouseleave', hideTooltip);
  });
  
  // Release marker hover
  chart.querySelectorAll('.release-marker-dot').forEach(dot => {
    dot.addEventListener('mouseenter', (e) => {
      const el = e.target as SVGCircleElement;
      const tagName = el.dataset.release;
      if (!tagName) return;
      
      const release = chartData!.releases.find(r => r.tag_name === tagName);
      if (!release) return;
      
      const content = getReleaseTooltipContent(release);
      const rect = el.getBoundingClientRect();
      showTooltip(content, rect.right, rect.top);
    });
    
    dot.addEventListener('mouseleave', hideTooltip);
    
    // Click opens release page
    dot.addEventListener('click', (e) => {
      const el = e.target as SVGCircleElement;
      const tagName = el.dataset.release;
      if (!tagName) return;
      
      const release = chartData!.releases.find(r => r.tag_name === tagName);
      if (release) {
        window.open(release.html_url, '_blank');
      }
    });
  });
}
