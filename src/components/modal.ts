// =====================================================
// MODAL COMPONENT
// Contributor detail modal with focus trap
// =====================================================

import type { CommunityMember, CommitDetail } from '../types';
import { MONTH_NAMES } from '../utils/constants';
import { getMonthName, escapeHtml, truncate, formatDate } from '../utils/helpers';
import { launchConfetti } from '../services/confetti-service';

// Focus trap state
let focusableElements: HTMLElement[] = [];
let firstFocusable: HTMLElement | null = null;
let lastFocusable: HTMLElement | null = null;
let previouslyFocusedElement: HTMLElement | null = null;

/**
 * Render the modal HTML structure
 */
export function renderModalHtml(): string {
  return `
    <div class="modal-overlay" id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-name" aria-hidden="true">
      <div class="modal">
        <button class="modal-close-btn" id="modal-close" aria-label="Close modal">&times;</button>
        <div class="modal-header">
          <img class="modal-avatar" id="modal-avatar" src="" alt="" />
          <div class="modal-title">
            <h2 id="modal-name"></h2>
            <a id="modal-profile" href="" target="_blank" rel="noopener noreferrer" class="profile-link">View GitHub Profile →</a>
          </div>
        </div>
        <div id="modal-stats"></div>
        <div id="modal-timeline"></div>
        <div id="modal-commits"></div>
      </div>
    </div>
  `;
}

/**
 * Render contribution timeline bar chart for modal
 */
