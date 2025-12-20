// =====================================================
// MAIN APPLICATION ENTRY POINT
// Vendure Community Wrapped 2025
// =====================================================

import './styles.css';

// Types
import type { CommunityMember } from './types';

// Services
import { loadAndMergeData, getAllMembers, findMemberByLogin } from './services/data-service';
import { launchConfetti } from './services/confetti-service';

// Components
import { createSnowflakesHtml, initSnowflakes } from './components/snowflakes';
import { renderActivityHeatmap } from './components/heatmap';
import { renderContributionTypes } from './components/donut-chart';
import { renderMonthlyTrend } from './components/monthly-trend';
import { renderContributorCards } from './components/contributor-card';
import { renderModalHtml, openModal, setupModalListeners } from './components/modal';
import { renderWorldMapHtml, loadWorldMap } from './components/world-map';



// =====================================================
// PAGE RENDERING
// =====================================================

function renderPage(members: CommunityMember[]): string {
  const totalCommits = members.reduce((sum, m) => sum + m.commitCount, 0);
  const totalIssues = members.reduce((sum, m) => sum + m.issueCount, 0);

  return `
    ${createSnowflakesHtml()}
    
    <a href="#main-content" class="sr-only skip-link">Skip to main content</a>
    
    <header class="header" role="banner">
      <div class="header-content">
        <div class="header-decoration header-decoration-left" aria-hidden="true">
          <div class="decoration-line"></div>
          <div class="decoration-dot"></div>
        </div>
        
        <div class="header-main">
          <div class="vendure-logo">
            <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 28" width="80" height="56" aria-hidden="true">
              <path d="M10.746 12.685v9.263c0 .166.093.323.237.405l8.407 4.762c.302.17.671.17.973 0l8.407-4.762a.466.466 0 0 0 .237-.405v-9.263a.476.476 0 0 0-.714-.404l-7.93 4.49a.996.996 0 0 1-.973 0l-7.93-4.49a.476.476 0 0 0-.714.404Z" fill="#17c1ff"></path>
              <path d="M8.893.75.486 5.51A.948.948 0 0 0 0 6.333v9.522c0 .167.092.324.237.405l8.176 4.633a.476.476 0 0 0 .714-.405v-8.982c0-.34.185-.655.487-.824l7.93-4.491a.463.463 0 0 0 0-.81L9.366.75a.48.48 0 0 0-.477 0h.003ZM30.86.74l8.407 4.76c.301.17.486.487.486.825v9.522a.47.47 0 0 1-.237.405l-8.176 4.633a.476.476 0 0 1-.714-.405v-8.982a.945.945 0 0 0-.486-.824l-7.93-4.491a.463.463 0 0 1 0-.81L30.386.742a.48.48 0 0 1 .477 0h-.003Z" fill="#17c1ff"></path>
            </svg>
          </div>
          
          <div class="title-group">
            <span class="title-eyebrow">Vendure Open Source</span>
            <h1>
              <span class="title-line title-line-1">Community</span>
              <span class="title-line title-line-2">Wrapped</span>
            </h1>
            <div class="year-display">
              <span class="year-line" aria-hidden="true"></span>
              <span class="year-text">2025</span>
              <span class="year-line" aria-hidden="true"></span>
            </div>
          </div>
          
          <p class="subtitle">Celebrating the humans who pushed Vendure forward</p>
        </div>
        
        <div class="header-decoration header-decoration-right" aria-hidden="true">
          <div class="decoration-dot"></div>
          <div class="decoration-line"></div>
        </div>
      </div>
      
      <div class="header-glow" aria-hidden="true"></div>
    </header>
    
    <main id="main-content">
      <div class="stats-banner" role="region" aria-label="Summary statistics">
        <div class="stat-card">
          <span class="number counter" data-target="${members.length}">0</span>
          <span class="label">Contributors</span>
        </div>
        <div class="stat-card">
          <span class="number counter" data-target="${totalCommits}">0</span>
          <span class="label">Commits</span>
        </div>
        <div class="stat-card">
          <span class="number counter" data-target="${totalIssues}">0</span>
          <span class="label">Issues Opened</span>
        </div>
      </div>
      
      <section class="visualizations" aria-label="Community activity visualizations">
        <h2>Community Activity</h2>
        <div class="viz-grid">
          ${renderActivityHeatmap()}
          ${renderContributionTypes()}
          ${renderMonthlyTrend()}
        </div>
      </section>
      
      ${renderWorldMapHtml()}
      
      <section class="contributors-section" aria-label="Community leaderboard">
        <h2>Community Leaderboard</h2>
        <p class="section-subtitle">Ranked by contributions (commits weighted 3x, issues 1x)</p>
        
        <div class="filter-bar" role="search">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <input 
              type="text" 
              id="search-input" 
              placeholder="Search contributors..." 
              aria-label="Search contributors by name"
              autocomplete="off"
            />
          </div>
          <div class="filter-buttons" role="group" aria-label="Filter contributors">
            <button class="filter-btn active" data-filter="all" aria-pressed="true">All</button>
            <button class="filter-btn" data-filter="commits" aria-pressed="false">Has Commits</button>
            <button class="filter-btn" data-filter="issues" aria-pressed="false">Has Issues</button>
          </div>
          <div class="filter-count" aria-live="polite">
            <span id="visible-count">${members.length}</span> of ${members.length} contributors
          </div>
        </div>
        
        <div class="contributors-grid" id="contributors-grid" role="list">
          ${renderContributorCards(members)}
        </div>
      </section>
    </main>
    
    ${renderModalHtml()}
    
    <footer role="contentinfo">
      <p>Data from <a href="https://github.com/vendure-ecommerce/vendure" target="_blank" rel="noopener noreferrer">github.com/vendure-ecommerce/vendure</a></p>
      <p>Click on a contributor to see their details!</p>
    </footer>
  `;
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function setupFilterListeners(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const filterButtons = document.querySelectorAll('.filter-btn');
  const visibleCount = document.getElementById('visible-count');
  const allMembers = getAllMembers();
  
  let currentFilter = 'all';
  let currentSearch = '';
  
  function applyFilters(): void {
    const cards = document.querySelectorAll('.contributor-card') as NodeListOf<HTMLElement>;
    let visibleCards = 0;
    
    cards.forEach(card => {
      const login = (card.dataset.login || '').toLowerCase();
      const member = allMembers.find(m => m.login.toLowerCase() === login);
      if (!member) return;
      
      // Check search match
      const matchesSearch = login.includes(currentSearch.toLowerCase());
      
      // Check filter match
      let matchesFilter = true;
      if (currentFilter === 'commits') {
        matchesFilter = member.commitCount > 0;
      } else if (currentFilter === 'issues') {
        matchesFilter = member.issueCount > 0;
      }
      
      // Show/hide card
      if (matchesSearch && matchesFilter) {
        card.style.display = '';
        visibleCards++;
      } else {
        card.style.display = 'none';
      }
    });
    
    // Update count
    if (visibleCount) {
      visibleCount.textContent = visibleCards.toString();
    }
  }
  
  // Search input handler
  searchInput?.addEventListener('input', (e) => {
    currentSearch = (e.target as HTMLInputElement).value;
    applyFilters();
  });
  
  // Filter button handlers
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      currentFilter = (btn as HTMLElement).dataset.filter || 'all';
      applyFilters();
    });
  });
}

