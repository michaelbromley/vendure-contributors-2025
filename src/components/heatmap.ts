// =====================================================
// ACTIVITY HEATMAP COMPONENT
// GitHub-style contribution heatmap
// =====================================================

import { getAllCommits } from '../services/data-service';
import { MONTH_NAMES } from '../utils/constants';
import { escapeHtml } from '../utils/helpers';

/**
 * Render GitHub-style activity heatmap
 */
export function renderActivityHeatmap(): string {
  const commits = getAllCommits();
  const commitsByDate: Record<string, number> = {};
  
  // Count commits per day
  commits.forEach(commit => {
    const date = new Date(commit.date).toISOString().split('T')[0];
    commitsByDate[date] = (commitsByDate[date] || 0) + 1;
  });
  
  // Generate calendar for 2025 (up to current date)
  const startDate = new Date('2025-01-01');
  const endDate = new Date();
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  
  // Pad first week with empty cells
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
  
  // Push remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  
  const maxCommits = Math.max(...Object.values(commitsByDate), 1);
  
  const cells = weeks.map(week => {
    const weekCells = week.map(date => {
      if (!date) return '<div class="heatmap-cell empty"></div>';
      const count = commitsByDate[date] || 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCommits) * 4));
      const tooltip = escapeHtml(`${date}: ${count} commit${count !== 1 ? 's' : ''}`);
      return `<div class="heatmap-cell level-${level}" title="${tooltip}" role="gridcell" aria-label="${tooltip}"></div>`;
    }).join('');
    return `<div class="heatmap-week" role="row">${weekCells}</div>`;
  }).join('');
  
  // Month labels
  const currentMonth = new Date().getMonth();
  const monthLabels = MONTH_NAMES
    .slice(0, currentMonth + 1)
    .map(m => `<span>${escapeHtml(m)}</span>`)
    .join('');
  
  return `
    <div class="viz-card" role="region" aria-label="Activity heatmap showing commits per day">
      <h3>Activity Heatmap</h3>
      <div class="heatmap-container">
        <div class="heatmap-months" aria-hidden="true">${monthLabels}</div>
        <div class="heatmap" role="grid" aria-label="Commit activity calendar">${cells}</div>
        <div class="heatmap-legend" aria-hidden="true">
          <span>Less</span>
          <div class="heatmap-cell level-0"></div>
          <div class="heatmap-cell level-1"></div>
          <div class="heatmap-cell level-2"></div>
          <div class="heatmap-cell level-3"></div>
          <div class="heatmap-cell level-4"></div>
          <span>More</span>
        </div>
      </div>
    </div>
  `;
}
