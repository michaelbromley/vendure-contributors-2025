import { useMemo } from 'react';
import type { CommunityMember, RawCommitContributor, RawIssueContributor, Release } from '../types';
import contributorsData from '../data/contributors-2025.json';
import issueContributorsData from '../data/issue-contributors-2025.json';
import releasesData from '../data/releases-2025.json';

const COMMIT_WEIGHT = 3;
const ISSUE_WEIGHT = 1;

export function useData() {
  const members = useMemo(() => {
    const commitData = contributorsData as RawCommitContributor[];
    const issueData = issueContributorsData as RawIssueContributor[];
    
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
    
    return Array.from(memberMap.values()).sort((a, b) => b.score - a.score);
  }, []);

  const allCommits = useMemo(() => {
    return members.flatMap(m => m.commits);
  }, [members]);

  const releases = useMemo(() => {
    return releasesData as Release[];
  }, []);

  const stats = useMemo(() => ({
    totalContributors: members.length,
    totalCommits: members.reduce((sum, m) => sum + m.commitCount, 0),
    totalIssues: members.reduce((sum, m) => sum + m.issueCount, 0),
  }), [members]);

  return {
    members,
    allCommits,
    releases,
    stats,
    findMemberByLogin: (login: string) => members.find(m => m.login === login),
  };
}

export type DataContext = ReturnType<typeof useData>;
