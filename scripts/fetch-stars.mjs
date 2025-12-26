#!/usr/bin/env node

/**
 * Fetch GitHub star history for vendure-ecommerce/vendure
 *
 * Uses the stargazers API with timestamps to get exact starred_at dates.
 * Supports incremental updates - only fetches new stars since last run.
 *
 * Usage:
 *   GITHUB_TOKEN=your_token npm run fetch:stars
 *
 * Or if you have gh CLI installed:
 *   GITHUB_TOKEN=$(gh auth token) npm run fetch:stars
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OWNER = 'vendure-ecommerce';
const REPO = 'vendure';
const PER_PAGE = 100;

// File paths
const RAW_DATA_FILE = path.join(__dirname, '../src/data/stars-raw.json');
const AGGREGATED_FILE = path.join(__dirname, '../src/data/stars-2025.json');

// Get GitHub token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  GITHUB_TOKEN=your_token node scripts/fetch-stars.js');
  console.error('');
  console.error('Or with gh CLI:');
  console.error('  GITHUB_TOKEN=$(gh auth token) node scripts/fetch-stars.js');
  process.exit(1);
}

// Rate limit tracking
let remainingRequests = 1000;
let resetTime = null;

async function fetchStargazersPage(page) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/stargazers?per_page=${PER_PAGE}&page=${page}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.star+json', // This gives us starred_at timestamps
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  // Update rate limit info
  remainingRequests = parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10);
  resetTime = new Date(parseInt(response.headers.get('x-ratelimit-reset') || '0', 10) * 1000);

  if (!response.ok) {
    if (response.status === 403 && remainingRequests === 0) {
      console.error(`Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
      process.exit(1);
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

async function fetchAllStargazers(existingStars = []) {
  const existingLogins = new Set(existingStars.map(s => s.login));
  const lastStarredAt = existingStars.length > 0
    ? new Date(existingStars[existingStars.length - 1].starred_at)
    : null;

  console.log(`Found ${existingStars.length} existing stars in cache`);
  if (lastStarredAt) {
    console.log(`Last star: ${lastStarredAt.toISOString()}`);
  }

  // Strategy: Start from page 1 and work forward until we find stars we already have
  // OR if this is a fresh fetch, get everything

  let allNewStars = [];
  let page = 1;
  let foundExisting = false;
  let totalFetched = 0;

  // First, we need to know total star count to calculate starting page
  // The API doesn't tell us total directly, but we can check the repo
  const repoResponse = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
    },
  });
  const repoData = await repoResponse.json();
  const totalStars = repoData.stargazers_count;
  console.log(`Total stars on repo: ${totalStars}`);

  // If we have existing data, start from where we left off
  // Stargazers are returned in chronological order (oldest first)
  if (existingStars.length > 0) {
    // Calculate which page to start from
    page = Math.floor(existingStars.length / PER_PAGE) + 1;
    console.log(`Starting from page ${page} (after ${existingStars.length} cached stars)`);
  }

  console.log(`\nFetching stargazers... (${remainingRequests} API requests remaining)`);

  while (true) {
    process.stdout.write(`  Page ${page}... `);

    const stargazers = await fetchStargazersPage(page);

    if (stargazers.length === 0) {
      console.log('no more results');
      break;
    }

    // Filter out stars we already have
    const newStars = stargazers
      .map(s => ({
        login: s.user.login,
        starred_at: s.starred_at,
      }))
      .filter(s => !existingLogins.has(s.login));

    allNewStars.push(...newStars);
    totalFetched += stargazers.length;

    console.log(`got ${stargazers.length} (${newStars.length} new), ${remainingRequests} requests left`);

    // If we got fewer than PER_PAGE, we've reached the end
    if (stargazers.length < PER_PAGE) {
      break;
    }

    page++;

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nFetched ${totalFetched} total, ${allNewStars.length} new stars`);

  return allNewStars;
}

function aggregateStars(stars) {
  // Sort by date
  const sorted = [...stars].sort((a, b) =>
    new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime()
  );

  // Daily aggregation
  const daily = {};
  sorted.forEach(star => {
    const date = star.starred_at.split('T')[0]; // YYYY-MM-DD
    if (!daily[date]) {
      daily[date] = { date, count: 0 };
    }
    daily[date].count++;
  });

  // Convert to array and add running total
  const dailyArray = Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
  let runningTotal = 0;

  // Find the first star to get baseline (stars before our data)
  const firstStarDate = sorted[0]?.starred_at;

  dailyArray.forEach(day => {
    runningTotal += day.count;
    day.total = runningTotal;
  });

  // Monthly aggregation for 2025
  const monthly2025 = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize all months
  monthNames.forEach(month => {
    monthly2025[month] = { month, gained: 0, total: 0 };
  });

  // Count stars per month in 2025
  sorted.forEach(star => {
    const date = new Date(star.starred_at);
    if (date.getFullYear() === 2025) {
      const month = monthNames[date.getMonth()];
      monthly2025[month].gained++;
    }
  });

  // Calculate totals - we need to know how many stars existed before 2025
  const starsBeforeYear = sorted.filter(s => new Date(s.starred_at).getFullYear() < 2025).length;
  let yearRunningTotal = starsBeforeYear;

  monthNames.forEach(month => {
    yearRunningTotal += monthly2025[month].gained;
    monthly2025[month].total = yearRunningTotal;
  });

  // Also get 2024 data for context
  const monthly2024 = {};
  monthNames.forEach(month => {
    monthly2024[month] = { month, gained: 0, total: 0 };
  });

  sorted.forEach(star => {
    const date = new Date(star.starred_at);
    if (date.getFullYear() === 2024) {
      const month = monthNames[date.getMonth()];
      monthly2024[month].gained++;
    }
  });

  const starsBefore2024 = sorted.filter(s => new Date(s.starred_at).getFullYear() < 2024).length;
  let year2024RunningTotal = starsBefore2024;
  monthNames.forEach(month => {
    year2024RunningTotal += monthly2024[month].gained;
    monthly2024[month].total = year2024RunningTotal;
  });

  return {
    repoName: `${OWNER}/${REPO}`,
    fetchedAt: new Date().toISOString(),
    totalStarsInData: sorted.length,
    firstStar: sorted[0]?.starred_at || null,
    latestStar: sorted[sorted.length - 1]?.starred_at || null,
    starsAtStartOf2025: starsBeforeYear,
    starsAtStartOf2024: starsBefore2024,
    monthly2025: monthNames.map(m => monthly2025[m]),
    monthly2024: monthNames.map(m => monthly2024[m]),
    // Include daily data for 2025 for granular visualization
    daily2025: dailyArray.filter(d => d.date.startsWith('2025')),
    daily2024: dailyArray.filter(d => d.date.startsWith('2024')),
  };
}

async function main() {
  console.log('GitHub Stars Fetcher for vendure-ecommerce/vendure\n');
  console.log('='.repeat(50));

  // Load existing data if available
  let existingStars = [];
  if (fs.existsSync(RAW_DATA_FILE)) {
    try {
      const rawData = JSON.parse(fs.readFileSync(RAW_DATA_FILE, 'utf-8'));
      existingStars = rawData.stars || [];
      console.log(`Loaded ${existingStars.length} stars from cache`);
    } catch (e) {
      console.log('Could not parse existing data, starting fresh');
    }
  } else {
    console.log('No existing data found, fetching all stars');
  }

  // Fetch new stars
  const newStars = await fetchAllStargazers(existingStars);

  // Merge and dedupe
  const allStars = [...existingStars, ...newStars];
  const uniqueStars = Array.from(
    new Map(allStars.map(s => [s.login, s])).values()
  ).sort((a, b) => new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime());

  console.log(`\nTotal unique stars: ${uniqueStars.length}`);

  // Save raw data for future incremental updates
  console.log(`\nSaving raw data to ${RAW_DATA_FILE}`);
  fs.writeFileSync(RAW_DATA_FILE, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    stars: uniqueStars,
  }, null, 2));

  // Generate aggregated data for visualization
  console.log(`Generating aggregated data...`);
  const aggregated = aggregateStars(uniqueStars);

  console.log(`Saving aggregated data to ${AGGREGATED_FILE}`);
  fs.writeFileSync(AGGREGATED_FILE, JSON.stringify(aggregated, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  Total stars in data: ${aggregated.totalStarsInData}`);
  console.log(`  First star: ${aggregated.firstStar}`);
  console.log(`  Latest star: ${aggregated.latestStar}`);
  console.log(`  Stars at start of 2024: ${aggregated.starsAtStartOf2024}`);
  console.log(`  Stars at start of 2025: ${aggregated.starsAtStartOf2025}`);

  const gained2025 = aggregated.monthly2025.reduce((sum, m) => sum + m.gained, 0);
  const gained2024 = aggregated.monthly2024.reduce((sum, m) => sum + m.gained, 0);
  console.log(`  Stars gained in 2024: ${gained2024}`);
  console.log(`  Stars gained in 2025 so far: ${gained2025}`);

  console.log('\n2025 Monthly breakdown:');
  aggregated.monthly2025.forEach(m => {
    if (m.gained > 0 || m.total > 0) {
      console.log(`  ${m.month}: +${m.gained} (total: ${m.total})`);
    }
  });

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
