const CACHE_NAME = 'financas-v33';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './dist/all.min.css',
  './dist/app.min.js',
  './js/lib/supabase.min.js',
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http') || e.request.method !== 'GET') return;

  // ── Fontes Google: cache separado, stale-while-revalidate ──
  if (
    e.request.url.includes('fonts.googleapis.com') ||
    e.request.url.includes('fonts.gstatic.com')
  ) {
    e.respondWith(
      caches.open('financas-fonts').then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
          return cached || fetchPromise; // usa cache se tiver, senão busca
        })
      )
    );
    return;
  }

  // ── Demais assets: cache first ──
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});