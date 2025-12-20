import { useEffect, useRef } from 'react';
import { useDataContext } from '../../App';

interface StatCardProps {
  value: number;
  label: string;
}

function StatCard({ value, label }: StatCardProps) {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const duration = 4000;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;
    
    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };
    
    const animate = () => {
      frame++;
      const progress = easeOutExpo(frame / totalFrames);
      const currentValue = Math.round(value * progress);
      el.textContent = currentValue.toLocaleString();
      
      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        el.textContent = value.toLocaleString();
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return (
    <div className="glass-card px-6 py-4 md:px-8 md:py-6 text-center flex-1 min-w-0">
      <span 
        ref={ref}
        className="block text-3xl md:text-4xl lg:text-5xl font-bold text-vendure-primary"
      >
        0
      </span>
      <span className="text-text-secondary text-sm md:text-base mt-1 block">
        {label}
      </span>
    </div>
  );
}

export default function StatsBanner() {
  const { stats } = useDataContext();
  
  return (
    <div 
      className="max-w-4xl mx-auto px-4 -mt-4 relative z-20"
      role="region" 
      aria-label="Summary statistics"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <StatCard value={stats.totalContributors} label="Contributors" />
        <StatCard value={stats.totalCommits} label="Commits" />
        <StatCard value={stats.totalIssues} label="Issues Opened" />
      </div>
    </div>
  );
}
