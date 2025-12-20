// =====================================================
// TOOLTIP COMPONENT
// Reusable interactive tooltip/overlay for charts
// =====================================================

import type { Release, Contributor } from '../types';
import { escapeHtml } from '../utils/helpers';
import contributorsData from '../data/contributors-2025.json';
import issueContributorsData from '../data/issue-contributors-2025.json';

// Build a lookup map for contributor avatars
const contributorAvatars: Record<string, string> = {};
(contributorsData as Contributor[]).forEach(c => {
  contributorAvatars[c.login.toLowerCase()] = c.avatar_url;
});
(issueContributorsData as unknown as Contributor[]).forEach(c => {
  if (!contributorAvatars[c.login.toLowerCase()]) {
    contributorAvatars[c.login.toLowerCase()] = c.avatar_url;
  }
});

/**
 * Get avatar URL for a contributor login
 */
function getAvatarUrl(login: string): string {
  return contributorAvatars[login.toLowerCase()] || `https://github.com/${login}.png?size=40`;
}

let tooltipEl: HTMLElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let isTooltipHovered = false;
let currentTriggerElement: Element | null = null;

// Track if device supports touch
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/**
 * Initialize the global tooltip element
 */
export function initTooltip(): void {
  if (tooltipEl) return;
  
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'chart-tooltip';
  tooltipEl.className = 'chart-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.style.cssText = `
    position: fixed;
    z-index: 10000;
    pointer-events: auto;
    opacity: 0;
    transition: opacity 0.15s ease;
  `;
  document.body.appendChild(tooltipEl);
  
  // Keep tooltip visible when hovering over it
  tooltipEl.addEventListener('mouseenter', () => {
    isTooltipHovered = true;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
  });
  
  tooltipEl.addEventListener('mouseleave', () => {
    isTooltipHovered = false;
    hideTooltip();
  });
  
  // Close tooltip when tapping outside on touch devices
  document.addEventListener('touchstart', (e) => {
    if (!tooltipEl) return;
    const target = e.target as Node;
    // If tap is outside tooltip and outside the trigger element, hide it
    if (!tooltipEl.contains(target) && 
        (!currentTriggerElement || !currentTriggerElement.contains(target))) {
      hideTooltipImmediate();
    }
  }, { passive: true });
}

/**
 * Set the current trigger element (for touch handling)
 */
export function setTriggerElement(el: Element | null): void {
  currentTriggerElement = el;
}

/**
 * Check if touch device
 */
export function isTouch(): boolean {
  return isTouchDevice();
}

/**
 * Show tooltip with content at specified position
 */
export function showTooltip(content: string, x: number, y: number): void {
  if (!tooltipEl) initTooltip();
  if (!tooltipEl) return;
  
  // Clear any pending hide timeout when showing a new tooltip
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  // Reset hover state - we're showing a fresh tooltip
  isTooltipHovered = false;
  
  tooltipEl.innerHTML = content;
  tooltipEl.style.opacity = '1';
  
  // Position tooltip, keeping it within viewport
  const rect = tooltipEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x + 15;
  let top = y - 10;
  
  // Adjust if tooltip would go off right edge
  if (left + rect.width > viewportWidth - 20) {
    left = x - rect.width - 15;
  }
  
  // Adjust if tooltip would go off bottom edge
  if (top + rect.height > viewportHeight - 20) {
    top = y - rect.height - 10;
  }
  
  // Ensure not off top or left edge
  left = Math.max(10, left);
  top = Math.max(10, top);
  
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

/**
 * Hide the tooltip (with delay to allow hovering to tooltip)
 */
export function hideTooltip(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  
  hideTimeout = setTimeout(() => {
    if (!isTooltipHovered && tooltipEl) {
      tooltipEl.style.opacity = '0';
      currentTriggerElement = null;
    }
  }, 100);
}

/**
 * Hide tooltip immediately (for touch interactions)
 */
export function hideTooltipImmediate(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  if (tooltipEl) {
    tooltipEl.style.opacity = '0';
  }
  currentTriggerElement = null;
  isTooltipHovered = false;
}

/**
 * Generate tooltip content for a heatmap cell
 */
export function getHeatmapTooltipContent(
  date: string, 
  commits: number, 
  release?: Release
): string {
  const dateFormatted = new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  let content = `
    <div class="tooltip-header">
      <span class="tooltip-date">${escapeHtml(dateFormatted)}</span>
    </div>
    <div class="tooltip-stats">
      <span class="tooltip-commits">${commits}</span> commit${commits !== 1 ? 's' : ''}
    </div>
  `;
  
  if (release) {
    const releaseTypeClass = release.release_type === 'minor' ? 'release-minor' : 'release-patch';
    const releaseTypeLabel = release.release_type === 'minor' ? 'Minor Release' : 'Patch Release';
    
    // Generate contributor avatars - show ALL contributors
    const contributorAvatarsHtml = release.contributors.length > 0 
      ? release.contributors.map(login => `
          <a href="https://github.com/${escapeHtml(login)}" target="_blank" class="tooltip-avatar-link" title="@${escapeHtml(login)}">
            <img src="${getAvatarUrl(login)}" alt="@${escapeHtml(login)}" class="tooltip-avatar" loading="lazy" />
          </a>
        `).join('')
      : '';
    
    content += `
      <div class="tooltip-release ${releaseTypeClass}">
        <div class="tooltip-release-header">
          <span class="tooltip-release-icon">🚀</span>
          <a href="${escapeHtml(release.html_url)}" target="_blank" class="tooltip-release-tag">${escapeHtml(release.tag_name)}</a>
          <span class="tooltip-release-type">${releaseTypeLabel}</span>
        </div>
        ${release.highlights ? `<div class="tooltip-release-highlights">${escapeHtml(release.highlights.substring(0, 120))}${release.highlights.length > 120 ? '...' : ''}</div>` : ''}
        ${release.contributors.length > 0 ? `
          <div class="tooltip-release-contributors">
            <span class="tooltip-label">Contributors (${release.contributors.length}):</span>
            <div class="tooltip-avatars">
              ${contributorAvatarsHtml}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  return content;
}

/**
 * Generate tooltip content for a chart data point (monthly)
 */
export function getChartTooltipContent(
  month: string,
  commits: number,
  releases: Release[]
): string {
  let content = `
    <div class="tooltip-header">
      <span class="tooltip-month">${escapeHtml(month)} 2025</span>
    </div>
    <div class="tooltip-stats">
      <span class="tooltip-commits">${commits}</span> commits
    </div>
  `;
  
  if (releases.length > 0) {
    const minorReleases = releases.filter(r => r.release_type === 'minor');
    const patchReleases = releases.filter(r => r.release_type === 'patch');
    
    content += `
      <div class="tooltip-releases">
        <div class="tooltip-releases-header">
          <span class="tooltip-release-icon">🚀</span>
          <span>${releases.length} release${releases.length !== 1 ? 's' : ''}</span>
          ${minorReleases.length > 0 ? `<span class="tooltip-release-badge minor">${minorReleases.length} minor</span>` : ''}
          ${patchReleases.length > 0 ? `<span class="tooltip-release-badge patch">${patchReleases.length} patch</span>` : ''}
        </div>
        <div class="tooltip-release-list">
          ${releases.map(r => `
            <a href="${escapeHtml(r.html_url)}" target="_blank" class="tooltip-release-item ${r.release_type}">
              <span class="tooltip-release-tag">${escapeHtml(r.tag_name)}</span>
              <span class="tooltip-release-date">${new Date(r.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  return content;
}

/**
 * Generate tooltip content for a release marker on the chart
 */
export function getReleaseTooltipContent(release: Release): string {
  const releaseTypeClass = release.release_type === 'minor' ? 'release-minor' : 'release-patch';
  const releaseTypeLabel = release.release_type === 'minor' ? 'Minor Release' : 'Patch Release';
  const dateFormatted = new Date(release.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  
  // Generate contributor avatars - show ALL contributors
  const contributorAvatarsHtml = release.contributors.length > 0 
    ? release.contributors.map(login => `
        <a href="https://github.com/${escapeHtml(login)}" target="_blank" class="tooltip-avatar-link" title="@${escapeHtml(login)}">
          <img src="${getAvatarUrl(login)}" alt="@${escapeHtml(login)}" class="tooltip-avatar" loading="lazy" />
        </a>
      `).join('')
    : '';
  
  return `
    <div class="tooltip-release-full ${releaseTypeClass}">
      <div class="tooltip-release-header">
        <span class="tooltip-release-icon">🚀</span>
        <a href="${escapeHtml(release.html_url)}" target="_blank" class="tooltip-release-tag">${escapeHtml(release.tag_name)}</a>
      </div>
      <div class="tooltip-release-meta">
        <span class="tooltip-release-type">${releaseTypeLabel}</span>
        <span class="tooltip-release-date">${dateFormatted}</span>
      </div>
      ${release.highlights ? `<div class="tooltip-release-highlights">${escapeHtml(release.highlights.substring(0, 150))}${release.highlights.length > 150 ? '...' : ''}</div>` : ''}
      ${release.contributors.length > 0 ? `
        <div class="tooltip-release-contributors">
          <span class="tooltip-label">Contributors (${release.contributors.length}):</span>
          <div class="tooltip-avatars">
            ${contributorAvatarsHtml}
          </div>
        </div>
      ` : ''}
      <a href="${escapeHtml(release.html_url)}" target="_blank" class="tooltip-click-hint">Click to view release notes →</a>
    </div>
  `;
}
