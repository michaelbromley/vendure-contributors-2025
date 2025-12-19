import './styles.css';
import confetti from 'canvas-confetti';

interface ContributionDetail {
  sha: string;
  message: string;
  date: string;
  url: string;
}

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  commits: ContributionDetail[];
}

interface CommitAuthor {
  login?: string;
  avatar_url?: string;
  html_url?: string;
}

interface Commit {
  sha: string;
  html_url: string;
  author: CommitAuthor | null;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

const REPO_OWNER = 'vendure-ecommerce';
const REPO_NAME = 'vendure';

// GitHub token for local dev (optional - higher rate limits)
// In production on Cloudflare, this will be undefined and use unauthenticated rates
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

// Core maintainers to filter out (focus on external contributors)
const MAINTAINERS = ['michaelbromley', 'dlhck', 'github-actions[bot]'];

// Store all contributor data globally for modal access
let allContributors: Contributor[] = [];

// Snowflake physics state
interface Snowflake {
  element: HTMLElement;
  x: number;
  y: number;
  baseX: number;
  vx: number;
  vy: number;
  baseVy: number;
  size: number;
}

let snowflakes: Snowflake[] = [];
let mouseX = 0;
let mouseY = 0;
let animationId: number | null = null;

// Create festive decorations
function createSnowflakes(): string {
  return `<div class="snowflakes" id="snowflakes-container"></div>`;
}

function initSnowflakes() {
  const container = document.getElementById('snowflakes-container');
  if (!container) return;
  
  // Clear existing snowflakes
  container.innerHTML = '';
  snowflakes = [];
  
  const flakeChars = ['❄', '❅', '❆', '✻', '✼', '❋'];
  
  for (let i = 0; i < 60; i++) {
    const span = document.createElement('span');
    span.className = 'snowflake';
    const char = flakeChars[Math.floor(Math.random() * flakeChars.length)];
    span.textContent = char;
    
    const size = 0.5 + Math.random() * 1.2;
    const x = Math.random() * window.innerWidth;
    // Distribute across viewport height initially
    const y = Math.random() * window.innerHeight;
    // Slow falling speed
    const baseVy = 0.2 + Math.random() * 0.4;
    
    span.style.fontSize = `${size}rem`;
    span.style.opacity = `${0.3 + Math.random() * 0.5}`;
    
    container.appendChild(span);
    
    snowflakes.push({
      element: span,
      x,
      y,
      baseX: x,
      vx: 0,
      vy: baseVy,
      baseVy,
      size
    });
  }
  
  // Start animation loop
  if (animationId) cancelAnimationFrame(animationId);
  animateSnowflakes();
  
  // Setup interaction listeners
  setupSnowflakeInteractions();
}

function setupSnowflakeInteractions() {
  // Mouse movement
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
}

function animateSnowflakes() {
  const mouseInfluenceRadius = 100;
  const mouseForce = 0.12;
  const friction = 0.98;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Gentle wind that oscillates left AND right
  const time = Date.now() / 8000;
  const windVariation = Math.sin(time) * 0.015;
  
  snowflakes.forEach(flake => {
    // Calculate distance from mouse (viewport coordinates)
    const dx = flake.x - mouseX;
    const dy = flake.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Mouse repulsion
    if (dist < mouseInfluenceRadius && dist > 0) {
      const force = (1 - dist / mouseInfluenceRadius) * mouseForce;
      flake.vx += (dx / dist) * force;
      flake.vy += (dy / dist) * force;
    }
    
    // Apply base falling speed (constant gentle fall)
    flake.vy += flake.baseVy * 0.05;
    
    // Apply wind
    flake.vx += windVariation;
    
    // Apply friction
    flake.vx *= friction;
    flake.vy *= friction;
    
    // Gently return to base X position to prevent permanent drift
    flake.vx += (flake.baseX - flake.x) * 0.0005;
    
    // Update position
    flake.x += flake.vx;
    flake.y += flake.vy;
    
    // Respawn at top when falling off bottom of viewport
    if (flake.y > viewportHeight + 20) {
      flake.y = -20;
      flake.x = Math.random() * viewportWidth;
      flake.baseX = flake.x;
      flake.vx = 0;
      flake.vy = flake.baseVy;
    }
    
    // Wrap horizontally
    if (flake.x < -20) {
      flake.x = viewportWidth + 20;
      flake.baseX = flake.x;
    }
    if (flake.x > viewportWidth + 20) {
      flake.x = -20;
      flake.baseX = flake.x;
    }
    
    // Update DOM
    flake.element.style.transform = `translate(${flake.x}px, ${flake.y}px)`;
  });
  
  animationId = requestAnimationFrame(animateSnowflakes);
}

function createLights(): string {
  return `
    <div class="lights">
      ${Array(12).fill('<span class="light"></span>').join('')}
    </div>
  `;
}

function renderLoading(): string {
  return `
    ${createSnowflakes()}
    ${createLights()}
    <div class="loading">
      <div class="loading-spinner"></div>
      <div class="loading-text">Gathering festive contributors...</div>
    </div>
  `;
}

function renderError(message: string): string {
  return `
    ${createSnowflakes()}
    ${createLights()}
    <div class="error">
      <h2>Oops! Something went wrong</h2>
      <p>${message}</p>
      <button class="retry-btn" onclick="location.reload()">Try Again</button>
    </div>
  `;
}

function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month];
}

