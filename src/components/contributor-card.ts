// =====================================================
// CONTRIBUTOR CARD COMPONENT
// Individual contributor card in the leaderboard
// =====================================================

import type { CommunityMember } from '../types';
import { escapeHtml } from '../utils/helpers';

// Cap bars at 20 for full width (so smaller contributors don't look empty)
const BAR_CAP = 20;

/**
 * Render a single contributor card
 */
export function renderContributorCard(member: CommunityMember): string {
  // Calculate bar widths capped at BAR_CAP
  const commitBarWidth = Math.min((member.commitCount / BAR_CAP) * 100, 100);
  const issueBarWidth = Math.min((member.issueCount / BAR_CAP) * 100, 100);
  
  const escapedLogin = escapeHtml(member.login);
  
  return `
    <div class="contributor-card" 
         data-login="${escapedLogin}"
         tabindex="0"
         role="button"
         aria-label="View details for ${escapedLogin}. ${member.commitCount} commits, ${member.issueCount} issues.">
      <div class="avatar-container">
        <div class="avatar-ring" aria-hidden="true"></div>
        <img class="avatar" src="${escapeHtml(member.avatar_url)}" alt="" loading="lazy" />
      </div>
      <div class="contributor-name" title="${escapedLogin}">${escapedLogin}</div>
      <div class="member-bars" aria-hidden="true">
        <div class="bar-row">
          <span class="bar-label commits">${member.commitCount} commit${member.commitCount !== 1 ? 's' : ''}</span>
          <div class="bar-track">
            <div class="bar-fill commits" style="width: ${commitBarWidth}%"></div>
          </div>
        </div>
        <div class="bar-row">
          <span class="bar-label issues">${member.issueCount} issue${member.issueCount !== 1 ? 's' : ''}</span>
          <div class="bar-track">
            <div class="bar-fill issues" style="width: ${issueBarWidth}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render all contributor cards
 */
export function renderContributorCards(members: CommunityMember[]): string {
  return members.map(member => renderContributorCard(member)).join('');
}
