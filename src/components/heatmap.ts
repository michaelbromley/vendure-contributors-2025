// =====================================================
// ACTIVITY HEATMAP COMPONENT
// GitHub-style contribution heatmap with release markers
// =====================================================

import { getAllCommits } from '../services/data-service';
import { MONTH_NAMES } from '../utils/constants';
import { escapeHtml } from '../utils/helpers';
import type { Release } from '../types';
import releasesData from '../data/releases-2025.json';
import { initTooltip, showTooltip, hideTooltip, getHeatmapTooltipContent, setTriggerElement, isTouch } from './tooltip';

// Store data for interactive tooltips
let heatmapData: {
  commitsByDate: Record<string, number>;
  releasesByDate: Record<string, Release>;
} | null = null;

/**
 * Render GitHub-style activity heatmap
 */
export function renderActivityHeatmap(): string {
  const commits = getAllCommits();
  const releases = releasesData as Release[];
  const commitsByDate: Record<string, number> = {};
  
  // Create release lookups
  const releasesByDate: Record<string, Release> = {};
  releases.forEach(r => {
    releasesByDate[r.published_at] = r;
  });
  
  // Store for later use
  heatmapData = { commitsByDate, releasesByDate };
  
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
      const release = releasesByDate[date];
      const releaseClass = release ? ` release-day release-${release.release_type}` : '';
      return `<div class="heatmap-cell level-${level}${releaseClass}" data-date="${date}" role="gridcell"></div>`;
    }).join('');
    return `<div class="heatmap-week" role="row">${weekCells}</div>`;
  }).join('');
  
  // Month labels
  const currentMonth = new Date().getMonth();
  const monthLabels = MONTH_NAMES
    .slice(0, currentMonth + 1)
    .map(m => `<span>${escapeHtml(m)}</span>`)
    .join('');
  
  // Count minor vs patch releases
  const minorCount = releases.filter(r => r.release_type === 'minor').length;
  const patchCount = releases.filter(r => r.release_type === 'patch').length;
  
  return `
    <div class="viz-card" role="region" aria-label="Activity heatmap showing commits per day">
      <h3>Activity Heatmap</h3>
      <div class="heatmap-container">
        <div class="heatmap-scroll-wrapper">
          <div class="heatmap-months" aria-hidden="true">${monthLabels}</div>
          <div class="heatmap" role="grid" aria-label="Commit activity calendar" id="activity-heatmap">${cells}</div>
        </div>
        <div class="heatmap-legend" aria-hidden="true">
          <span>Less</span>
          <div class="heatmap-cell level-0"></div>
          <div class="heatmap-cell level-1"></div>
          <div class="heatmap-cell level-2"></div>
          <div class="heatmap-cell level-3"></div>
          <div class="heatmap-cell level-4"></div>
          <span>More</span>
          <span class="legend-separator">|</span>
          <div class="heatmap-cell release-marker minor"></div>
          <span>Minor (${minorCount})</span>
          <div class="heatmap-cell release-marker patch"></div>
          <span>Patch (${patchCount})</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize heatmap interactivity (call after DOM is ready)
 */
export function initHeatmapInteractivity(): void {
  initTooltip();
  
  const heatmap = document.getElementById('activity-heatmap');
  if (!heatmap || !heatmapData) return;
  
  const showCellTooltip = (cell: HTMLElement, clientX: number, clientY: number) => {
    const date = cell.dataset.date;
    if (!date) return;
    
    const commits = heatmapData!.commitsByDate[date] || 0;
    const release = heatmapData!.releasesByDate[date];
    
    const content = getHeatmapTooltipContent(date, commits, release);
    setTriggerElement(cell);
    showTooltip(content, clientX, clientY);
  };
  
  // Mouse events for desktop
  heatmap.addEventListener('mouseover', (e) => {
    const cell = (e.target as HTMLElement).closest('.heatmap-cell[data-date]') as HTMLElement;
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    showCellTooltip(cell, rect.right, rect.top);
  });
  
  heatmap.addEventListener('mouseout', (e) => {
    const cell = (e.target as HTMLElement).closest('.heatmap-cell[data-date]');
    if (cell) {
      hideTooltip();
    }
  });
  
  // Touch events for mobile - tap to show tooltip
  // Use touchend instead of touchstart to not interfere with scrolling
  let touchStartTime = 0;
  let touchStartPos = { x: 0, y: 0 };
  
  heatmap.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  
  heatmap.addEventListener('touchend', (e) => {
    const cell = (e.target as HTMLElement).closest('.heatmap-cell[data-date]') as HTMLElement;
    if (!cell) return;
    
    // Only show tooltip if it was a tap (not a scroll)
    const touchDuration = Date.now() - touchStartTime;
    const touch = e.changedTouches[0];
    const touchDistance = Math.sqrt(
      Math.pow(touch.clientX - touchStartPos.x, 2) + 
      Math.pow(touch.clientY - touchStartPos.y, 2)
    );
    
    // If touch was quick and didn't move much, it's a tap
    if (touchDuration < 300 && touchDistance < 10) {
      showCellTooltip(cell, touch.clientX, touch.clientY);
    }
  }, { passive: true });
  
  // Click on release days opens the release page (works for both mouse and touch)
  heatmap.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest('.heatmap-cell.release-day') as HTMLElement;
    if (!cell) return;
    
    const date = cell.dataset.date;
    if (!date || !heatmapData) return;
    
    const release = heatmapData.releasesByDate[date];
    if (release) {
      // On touch devices, first tap shows tooltip, second tap opens link
      if (isTouch()) {
        // Check if tooltip is already showing for this cell
        const tooltip = document.getElementById('chart-tooltip');
        if (tooltip && tooltip.style.opacity === '1') {
          window.open(release.html_url, '_blank');
        }
      } else {
        window.open(release.html_url, '_blank');
      }
    }
  });
}
