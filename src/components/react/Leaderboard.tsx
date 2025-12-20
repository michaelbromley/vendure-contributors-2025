import { useState, useMemo } from 'react';
import { useDataContext } from '../../App';
import type { CommunityMember } from '../../types';
import ContributorCard from './ContributorCard';

interface LeaderboardProps {
  onSelectMember: (member: CommunityMember) => void;
}

export default function Leaderboard({ onSelectMember }: LeaderboardProps) {
  const { members } = useDataContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'commits' | 'issues'>('all');
  
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // Search filter
      const matchesSearch = member.login.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter
      let matchesFilter = true;
      if (filter === 'commits') {
        matchesFilter = member.commitCount > 0;
      } else if (filter === 'issues') {
        matchesFilter = member.issueCount > 0;
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [members, searchTerm, filter]);
  
  return (
    <section className="py-12 px-4" aria-label="Community leaderboard">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 text-gradient">
          Community Leaderboard
        </h2>
        <p className="text-text-secondary text-center mb-8">
          Ranked by contributions (commits weighted 3x, issues 1x)
        </p>
        
        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search contributors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-dark/50 border border-white/10 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-vendure-primary/50 focus:ring-1 focus:ring-vendure-primary/25"
                aria-label="Search contributors by name"
              />
            </div>
            
            {/* Filter buttons */}
            <div className="flex gap-2" role="group" aria-label="Filter contributors">
              {(['all', 'commits', 'issues'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-vendure-primary text-bg-dark'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'commits' ? 'Has Commits' : 'Has Issues'}
                </button>
              ))}
            </div>
            
            {/* Count */}
            <div className="text-text-secondary text-sm" aria-live="polite">
              <span className="text-vendure-primary font-medium">{filteredMembers.length}</span> of {members.length} contributors
            </div>
          </div>
        </div>
        
        {/* Contributors grid */}
        <div 
          className="flex flex-wrap justify-center gap-6"
          role="list"
        >
          {filteredMembers.map((member) => (
            <ContributorCard 
              key={member.login} 
              member={member} 
              onClick={() => onSelectMember(member)}
            />
          ))}
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            No contributors found matching your criteria.
          </div>
        )}
      </div>
    </section>
  );
}