function renderContributionTimeline(commits: ContributionDetail[]): string {
  // Group commits by month
  const monthlyData: { [key: string]: number } = {};
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize all months with 0
  allMonths.forEach(m => monthlyData[m] = 0);
  
  commits.forEach(commit => {
    const date = new Date(commit.date);
    const month = getMonthName(date.getMonth());
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });
  
  const maxCommits = Math.max(...Object.values(monthlyData), 1);
  
  // Only show months up to current month
  const currentMonth = new Date().getMonth();
  const relevantMonths = allMonths.slice(0, currentMonth + 1);
  
  const bars = relevantMonths.map(month => {
    const count = monthlyData[month];
    const height = (count / maxCommits) * 100;
    return `
      <div class="timeline-bar-container">
        <div class="timeline-bar" style="height: ${Math.max(height, 4)}%">
          ${count > 0 ? `<span class="bar-count">${count}</span>` : ''}
        </div>
        <span class="timeline-label">${month}</span>
      </div>
    `;
  }).join('');
  
  return `
    <div class="contribution-timeline">
      <h3>Contribution Timeline</h3>
      <div class="timeline-chart">
        ${bars}
      </div>
    </div>
  `;
}

function renderRecentCommits(commits: ContributionDetail[]): string {
  const recent = commits.slice(0, 5);
  
  const commitList = recent.map(commit => {
    const date = new Date(commit.date);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const message = commit.message.split('\n')[0].substring(0, 60);
    const displayMessage = message.length >= 60 ? message + '...' : message;
    
    return `
      <a href="${commit.url}" target="_blank" class="commit-item">
        <span class="commit-dot"></span>
        <div class="commit-content">
          <span class="commit-message">${displayMessage}</span>
          <span class="commit-date">${formattedDate}</span>
        </div>
      </a>
    `;
  }).join('');
  
  return `
    <div class="recent-commits">
      <h3>Recent Contributions</h3>
      <div class="commit-list">
        ${commitList}
      </div>
    </div>
  `;
}

function renderContributionStats(contributor: Contributor): string {
  const commits = contributor.commits;
  
  // Calculate some fun stats
  const firstCommit = commits.length > 0 ? new Date(commits[commits.length - 1].date) : null;
  const lastCommit = commits.length > 0 ? new Date(commits[0].date) : null;
  
  let activeDays = 0;
  if (firstCommit && lastCommit) {
    const uniqueDays = new Set(commits.map(c => new Date(c.date).toDateString()));
    activeDays = uniqueDays.size;
  }
  
  return `
    <div class="contribution-stats">
      <div class="stat-bubble">
        <span class="stat-value">${contributor.contributions}</span>
        <span class="stat-label">Commits</span>
      </div>
      <div class="stat-bubble">
        <span class="stat-value">${activeDays}</span>
        <span class="stat-label">Active Days</span>
      </div>
      <div class="stat-bubble">
        <span class="stat-value">${firstCommit ? getMonthName(firstCommit.getMonth()) : '-'}</span>
        <span class="stat-label">First Contrib</span>
      </div>
    </div>
  `;
}

