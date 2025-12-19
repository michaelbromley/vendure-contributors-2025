// Cloudflare Worker to serve static assets and proxy GitHub API requests

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle GitHub API proxy requests
    if (url.pathname === '/api/github') {
      return handleGitHubProxy(request, env);
    }
    
    // Everything else is handled by static assets (configured in wrangler.jsonc)
    return env.ASSETS.fetch(request);
  }
};

async function handleGitHubProxy(request, env) {
  const url = new URL(request.url);
  
  // Get the GitHub API path from query param
  const githubPath = url.searchParams.get('path');
  if (!githubPath) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Remove 'path' from search params and pass the rest to GitHub
  url.searchParams.delete('path');
  const githubUrl = `https://api.github.com/${githubPath}${url.search}`;
  
  // Build headers for GitHub API
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'vendure-2025-contributors',
  };
  
  // Add auth token if available (set via wrangler secret)
  if (env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${env.GITHUB_TOKEN}`;
  }
  
  try {
    const response = await fetch(githubUrl, {
      method: request.method,
      headers,
    });
    
    const body = await response.text();
    
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch from GitHub API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
