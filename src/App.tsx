import { useState, useEffect, createContext, useContext } from 'react';
import { useData, type DataContext } from './hooks/useData';
import Header from './components/react/Header';
import StatsBanner from './components/react/StatsBanner';
import ActivityHeatmap from './components/react/ActivityHeatmap';
import DonutChart from './components/react/DonutChart';
import MonthlyTrend from './components/react/MonthlyTrend';
import WorldMap from './components/react/WorldMap';
import Leaderboard from './components/react/Leaderboard';
import ContributorModal from './components/react/ContributorModal';
import Snowflakes from './components/react/Snowflakes';
import type { CommunityMember } from './types';
import { launchConfetti } from './services/confetti-service';

// Create context for data
const DataCtx = createContext<DataContext | null>(null);
export const useDataContext = () => {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useDataContext must be used within DataProvider');
  return ctx;
};

export default function App() {
  const data = useData();
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);

  // Initial confetti on load
  useEffect(() => {
    const timer = setTimeout(() => launchConfetti(), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenModal = (member: CommunityMember) => {
    setSelectedMember(member);
    launchConfetti();
  };

  const handleCloseModal = () => {
    setSelectedMember(null);
  };

  return (
    <DataCtx.Provider value={data}>
      <div className="min-h-screen relative overflow-x-hidden">
        <Snowflakes />
        
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-vendure-primary focus:text-bg-dark focus:rounded">
          Skip to main content
        </a>
        
        <Header />
        
        <main id="main-content" className="relative z-10">
          <StatsBanner />
          
          <section className="max-w-7xl mx-auto px-4 py-8" aria-label="Community activity visualizations">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-gradient">
              Community Activity
            </h2>
            
            {/* Visualizations Grid - heatmap 2/3, donut 1/3 on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <ActivityHeatmap />
              </div>
              <DonutChart />
              <div className="md:col-span-3">
                <MonthlyTrend />
              </div>
            </div>
          </section>
          
          <WorldMap />
          
          <Leaderboard onSelectMember={handleOpenModal} />
        </main>
        
        <footer className="text-center py-8 text-text-secondary text-sm">
          <p>
            Data from{' '}
            <a 
              href="https://github.com/vendure-ecommerce/vendure" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-vendure-primary hover:underline"
            >
              github.com/vendure-ecommerce/vendure
            </a>
          </p>
          <p className="mt-2">Click on a contributor to see their details!</p>
        </footer>
        
        {selectedMember && (
          <ContributorModal 
            member={selectedMember} 
            onClose={handleCloseModal} 
          />
        )}
      </div>
    </DataCtx.Provider>
  );
}
