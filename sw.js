// ── Rübezahlweg 11 – Service Worker ──
const CACHE = 'r11-v3';
const BASE = self.registration.scope;

// Nur statische Assets cachen (keine HTML-Seiten!)
const ASSETS = [
  BASE + 'manifest.json',
  BASE + 'apple-touch-icon.png',
  BASE + 'icon192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Navigation (HTML-Seiten) → IMMER live holen, nie cachen.
  // Wichtig damit Cloudflare Access Redirects funktionieren.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request));
    return;
  }

  // Externe APIs (Wetter etc.) → nur live
  if (url.hostname !== self.location.hostname) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // Statische Assets (Icons, Manifest) → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
