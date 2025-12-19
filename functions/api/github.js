// Cloudflare Pages Function to proxy GitHub API requests
// Routes: /api/github?path=repos/owner/repo/commits&since=...

export async function onRequest(context) {
  const { request, env } = context;
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
    'User-Agent': 'gh-vis-cloudflare-worker',
  };
  
  // Add auth token if available (set via CF dashboard)
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
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