function renderContributors(contributors: Contributor[]): string {
  const totalContributions = contributors.reduce((sum, c) => sum + c.contributions, 0);
  const maxContributions = Math.max(...contributors.map(c => c.contributions));
  
  const contributorCards = contributors.map((contributor) => {
    const barWidth = (contributor.contributions / maxContributions) * 100;
    
    return `
      <div class="contributor-card" 
           data-login="${contributor.login}">
        <div class="avatar-container">
          <div class="avatar-ring"></div>
          <img class="avatar" src="${contributor.avatar_url}" alt="${contributor.login}" loading="lazy" />
        </div>
        <div class="contributor-name" title="${contributor.login}">${contributor.login}</div>
        <div class="contribution-count">
          <span class="count">${contributor.contributions}</span> contributions
        </div>
        <div class="contribution-bar">
          <div class="contribution-bar-fill" style="width: ${barWidth}%"></div>
        </div>
      </div>
    `;
  }).join('');

  return `
    ${createSnowflakes()}
    ${createLights()}
    
    <header class="header">
      <div class="vendure-logo">
        <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 28" width="60" height="42">
          <path d="M10.746 12.685v9.263c0 .166.093.323.237.405l8.407 4.762c.302.17.671.17.973 0l8.407-4.762a.466.466 0 0 0 .237-.405v-9.263a.476.476 0 0 0-.714-.404l-7.93 4.49a.996.996 0 0 1-.973 0l-7.93-4.49a.476.476 0 0 0-.714.404Z" fill="#17C1BC"></path>
          <path d="M8.893.75.486 5.51A.948.948 0 0 0 0 6.333v9.522c0 .167.092.324.237.405l8.176 4.633a.476.476 0 0 0 .714-.405v-8.982c0-.34.185-.655.487-.824l7.93-4.491a.463.463 0 0 0 0-.81L9.366.75a.48.48 0 0 0-.477 0h.003ZM30.86.74l8.407 4.76c.301.17.486.487.486.825v9.522a.47.47 0 0 1-.237.405l-8.176 4.633a.476.476 0 0 1-.714-.405v-8.982a.945.945 0 0 0-.486-.824l-7.93-4.491a.463.463 0 0 1 0-.81L30.386.742a.48.48 0 0 1 .477 0h-.003Z" fill="#17C1BC"></path>
        </svg>
      </div>
      <h1>Vendure Contributors</h1>
      <p class="subtitle">Celebrating our amazing community!</p>
      <span class="year-badge">2025</span>
    </header>
    
    <div class="stats-banner">
      <div class="stat-card">
        <span class="number">${contributors.length}</span>
        <span class="label">Community Contributors</span>
      </div>
      <div class="stat-card">
        <span class="number">${totalContributions.toLocaleString()}</span>
        <span class="label">Total Contributions</span>
      </div>
      <div class="stat-card">
        <span class="number">${maxContributions}</span>
        <span class="label">Top Contributions</span>
      </div>
    </div>
    
    <div class="contributors-grid">
      ${contributorCards}
    </div>
    
    <div class="modal-overlay" id="modal">
      <div class="modal">
        <button class="modal-close-btn" id="modal-close">&times;</button>
        <div class="modal-header">
          <img class="modal-avatar" id="modal-avatar" src="" alt="" />
          <div class="modal-title">
            <h2 id="modal-name"></h2>
            <a id="modal-profile" href="" target="_blank" class="profile-link">View GitHub Profile →</a>
          </div>
        </div>
        <div id="modal-stats"></div>
        <div id="modal-timeline"></div>
        <div id="modal-commits"></div>
      </div>
    </div>
    
    <footer>
      <p>Data from <a href="https://github.com/${REPO_OWNER}/${REPO_NAME}" target="_blank">github.com/${REPO_OWNER}/${REPO_NAME}</a></p>
      <p>Click on a contributor to see their contribution details!</p>
    </footer>
  `;
}

