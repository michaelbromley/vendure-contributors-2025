// Cloudflare Pages Function to proxy GitHub API requests
// This keeps the GitHub token server-side and secure

interface Env {
  GITHUB_TOKEN?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  
  // Build the GitHub API URL from the path segments
  const pathSegments = params.path as string[];
  const githubPath = pathSegments.join('/');
  const url = new URL(request.url);
  const githubUrl = `https://api.github.com/${githubPath}${url.search}`;
  
  // Build headers for GitHub API
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'gh-vis-cloudflare-worker',
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
    
    // Get the response body
    const body = await response.text();
    
    // Return with CORS headers
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // Cache for 5 mins
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch from GitHub API' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
