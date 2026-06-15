// Cloudflare Pages Function: /hue-callback
// Hue OAuth redirectet hierher mit ?code=...&state=...
// Wir leiten den Code als URL-Fragment weiter → kein Server-Routing nötig
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (code) {
    const dest = `${url.origin}/#hue_code=${encodeURIComponent(code)}&hue_state=${encodeURIComponent(state || '')}`;
    return Response.redirect(dest, 302);
  }

  return Response.redirect(url.origin, 302);
}
