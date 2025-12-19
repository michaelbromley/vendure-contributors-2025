// =====================================================
// DATA SERVICE
// Handles loading and merging contributor data
// =====================================================

import type { CommunityMember, RawCommitContributor, RawIssueContributor, CommitDetail } from '../types';
import { COMMIT_WEIGHT, ISSUE_WEIGHT } from '../utils/constants';
import contributorsData from '../data/contributors-2025.json';
import issueContributorsData from '../data/issue-contributors-2025.json';

// Store merged contributor data
let allMembers: CommunityMember[] = [];

/**
 * Load and merge commit + issue contributor data
 */
export function loadAndMergeData(): CommunityMember[] {
  const commitData = contributorsData as RawCommitContributor[];
  const issueData = issueContributorsData as RawIssueContributor[];
  
  // Create map of all members
  const memberMap = new Map<string, CommunityMember>();
  
  // Add commit contributors
  for (const c of commitData) {
    memberMap.set(c.login, {
      login: c.login,
      avatar_url: c.avatar_url,
      html_url: c.html_url,
      commits: c.commits,
      issues: [],
      commitCount: c.contributions,
      issueCount: 0,
      score: c.contributions * COMMIT_WEIGHT
    });
  }
  
  // Merge in issue contributors
  for (const i of issueData) {
    const existing = memberMap.get(i.login);
    if (existing) {
      existing.issues = i.issues;
      existing.issueCount = i.count;
      existing.score += i.count * ISSUE_WEIGHT;
    } else {
      // Issue-only contributor (no commits)
      memberMap.set(i.login, {
        login: i.login,
        avatar_url: i.avatar_url,
        html_url: `https://github.com/${i.login}`,
        commits: [],
        issues: i.issues,
        commitCount: 0,
        issueCount: i.count,
        score: i.count * ISSUE_WEIGHT
      });
    }
  }
  
  // Sort by score (weighted combination)
  allMembers = Array.from(memberMap.values()).sort((a, b) => b.score - a.score);
  return allMembers;
}

/**
 * Get all members (must call loadAndMergeData first)
 */
export function getAllMembers(): CommunityMember[] {
  return allMembers;
}

/**
 * Set all members (used during initialization)
 */
export function setAllMembers(members: CommunityMember[]): void {
  allMembers = members;
}

/**
 * Get all commits from all members
 */
export function getAllCommits(): CommitDetail[] {
  return allMembers.flatMap(m => m.commits);
}

/**
 * Find a member by login
 */
export function findMemberByLogin(login: string): CommunityMember | undefined {
  return allMembers.find(m => m.login === login);
}
