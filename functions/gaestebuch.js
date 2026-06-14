// Cloudflare Pages Function – Gästebuch KV API
// GET  /gaestebuch?friend=Lisa  → lädt Antworten
// POST /gaestebuch?friend=Lisa  → speichert Antworten

export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const friend = searchParams.get('friend');
  if (!friend) return new Response('{}', { status: 400 });

  const data = await context.env.GAESTEBUCH.get(friend);
  return new Response(data || '{}', {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export async function onRequestPost(context) {
  const { searchParams } = new URL(context.request.url);
  const friend = searchParams.get('friend');
  if (!friend) return new Response('error', { status: 400 });

  const body = await context.request.text();
  await context.env.GAESTEBUCH.put(friend, body);
  return new Response('ok', {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
