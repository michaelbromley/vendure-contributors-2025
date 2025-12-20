import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CommunityMember } from '../../types';
import { formatDate, truncate } from '../../utils/helpers';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ContributorModalProps {
  member: CommunityMember;
  onClose: () => void;
}

export default function ContributorModal({ member, onClose }: ContributorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Focus trap and escape key handling
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus the close button
    const closeBtn = modalRef.current?.querySelector('button');
    closeBtn?.focus();
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [onClose]);
  
  // Calculate stats
  const activeDays = member.commits.length > 0
    ? new Set(member.commits.map(c => new Date(c.date).toDateString())).size
    : 0;
  const closedIssues = member.issues.filter(i => i.state === 'closed').length;
  
  // Monthly data for timeline (commits and issues)
  const monthlyCommits: Record<string, number> = {};
  const monthlyIssues: Record<string, number> = {};
  MONTH_NAMES.forEach(m => {
    monthlyCommits[m] = 0;
    monthlyIssues[m] = 0;
  });
  member.commits.forEach(commit => {
    const month = MONTH_NAMES[new Date(commit.date).getMonth()];
    monthlyCommits[month] = (monthlyCommits[month] || 0) + 1;
  });
  member.issues.forEach(issue => {
    const month = MONTH_NAMES[new Date(issue.created_at).getMonth()];
    monthlyIssues[month] = (monthlyIssues[month] || 0) + 1;
  });
  const currentMonth = new Date().getMonth();
  const relevantMonths = MONTH_NAMES.slice(0, currentMonth + 1);
  const maxActivity = Math.max(
    ...Object.values(monthlyCommits),
    ...Object.values(monthlyIssues),
    1
  );
  
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-card/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center gap-4">
          <img
            src={member.avatar_url}
            alt={`${member.login}'s avatar`}
            className="w-16 h-16 rounded-full ring-2 ring-vendure-primary/50"
          />
          <div className="flex-1 min-w-0">
            <h2 id="modal-title" className="text-xl font-bold text-text-primary truncate">
              {member.login}
            </h2>
            <a
              href={member.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-vendure-primary text-sm hover:underline"
            >
              View GitHub Profile →
            </a>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Stats bubbles */}
          <div className="flex flex-wrap gap-3 justify-center">
            {member.commitCount > 0 && (
              <>
                <StatBubble value={member.commitCount} label="Commits" />
                <StatBubble value={activeDays} label="Active Days" />
              </>
            )}
            {member.issueCount > 0 && (
              <>
                <StatBubble value={member.issueCount} label="Issues" />
                {closedIssues > 0 && <StatBubble value={closedIssues} label="Resolved" />}
              </>
            )}
          </div>
          
          {/* Contribution timeline */}
          {(member.commitCount > 0 || member.issueCount > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Contribution Timeline</h3>
              <div className="bg-bg-dark/50 rounded-xl p-4">
                <div className="flex items-end gap-2 h-28">
                  {relevantMonths.map(month => {
                    const commits = monthlyCommits[month];
                    const issues = monthlyIssues[month];
                    const total = commits + issues;
                    const commitHeight = (commits / maxActivity) * 100;
                    const issueHeight = (issues / maxActivity) * 100;

                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        {/* Number label */}
                        {total > 0 && (
                          <span className="text-xs font-medium text-vendure-primary">
                            {total}
                          </span>
                        )}
                        {/* Stacked bars container */}
                        <div className="w-full flex flex-col items-center justify-end h-20">
                          {/* Issues bar (on top) */}
                          {issues > 0 && (
                            <div
                              className="w-3/4 rounded-t transition-all duration-500 shadow-sm"
                              style={{
                                height: `${Math.max(issueHeight, 8)}%`,
                                background: 'linear-gradient(180deg, #c4b5fd 0%, #a78bfa 50%, #8b5cf6 100%)',
                              }}
                            />
                          )}
                          {/* Commits bar (bottom) */}
                          {commits > 0 && (
                            <div
                              className={`w-3/4 transition-all duration-500 shadow-sm ${issues > 0 ? '' : 'rounded-t'} rounded-b`}
                              style={{
                                height: `${Math.max(commitHeight, 8)}%`,
                                background: 'linear-gradient(180deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%)',
                              }}
                            />
                          )}
                          {/* Empty state indicator */}
                          {total === 0 && (
                            <div className="w-3/4 h-1 bg-white/10 rounded" />
                          )}
                        </div>
                        {/* Month label */}
                        <span className="text-[10px] text-text-muted">{month}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                {(member.commitCount > 0 && member.issueCount > 0) && (
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/5">
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="w-2.5 h-2.5 rounded-sm bg-vendure-primary" />
                      Commits
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span className="w-2.5 h-2.5 rounded-sm bg-vendure-purple" />
                      Issues
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Recent commits */}
          {member.commits.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">Recent Commits</h3>
              <div className="space-y-2">
                {member.commits.slice(0, 5).map(commit => (
                  <div key={commit.sha} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-vendure-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={commit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary hover:text-vendure-primary transition-colors line-clamp-1"
                      >
                        {truncate(commit.message.split('\n')[0], 60)}
                      </a>
                      <span className="text-text-muted text-xs">{formatDate(commit.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recent issues */}
          {member.issues.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-3">Recent Issues</h3>
              <div className="space-y-2">
                {member.issues.slice(0, 5).map(issue => (
                  <div key={issue.number} className="flex items-start gap-2 text-sm">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${
                      issue.state === 'open' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-vendure-purple/20 text-vendure-purple'
                    }`}>
                      {issue.state}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary hover:text-vendure-primary transition-colors line-clamp-1"
                      >
                        {truncate(issue.title, 50)}
                      </a>
                      <span className="text-text-muted text-xs">#{issue.number} · {formatDate(issue.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatBubble({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/5 px-4 py-2 rounded-xl text-center">
      <div className="text-2xl font-bold text-vendure-primary">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}