function setupCardListeners(): void {
  // Card click and keyboard handlers
  document.querySelectorAll('.contributor-card').forEach(card => {
    const element = card as HTMLElement;
    
    const handleActivation = () => {
      const login = element.dataset.login;
      if (!login) return;
      
      const member = findMemberByLogin(login);
      if (!member) return;
      
      openModal(member);
    };
    
    // Click handler
    element.addEventListener('click', handleActivation);
    
    // Keyboard handler (Enter and Space)
    element.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivation();
      }
    });
  });
}

function setupEventListeners(): void {
  setupFilterListeners();
  setupCardListeners();
  setupModalListeners();
}

// =====================================================
// COUNTER ANIMATION
// =====================================================

function animateCounters(): void {
  const counters = document.querySelectorAll('.counter');
  const duration = 4000; // 4 seconds
  const frameDuration = 1000 / 60; // 60fps
  const totalFrames = Math.round(duration / frameDuration);
  
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target') || '0', 10);
    let frame = 0;
    
    // Easing function - easeOutExpo for that mechanical counter feel
    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };
    
    const animate = () => {
      frame++;
      const progress = easeOutExpo(frame / totalFrames);
      const currentValue = Math.round(target * progress);
      
      counter.textContent = currentValue.toLocaleString();
      
      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      } else {
        // Ensure we end on the exact target value
        counter.textContent = target.toLocaleString();
      }
    };
    
    // Start animation with a slight delay for each counter
    requestAnimationFrame(animate);
  });
}

// =====================================================
// INITIALIZATION
// =====================================================

function init(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }
  
  try {
    // Load and merge commit + issue data
    const members = loadAndMergeData();
    
    // Handle empty data case
    if (members.length === 0) {
      app.innerHTML = `
        <div class="error" role="alert">
          <h2>No Data Available</h2>
          <p>Unable to load contributor data. Please try refreshing the page.</p>
          <button class="retry-btn" onclick="location.reload()">Retry</button>
        </div>
      `;
      return;
    }
    
    // Render the page
    app.innerHTML = renderPage(members);
    
    // Setup interactivity
    setupEventListeners();
    initSnowflakes();
    loadWorldMap();
    
    // Animate the stat counters
    setTimeout(animateCounters, 300);
    
    // Initial celebration confetti
    setTimeout(launchConfetti, 500);
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.innerHTML = `
      <div class="error" role="alert">
        <h2>Something Went Wrong</h2>
        <p>An error occurred while loading the application. Please try refreshing the page.</p>
        <button class="retry-btn" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Start the app
init();
