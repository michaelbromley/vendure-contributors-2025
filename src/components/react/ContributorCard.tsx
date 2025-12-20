import type { CommunityMember } from '../../types';

interface ContributorCardProps {
  member: CommunityMember;
  onClick: () => void;
}

const BAR_CAP = 20;

export default function ContributorCard({ member, onClick }: ContributorCardProps) {
  const commitBarWidth = Math.min((member.commitCount / BAR_CAP) * 100, 100);
  const issueBarWidth = Math.min((member.issueCount / BAR_CAP) * 100, 100);
  
  return (
    <div
      className="group relative bg-white/[0.08] backdrop-blur-sm rounded-[20px] p-6 text-center border-2 border-transparent cursor-pointer transition-all duration-400 overflow-hidden hover:-translate-y-2.5 hover:scale-105 hover:border-vendure-primary/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(23,193,255,0.2)] focus:-translate-y-2.5 focus:scale-105 focus:border-vendure-primary/50 focus:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(23,193,255,0.2)] outline-none"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${member.login}. ${member.commitCount} commits, ${member.issueCount} issues.`}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-vendure-primary/15 via-teal-500/10 to-vendure-primary/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Avatar container */}
      <div className="relative w-[100px] h-[100px] mx-auto mb-4">
        {/* Animated dashed ring */}
        <div 
          className="absolute -inset-[5px] rounded-full border-2 border-dashed border-vendure-primary/40 group-hover:border-vendure-primary/80 transition-colors"
          style={{ 
            animation: 'spin 10s linear infinite',
          }}
        />
        <style>{`
          .group:hover div[style*="spin"] {
            animation-duration: 3s !important;
          }
        `}</style>
        <img
          src={member.avatar_url}
          alt=""
          className="w-[100px] h-[100px] rounded-full object-cover border-[3px] border-white/30 relative z-10 transition-all duration-300 group-hover:border-vendure-primary group-hover:shadow-[0_0_20px_rgba(23,193,255,0.4)]"
          loading="lazy"
        />
      </div>
      
      {/* Name */}
      <div 
        className="font-bold text-base mb-2 text-white relative z-10 truncate"
        title={member.login}
      >
        {member.login}
      </div>
      
      {/* Stats bars */}
      <div className="flex flex-col gap-1.5 w-full relative z-10 mt-2" aria-hidden="true">
        {/* Commits bar */}
        <div className="flex items-center gap-2">
          <span className="text-[0.7rem] min-w-[70px] text-right text-vendure-primary">
            {member.commitCount} commit{member.commitCount !== 1 ? 's' : ''}
          </span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-[3px] overflow-hidden">
            <div 
              className="h-full rounded-[3px] bg-gradient-to-r from-[#0d6efd] to-vendure-primary transition-all duration-300"
              style={{ width: `${commitBarWidth}%` }}
            />
          </div>
        </div>
        
        {/* Issues bar */}
        <div className="flex items-center gap-2">
          <span className="text-[0.7rem] min-w-[70px] text-right text-vendure-purple">
            {member.issueCount} issue{member.issueCount !== 1 ? 's' : ''}
          </span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-[3px] overflow-hidden">
            <div 
              className="h-full rounded-[3px] bg-gradient-to-r from-vendure-purple-dark to-vendure-purple transition-all duration-300"
              style={{ width: `${issueBarWidth}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