function launchConfetti() {
  const colors = ['#17C1BC', '#5eead4', '#0d9488', '#2dd4bf', '#99f6e4'];
  
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors
  });
  
  // Fire from both sides
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    });
  }, 200);
}

function setupEventListeners() {
  const modal = document.getElementById('modal');
  const modalAvatar = document.getElementById('modal-avatar') as HTMLImageElement;
  const modalName = document.getElementById('modal-name');
  const modalProfile = document.getElementById('modal-profile') as HTMLAnchorElement;
  const modalStats = document.getElementById('modal-stats');
  const modalTimeline = document.getElementById('modal-timeline');
  const modalCommits = document.getElementById('modal-commits');
  const modalClose = document.getElementById('modal-close');
  
  // Card click handlers
  document.querySelectorAll('.contributor-card').forEach(card => {
    card.addEventListener('click', () => {
      const element = card as HTMLElement;
      const login = element.dataset.login!;
      
      const contributor = allContributors.find(c => c.login === login);
      if (!contributor) return;
      
      modalAvatar.src = contributor.avatar_url;
      modalName!.textContent = contributor.login;
      modalProfile.href = contributor.html_url;
      
      // Render the contribution visualizations
      modalStats!.innerHTML = renderContributionStats(contributor);
      modalTimeline!.innerHTML = renderContributionTimeline(contributor.commits);
      modalCommits!.innerHTML = renderRecentCommits(contributor.commits);
      
      modal!.classList.add('active');
      launchConfetti();
    });
  });
  
  // Modal close
  modalClose?.addEventListener('click', () => {
    modal!.classList.remove('active');
  });
  
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
  
  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal!.classList.remove('active');
    }
  });
}

async function fetchContributorsFrom2025(): Promise<Contributor[]> {
  const contributorMap = new Map<string, Contributor>();
  
  // We need to fetch commits from 2025 and count by author
  const since = '2025-01-01T00:00:00Z';
  const until = '2025-12-31T23:59:59Z';
  
  let page = 1;
  const perPage = 100;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?since=${since}&until=${until}&per_page=${perPage}&page=${page}`;
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Use token if available (local dev only)
    if (GITHUB_TOKEN && GITHUB_TOKEN !== 'your_token_here') {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const commits: Commit[] = await response.json();
    
    if (commits.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const commit of commits) {
      if (commit.author && commit.author.login) {
        const login = commit.author.login;
        
        const commitDetail: ContributionDetail = {
          sha: commit.sha,
          message: commit.commit.message,
          date: commit.commit.author.date,
          url: commit.html_url
        };
        
        const existing = contributorMap.get(login);
        if (existing) {
          existing.contributions++;
          existing.commits.push(commitDetail);
        } else {
          contributorMap.set(login, {
            login: login,
            avatar_url: commit.author.avatar_url || '',
            html_url: commit.author.html_url || '',
            contributions: 1,
            commits: [commitDetail]
          });
        }
      }
    }
    
    if (commits.length < perPage) {
      hasMore = false;
    } else {
      page++;
    }
    
    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Sort commits by date (newest first) for each contributor
  contributorMap.forEach(contributor => {
    contributor.commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });
  
  // Sort by contributions descending and filter out maintainers
  const contributors = Array.from(contributorMap.values())
    .filter(c => !MAINTAINERS.includes(c.login))
    .sort((a, b) => b.contributions - a.contributions);
  
  return contributors;
}

async function init() {
  const app = document.getElementById('app')!;
  
  // Show loading state
  app.innerHTML = renderLoading();
  initSnowflakes();
  
  try {
    allContributors = await fetchContributorsFrom2025();
    
    if (allContributors.length === 0) {
      app.innerHTML = renderError('No contributors found for 2025. The year might just be starting!');
      initSnowflakes();
      return;
    }
    
    app.innerHTML = renderContributors(allContributors);
    setupEventListeners();
    initSnowflakes();
    
    // Initial celebration confetti
    setTimeout(launchConfetti, 500);
    
  } catch (error) {
    console.error('Error fetching contributors:', error);
    app.innerHTML = renderError(error instanceof Error ? error.message : 'Failed to fetch contributors');
    initSnowflakes();
  }
}

// Start the app
init();
