// Cloudflare Worker: r11-sonos
// Deploy unter: r11-sonos.cjung41.workers.dev
// Sonos Cloud Control API – OAuth + Proxy

const CLIENT_KEY    = '6792bd7e-dff8-47de-8508-88b3c4be4391';
const CLIENT_SECRET = '1f593a77-f064-4b4d-8fba-55b8e5642aa8';
const REDIRECT_URI  = 'https://r11.cjung41.workers.dev/';
const SONOS_API     = 'https://api.sonos.com/control/api/v1';
const SONOS_TOKEN   = 'https://api.sonos.com/login/v3/oauth/access';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request) {
    const url  = new URL(request.url);
    const path = url.pathname;

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── GET /sonos/auth-url → OAuth-URL generieren ──────────────────────────
    if (path === '/sonos/auth-url') {
      const state  = crypto.randomUUID();
      const params = new URLSearchParams({
        client_id:     CLIENT_KEY,
        response_type: 'code',
        redirect_uri:  REDIRECT_URI,
        scope:         'playback-control-all',
        state,
      });
      return new Response(JSON.stringify({
        url:   'https://api.sonos.com/login/v3/oauth?' + params.toString(),
        state,
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // ── POST /sonos/token → Code gegen Tokens tauschen ─────────────────────
    if (path === '/sonos/token' && request.method === 'POST') {
      const { code } = await request.json();
      const creds    = btoa(CLIENT_KEY + ':' + CLIENT_SECRET);
      const res = await fetch(SONOS_TOKEN, {
        method:  'POST',
        headers: {
          'Authorization': 'Basic ' + creds,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type:   'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
        }).toString(),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status:  res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── POST /sonos/refresh → Token erneuern ────────────────────────────────
    if (path === '/sonos/refresh' && request.method === 'POST') {
      const { refresh_token } = await request.json();
      const creds = btoa(CLIENT_KEY + ':' + CLIENT_SECRET);
      const res = await fetch(SONOS_TOKEN, {
        method:  'POST',
        headers: {
          'Authorization': 'Basic ' + creds,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token,
        }).toString(),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status:  res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── ANY /sonos/api/* → Sonos API Proxy ─────────────────────────────────
    if (path.startsWith('/sonos/api/')) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'No token' }), {
          status:  401,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }
      const apiPath = path.replace('/sonos/api/', '');
      const target  = SONOS_API + '/' + apiPath + url.search;
      const res = await fetch(target, {
        method:  request.method,
        headers: {
          'Authorization': authHeader,
          'Content-Type':  'application/json',
        },
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      });
      const body = await res.text();
      return new Response(body || '{}', {
        status:  res.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
};
