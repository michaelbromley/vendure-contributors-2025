import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Please set GITHUB_TOKEN environment variable');
  process.exit(1);
}

async function fetchUserProfile(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'gh-vis-app'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${username}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${username}:`, error);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Load existing contributor data
  const contributorsPath = path.join(__dirname, 'src/data/contributors-2025.json');
  const issuesPath = path.join(__dirname, 'src/data/issue-contributors-2025.json');

  const contributors = JSON.parse(fs.readFileSync(contributorsPath, 'utf-8'));
  const issueContributors = JSON.parse(fs.readFileSync(issuesPath, 'utf-8'));

  // Build a map of all unique usernames with their commit/issue counts
  const userMap = new Map();

  for (const c of contributors) {
    userMap.set(c.login, {
      commitCount: c.commits?.length || c.contributions || 0,
      issueCount: 0,
      avatar_url: c.avatar_url,
      html_url: c.html_url
    });
  }

  for (const ic of issueContributors) {
    const existing = userMap.get(ic.login);
    if (existing) {
      existing.issueCount = ic.issues.length;
    } else {
      userMap.set(ic.login, {
        commitCount: 0,
        issueCount: ic.issues.length,
        avatar_url: ic.avatar_url,
        html_url: ic.html_url
      });
    }
  }

  const usernames = Array.from(userMap.keys());
  console.log(`Fetching profiles for ${usernames.length} users...`);

  const locationData = [];
  let withLocation = 0;
  let withoutLocation = 0;

  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i];
    const userData = userMap.get(username);
    
    console.log(`[${i + 1}/${usernames.length}] Fetching ${username}...`);
    
    const profile = await fetchUserProfile(username);
    
    if (profile) {
      locationData.push({
        login: profile.login,
        name: profile.name,
        location: profile.location,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        commitCount: userData.commitCount,
        issueCount: userData.issueCount
      });

      if (profile.location) {
        withLocation++;
        console.log(`  -> Location: ${profile.location}`);
      } else {
        withoutLocation++;
        console.log(`  -> No location set`);
      }
    } else {
      // Still add them but without location
      locationData.push({
        login: username,
        name: null,
        location: null,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url,
        commitCount: userData.commitCount,
        issueCount: userData.issueCount
      });
      withoutLocation++;
    }

    // Rate limiting - be nice to GitHub API
    // 193 users at 100ms each = ~20 seconds total
    await sleep(100);
  }

  // Save the data
  const outputPath = path.join(__dirname, 'src/data/contributor-locations.json');
  fs.writeFileSync(outputPath, JSON.stringify(locationData, null, 2));

  console.log('\n=== Summary ===');
  console.log(`Total users: ${usernames.length}`);
  console.log(`With location: ${withLocation} (${((withLocation / usernames.length) * 100).toFixed(1)}%)`);
  console.log(`Without location: ${withoutLocation}`);
  console.log(`\nData saved to ${outputPath}`);

  // Show location breakdown
  const locations = locationData.filter(d => d.location).map(d => d.location);
  console.log('\n=== Locations Found ===');
  locations.forEach(loc => console.log(`  - ${loc}`));
}

main().catch(console.error);
