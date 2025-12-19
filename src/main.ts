import './styles.css';
import confetti from 'canvas-confetti';
import contributorsData from './data/contributors-2025.json';
import issueContributorsData from './data/issue-contributors-2025.json';

interface CommitDetail {
  sha: string;
  message: string;
  date: string;
  url: string;
}

interface IssueDetail {
  number: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
  labels: string[];
}

// Unified contributor with both commits and issues
interface CommunityMember {
  login: string;
  avatar_url: string;
  html_url: string;
  commits: CommitDetail[];
  issues: IssueDetail[];
  commitCount: number;
  issueCount: number;
  score: number; // Weighted score for ranking
}

// Raw data interfaces for JSON imports
interface RawCommitContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  commits: CommitDetail[];
}

interface RawIssueContributor {
  login: string;
  avatar_url: string;
  count: number;
  issues: IssueDetail[];
}

// Weighting: commits are worth more than issues
const COMMIT_WEIGHT = 3;
const ISSUE_WEIGHT = 1;

// Store merged contributor data globally
let allMembers: CommunityMember[] = [];

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

function getMonthName(month: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month];
}

// Parse commit type from conventional commit message
function getCommitType(message: string): string {
  const match = message.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.*?\))?:/i);
  if (match) {
    return match[1].toLowerCase();
  }
  // Check for common patterns without colon
  if (message.toLowerCase().startsWith('fix')) return 'fix';
  if (message.toLowerCase().startsWith('add')) return 'feat';
  if (message.toLowerCase().startsWith('update')) return 'chore';
  return 'other';
}

// Render GitHub-style activity heatmap
function renderActivityHeatmap(): string {
  const commits = getAllCommits();
  const commitsByDate: { [key: string]: number } = {};
  
  // Count commits per day
  commits.forEach(commit => {
    const date = new Date(commit.date).toISOString().split('T')[0];
    commitsByDate[date] = (commitsByDate[date] || 0) + 1;
  });
  
  // Generate calendar for 2025 (up to current date)
  const startDate = new Date('2025-01-01');
  const endDate = new Date();
  const weeks: string[][] = [];
  let currentWeek: string[] = [];
  
  // Pad first week with empty cells
  const firstDayOfWeek = startDate.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push('');
  }
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    currentWeek.push(dateStr);
    
    if (current.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    current.setDate(current.getDate() + 1);
  }
  
  // Push remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  
  const maxCommits = Math.max(...Object.values(commitsByDate), 1);
  
  const cells = weeks.map(week => {
    const weekCells = week.map(date => {
      if (!date) return '<div class="heatmap-cell empty"></div>';
      const count = commitsByDate[date] || 0;
      const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxCommits) * 4));
      const tooltip = `${date}: ${count} commit${count !== 1 ? 's' : ''}`;
      return `<div class="heatmap-cell level-${level}" title="${tooltip}"></div>`;
    }).join('');
    return `<div class="heatmap-week">${weekCells}</div>`;
  }).join('');
  
  // Month labels
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    .slice(0, new Date().getMonth() + 1)
    .map(m => `<span>${m}</span>`)
    .join('');
  
  return `
    <div class="viz-card">
      <h3>Activity Heatmap</h3>
      <div class="heatmap-container">
        <div class="heatmap-months">${monthLabels}</div>
        <div class="heatmap">${cells}</div>
        <div class="heatmap-legend">
          <span>Less</span>
          <div class="heatmap-cell level-0"></div>
          <div class="heatmap-cell level-1"></div>
          <div class="heatmap-cell level-2"></div>
          <div class="heatmap-cell level-3"></div>
          <div class="heatmap-cell level-4"></div>
          <span>More</span>
        </div>
      </div>
    </div>
  `;
}