export function renderContributionTimeline(commits: CommitDetail[]): string {
  // Group commits by month
  const monthlyData: Record<string, number> = {};
  
  // Initialize all months with 0
  MONTH_NAMES.forEach(m => monthlyData[m] = 0);
  
  commits.forEach(commit => {
    const date = new Date(commit.date);
    const month = getMonthName(date.getMonth());
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });
  
  const maxCommits = Math.max(...Object.values(monthlyData), 1);
  
  // Only show months up to current month
  const currentMonth = new Date().getMonth();
  const relevantMonths = MONTH_NAMES.slice(0, currentMonth + 1);
  
  const bars = relevantMonths.map(month => {
    const count = monthlyData[month];
    const height = (count / maxCommits) * 100;
    return `
      <div class="timeline-bar-container">
        <div class="timeline-bar" style="height: ${Math.max(height, 4)}%" role="img" aria-label="${escapeHtml(month)}: ${count} commits">
          ${count > 0 ? `<span class="bar-count">${count}</span>` : ''}
        </div>
        <span class="timeline-label">${escapeHtml(month)}</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="contribution-timeline" role="region" aria-label="Monthly contribution timeline">
      <h3>Contribution Timeline</h3>
      <div class="timeline-chart">
        ${bars}
      </div>
    </div>
  `;
}

/**
 * Render member stats bubbles
 */
export function renderMemberStats(member: CommunityMember): string {
  const commits = member.commits;
  const issues = member.issues;
  
  // Calculate active days from commits
  let activeDays = 0;
  if (commits.length > 0) {
    const uniqueDays = new Set(commits.map(c => new Date(c.date).toDateString()));
    activeDays = uniqueDays.size;
  }
  
  // Calculate closed issues count
  const closedIssues = issues.filter(i => i.state === 'closed').length;
  
  const stats: string[] = [];
  
  if (member.commitCount > 0) {
    stats.push(`
      <div class="stat-bubble">
        <span class="stat-value">${member.commitCount}</span>
        <span class="stat-label">Commits</span>
      </div>
    `);
    stats.push(`
      <div class="stat-bubble">
        <span class="stat-value">${activeDays}</span>
        <span class="stat-label">Active Days</span>
      </div>
    `);
  }
  
  if (member.issueCount > 0) {
    stats.push(`
      <div class="stat-bubble">
        <span class="stat-value">${member.issueCount}</span>
        <span class="stat-label">Issues</span>
      </div>
    `);
    if (closedIssues > 0) {
      stats.push(`
        <div class="stat-bubble">
          <span class="stat-value">${closedIssues}</span>
          <span class="stat-label">Resolved</span>
        </div>
      `);
    }
  }
  
  return `<div class="contribution-stats" role="list" aria-label="Contribution statistics">${stats.join('')}</div>`;
}

/**
 * Render member activity (recent commits and issues)
 */
export function renderMemberActivity(member: CommunityMember): string {
  const sections: string[] = [];
  
  // Recent commits
  if (member.commits.length > 0) {
    const recentCommits = member.commits.slice(0, 5);
    const commitList = recentCommits.map(commit => {
      const formattedDate = formatDate(commit.date);
      const message = truncate(commit.message.split('\n')[0], 60);
      return `
        <div class="commit-item">
          <span class="commit-bullet" aria-hidden="true"></span>
          <div class="commit-content">
            <a href="${escapeHtml(commit.url)}" target="_blank" rel="noopener noreferrer" class="commit-message">${escapeHtml(message)}</a>
            <span class="commit-date">${escapeHtml(formattedDate)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    sections.push(`
      <div class="activity-section">
        <h4>Recent Commits</h4>
        <div class="commit-list" role="list">${commitList}</div>
      </div>
    `);
  }
  
  // Recent issues
  if (member.issues.length > 0) {
    const recentIssues = member.issues.slice(0, 5);
    const issueList = recentIssues.map(issue => {
      const formattedDate = formatDate(issue.created_at);
      const stateClass = issue.state === 'open' ? 'issue-open' : 'issue-closed';
      return `
        <div class="issue-item">
          <span class="issue-state ${stateClass}">${escapeHtml(issue.state)}</span>
          <div class="issue-content">
            <a href="${escapeHtml(issue.html_url)}" target="_blank" rel="noopener noreferrer" class="issue-title">${escapeHtml(truncate(issue.title, 50))}</a>
            <span class="issue-date">#${issue.number} · ${escapeHtml(formattedDate)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    sections.push(`
      <div class="activity-section">
        <h4>Recent Issues</h4>
        <div class="issue-list" role="list">${issueList}</div>
      </div>
    `);
  }
  
  return sections.join('');
}

/**
 * Setup focus trap for modal
 */
function setupFocusTrap(modal: HTMLElement): void {
  focusableElements = Array.from(
    modal.querySelectorAll<HTMLElement>(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
  );
  
  firstFocusable = focusableElements[0] || null;
  lastFocusable = focusableElements[focusableElements.length - 1] || null;
}

/**
 * Handle tab key for focus trap
 */
function handleTabKey(e: KeyboardEvent): void {
  if (e.key !== 'Tab') return;
  
  if (e.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable?.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable?.focus();
    }
  }
}

/**
 * Open modal with member data
 */
export function openModal(member: CommunityMember): void {
  const modal = document.getElementById('modal');
  const modalAvatar = document.getElementById('modal-avatar') as HTMLImageElement | null;
  const modalName = document.getElementById('modal-name');
  const modalProfile = document.getElementById('modal-profile') as HTMLAnchorElement | null;
  const modalStats = document.getElementById('modal-stats');
  const modalTimeline = document.getElementById('modal-timeline');
  const modalCommits = document.getElementById('modal-commits');
  
  if (!modal || !modalAvatar || !modalName || !modalProfile || !modalStats || !modalTimeline || !modalCommits) {
    return;
  }
  
  // Store currently focused element
  previouslyFocusedElement = document.activeElement as HTMLElement;
  
  // Populate modal
  modalAvatar.src = member.avatar_url;
  modalAvatar.alt = `${member.login}'s avatar`;
  modalName.textContent = member.login;
  modalProfile.href = member.html_url;
  
  // Render the contribution visualizations
  modalStats.innerHTML = renderMemberStats(member);
  modalTimeline.innerHTML = member.commitCount > 0 ? renderContributionTimeline(member.commits) : '';
  modalCommits.innerHTML = renderMemberActivity(member);
  
  // Show modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  // Setup focus trap
  setupFocusTrap(modal);
  
  // Add keyboard handler for focus trap
  modal.addEventListener('keydown', handleTabKey);
  
  // Focus first focusable element
  setTimeout(() => {
    firstFocusable?.focus();
  }, 100);
  
  // Celebration!
  launchConfetti();
}

/**
 * Close modal
 */
export function closeModal(): void {
  const modal = document.getElementById('modal');
  if (!modal) return;
  
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  // Remove keyboard handler
  modal.removeEventListener('keydown', handleTabKey);
  
  // Restore focus
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = null;
}

/**
 * Setup modal event listeners
 */
export function setupModalListeners(): void {
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modal-close');
  
  // Close button
  modalClose?.addEventListener('click', closeModal);
  
  // Click outside modal
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeModal();
    }
  });
}
