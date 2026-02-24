/**
 * Proxy to Supabase to avoid CORS when running the app in the browser.
 */

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const PREFIX = '/supabase-proxy';

function getSubPath(request: Request): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  if (!pathname.startsWith(PREFIX + '/') && pathname !== PREFIX) return '';
  const sub = pathname.slice(PREFIX.length) || '/';
  return sub.startsWith('/') ? sub.slice(1) : sub;
}

async function proxyToSupabase(request: Request): Promise<Response> {
  const subPath = getSubPath(request);
  const targetUrl = `${SUPABASE_URL}/${subPath}${new URL(request.url).search}`;
  
  // Forward request headers (excluding browser-specific ones)
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'origin' || lower === 'referer' || lower === 'connection') return;
    headers.set(key, value);
  });
  
  // Get request body if present
  let body: ArrayBuffer | undefined = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    body = await request.arrayBuffer();
  }
  
  // Forward request to Supabase
  const res = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  // Forward response headers first (must include Content-Type for JSON decoding)
  const resHeaders = new Headers();
  const skipHeaders = ['access-control-allow-origin', 'access-control-allow-credentials', 'content-encoding'];
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!skipHeaders.includes(lower)) {
      resHeaders.set(key, value);
    }
  });

  // Add CORS headers
  const origin = request.headers.get('origin');
  resHeaders.set('Access-Control-Allow-Origin', origin ?? '*');
  resHeaders.set('Access-Control-Allow-Credentials', 'true');
  resHeaders.set('Access-Control-Expose-Headers', '*');

  // Get response body - handle empty body (e.g. 204) so client .json() doesn't fail
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  const hasNoBody = res.status === 204 || res.headers.get('content-length') === '0';

  let responseBody: ArrayBuffer | string;
  if (hasNoBody) {
    // Return empty JSON so Supabase client's response.json() succeeds
    responseBody = '{}';
    resHeaders.set('Content-Type', 'application/json');
  } else {
    const buffer = await res.arrayBuffer();
    responseBody = buffer.byteLength > 0 ? buffer : '{}';
    if (buffer.byteLength === 0 && contentType.includes('application/json')) {
      resHeaders.set('Content-Type', 'application/json');
    }
  }

  return new Response(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}

export async function GET(request: Request) { return proxyToSupabase(request); }
export async function POST(request: Request) { return proxyToSupabase(request); }
export async function PUT(request: Request) { return proxyToSupabase(request); }
export async function PATCH(request: Request) { return proxyToSupabase(request); }
export async function DELETE(request: Request) { return proxyToSupabase(request); }
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Max-Age': '86400',
    },
  });
}