// Render contribution types donut chart
function renderContributionTypes(): string {
  const commits = getAllCommits();
  const types: { [key: string]: number } = {};
  
  commits.forEach(commit => {
    const type = getCommitType(commit.message);
    types[type] = (types[type] || 0) + 1;
  });
  
  const total = commits.length;
  const typeColors: { [key: string]: string } = {
    feat: '#17C1BC',
    fix: '#f87171',
    docs: '#a78bfa',
    refactor: '#fbbf24',
    chore: '#64748b',
    test: '#34d399',
    style: '#f472b6',
    perf: '#fb923c',
    ci: '#60a5fa',
    build: '#94a3b8',
    revert: '#ef4444',
    other: '#475569'
  };
  
  // Sort by count
  const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);
  
  // Create SVG donut chart
  let currentAngle = 0;
  const radius = 60;
  const innerRadius = 35;
  const cx = 80;
  const cy = 80;
  
  const paths = sortedTypes.map(([type, count]) => {
    const percentage = count / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const x3 = cx + innerRadius * Math.cos(endRad);
    const y3 = cy + innerRadius * Math.sin(endRad);
    const x4 = cx + innerRadius * Math.cos(startRad);
    const y4 = cy + innerRadius * Math.sin(startRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    const color = typeColors[type] || '#475569';
    
    return `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${color}" class="donut-segment" data-type="${type}" data-count="${count}"><title>${type}: ${count} (${(percentage * 100).toFixed(1)}%)</title></path>`;
  }).join('');
  
  const legend = sortedTypes.slice(0, 6).map(([type, count]) => {
    const color = typeColors[type] || '#475569';
    const percentage = ((count / total) * 100).toFixed(0);
    return `<div class="legend-item"><span class="legend-color" style="background: ${color}"></span><span class="legend-label">${type}</span><span class="legend-value">${percentage}%</span></div>`;
  }).join('');
  
  return `
    <div class="viz-card">
      <h3>Contribution Types</h3>
      <div class="donut-container">
        <svg viewBox="0 0 160 160" class="donut-chart">
          ${paths}
          <text x="${cx}" y="${cy}" text-anchor="middle" dy="0.3em" class="donut-center-text">${total}</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-center-label">commits</text>
        </svg>
        <div class="donut-legend">${legend}</div>
      </div>
    </div>
  `;
}

