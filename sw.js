const CACHE_NAME = 'financas-v01';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/auth.css',
  './css/layout.css',
  './css/components.css',
  './css/tables.css',
  './css/modals.css',
  './css/reports.css',
  './css/ai.css',
  './css/responsive.css',
  './js/lib/supabase.min.js',
  './js/supabase-config.js',
  './js/utils.js',
  './js/state.js',
  './js/filter.js',
  './js/theme.js',
  './js/dbs/db-months.js',
  './js/dbs/db-banks.js',
  './js/dbs/db-entries.js',
  './js/dbs/db-pix.js',
  './js/dbs/db-recurrents.js',
  './js/dbs/db-incomes.js',
  './js/dbs/db-subscriptions.js',
  './js/dbs/db-installments.js',
  './js/dbs/db.js',
  './js/auth.js',
  './js/months.js',
  './js/banks.js',
  './js/entries.js',
  './js/installments.js',
  './js/pix.js',
  './js/recurrents.js',
  './js/income.js',
  './js/subscriptions.js',
  './js/dashboard.js',
  './js/cobranca.js',
  './js/reports.js',
  './js/history.js',
  './js/backup.js',
  './js/ai-engine.js',
  './js/modals.js',
  './js/main.js'
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