// Render monthly trend line chart
function renderMonthlyTrend(): string {
  const commits = getAllCommits();
  const monthlyData: { [key: string]: number } = {};
  
  // Initialize all months up to current
  const currentMonth = new Date().getMonth();
  for (let i = 0; i <= currentMonth; i++) {
    monthlyData[getMonthName(i)] = 0;
  }
  
  // Count commits per month
  commits.forEach(commit => {
    const month = getMonthName(new Date(commit.date).getMonth());
    if (monthlyData[month] !== undefined) {
      monthlyData[month]++;
    }
  });
  
  const months = Object.keys(monthlyData);
  const values = Object.values(monthlyData);
  const maxValue = Math.max(...values, 1);
  
  // SVG dimensions
  const width = 400;
  const height = 150;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate points
  const points = values.map((val, i) => {
    const x = padding.left + (i / (months.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - (val / maxValue) * chartHeight;
    return { x, y, val };
  });
  
  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  // Create area path
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || padding.left} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;
  
  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const y = padding.top + chartHeight * (1 - pct);
    const val = Math.round(maxValue * pct);
    return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="grid-line"/><text x="${padding.left - 5}" y="${y}" class="axis-label" text-anchor="end" dy="0.3em">${val}</text>`;
  }).join('');
  
  // X axis labels
  const xLabels = months.map((month, i) => {
    const x = padding.left + (i / (months.length - 1 || 1)) * chartWidth;
    return `<text x="${x}" y="${height - 8}" class="axis-label" text-anchor="middle">${month}</text>`;
  }).join('');
  
  // Data points
  const dataPoints = points.map(p => 
    `<circle cx="${p.x}" cy="${p.y}" r="4" class="data-point"><title>${p.val} commits</title></circle>`
  ).join('');
  
  return `
    <div class="viz-card viz-card-wide">
      <h3>Monthly Activity Trend</h3>
      <svg viewBox="0 0 ${width} ${height}" class="line-chart">
        ${gridLines}
        <path d="${areaPath}" class="chart-area"/>
        <path d="${linePath}" class="chart-line"/>
        ${dataPoints}
        ${xLabels}
      </svg>
    </div>
  `;
}

// =====================================================
// DATA LOADING & MERGING
// =====================================================

function loadAndMergeData(): CommunityMember[] {
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
  return Array.from(memberMap.values()).sort((a, b) => b.score - a.score);
}

function getAllCommits(): CommitDetail[] {
  return allMembers.flatMap(m => m.commits);
}

function renderContributionTimeline(commits: CommitDetail[]): string {
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

function renderMemberStats(member: CommunityMember): string {
  const commits = member.commits;
  const issues = member.issues;
  
  // Calculate active days from commits
  let activeDays = 0;
  if (commits.length > 0) {
    const uniqueDays = new Set(commits.map(c => new Date(c.date).toDateString()));
    activeDays = uniqueDays.size;
  }
  
  // Calculate closed issues count
  const closedIssues = issues.filter(i => i.state === 'closed').length;
  
  const stats: string[] = [];
  
  if (member.commitCount > 0) {
    stats.push(`
      <div class="stat-bubble">
        <span class="stat-value">${member.commitCount}</span>
        <span class="stat-label">Commits</span>
      </div>
    `);
    stats.push(`
      <div class="stat-bubble">
        <span class="stat-value">${activeDays}</span>
        <span class="stat-label">Active Days</span>
      </div>
    `);
  }
  
  if (member.issueCount > 0) {
    stats.push(`
      <div class="stat-bubble">
        <span class="stat-value">${member.issueCount}</span>
        <span class="stat-label">Issues</span>
      </div>
    `);
    if (closedIssues > 0) {
      stats.push(`
        <div class="stat-bubble">
          <span class="stat-value">${closedIssues}</span>
          <span class="stat-label">Resolved</span>
        </div>
      `);
    }
  }
  
  return `<div class="contribution-stats">${stats.join('')}</div>`;
}

function renderMemberActivity(member: CommunityMember): string {
  const sections: string[] = [];
  
  // Recent commits
  if (member.commits.length > 0) {
    const recentCommits = member.commits.slice(0, 5);
    const commitList = recentCommits.map(commit => {
      const date = new Date(commit.date);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const message = commit.message.split('\n')[0].substring(0, 60);
      return `
        <div class="commit-item">
          <span class="commit-bullet"></span>
          <div class="commit-content">
            <a href="${commit.url}" target="_blank" class="commit-message">${message}${commit.message.length > 60 ? '...' : ''}</a>
            <span class="commit-date">${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');
    
    sections.push(`
      <div class="activity-section">
        <h4>Recent Commits</h4>
        <div class="commit-list">${commitList}</div>
      </div>
    `);
  }
  
  // Recent issues
  if (member.issues.length > 0) {
    const recentIssues = member.issues.slice(0, 5);
    const issueList = recentIssues.map(issue => {
      const date = new Date(issue.created_at);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const stateClass = issue.state === 'open' ? 'issue-open' : 'issue-closed';
      return `
        <div class="issue-item">
          <span class="issue-state ${stateClass}">${issue.state}</span>
          <div class="issue-content">
            <a href="${issue.html_url}" target="_blank" class="issue-title">${issue.title.substring(0, 50)}${issue.title.length > 50 ? '...' : ''}</a>
            <span class="issue-date">#${issue.number} · ${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');
    
    sections.push(`
      <div class="activity-section">
        <h4>Recent Issues</h4>
        <div class="issue-list">${issueList}</div>
      </div>
    `);
  }
  
  return sections.join('');
}

function renderPage(): string {
  const totalCommits = allMembers.reduce((sum, m) => sum + m.commitCount, 0);
  const totalIssues = allMembers.reduce((sum, m) => sum + m.issueCount, 0);
  
  // Cap bars at 20 for full width (so smaller contributors don't look empty)
  const BAR_CAP = 20;
  
  const memberCards = allMembers.map((member) => {
    // Calculate bar widths capped at BAR_CAP
    const commitBarWidth = Math.min((member.commitCount / BAR_CAP) * 100, 100);
    const issueBarWidth = Math.min((member.issueCount / BAR_CAP) * 100, 100);
    
    return `
      <div class="contributor-card" 
           data-login="${member.login}">
        <div class="avatar-container">
          <div class="avatar-ring"></div>
          <img class="avatar" src="${member.avatar_url}" alt="${member.login}" loading="lazy" />
        </div>
        <div class="contributor-name" title="${member.login}">${member.login}</div>
        <div class="member-bars">
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
      <h1>Vendure Community 2025</h1>
      <p class="subtitle">Celebrating our amazing open source community!</p>
      <span class="year-badge">2025</span>
    </header>
    
    <div class="stats-banner">
      <div class="stat-card">
        <span class="number">${allMembers.length}</span>
        <span class="label">Contributors</span>
      </div>
      <div class="stat-card">
        <span class="number">${totalCommits.toLocaleString()}</span>
        <span class="label">Commits</span>
      </div>
      <div class="stat-card">
        <span class="number">${totalIssues}</span>
        <span class="label">Issues Opened</span>
      </div>
    </div>
    
    <section class="visualizations">
      <h2>Community Activity</h2>
      <div class="viz-grid">
        ${renderActivityHeatmap()}
        ${renderContributionTypes()}
        ${renderMonthlyTrend()}
      </div>
    </section>
    
    <section class="contributors-section">
      <h2>Community Leaderboard</h2>
      <p class="section-subtitle">Ranked by contributions (commits weighted 3x, issues 1x)</p>
      
      <div class="filter-bar">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
          <input type="text" id="search-input" placeholder="Search contributors..." />
        </div>
        <div class="filter-buttons">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="commits">Has Commits</button>
          <button class="filter-btn" data-filter="issues">Has Issues</button>
        </div>
        <div class="filter-count">
          <span id="visible-count">${allMembers.length}</span> of ${allMembers.length} contributors
        </div>
      </div>
      
      <div class="contributors-grid" id="contributors-grid">
        ${memberCards}
      </div>
    </section>
    
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
      <p>Data from <a href="https://github.com/vendure-ecommerce/vendure" target="_blank">github.com/vendure-ecommerce/vendure</a></p>
      <p>Click on a contributor to see their details!</p>
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

function setupFilterListeners() {
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const filterButtons = document.querySelectorAll('.filter-btn');
  const visibleCount = document.getElementById('visible-count');
  
  let currentFilter = 'all';
  let currentSearch = '';
  
  function applyFilters() {
    const cards = document.querySelectorAll('.contributor-card') as NodeListOf<HTMLElement>;
    let visibleCards = 0;
    
    cards.forEach(card => {
      const login = card.dataset.login!.toLowerCase();
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
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = (btn as HTMLElement).dataset.filter || 'all';
      applyFilters();
    });
  });
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
  
  // Setup filter functionality
  setupFilterListeners();
  
  // Card click handlers
  document.querySelectorAll('.contributor-card').forEach(card => {
    card.addEventListener('click', () => {
      const element = card as HTMLElement;
      const login = element.dataset.login!;
      
      const member = allMembers.find(m => m.login === login);
      if (!member) return;
      
      modalAvatar.src = member.avatar_url;
      modalName!.textContent = member.login;
      modalProfile.href = member.html_url;
      
      // Render the contribution visualizations
      modalStats!.innerHTML = renderMemberStats(member);
      modalTimeline!.innerHTML = member.commitCount > 0 ? renderContributionTimeline(member.commits) : '';
      modalCommits!.innerHTML = renderMemberActivity(member);
      
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

function init() {
  const app = document.getElementById('app')!;
  
  // Load and merge commit + issue data
  allMembers = loadAndMergeData();
  
  app.innerHTML = renderPage();
  setupEventListeners();
  initSnowflakes();
  
  // Initial celebration confetti
  setTimeout(launchConfetti, 500);
}

// Start the app
init();
