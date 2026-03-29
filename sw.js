// ══════════════════════════════════════════════════
// SW.JS — Service Worker (PWA + Cache Offline)
// ══════════════════════════════════════════════════

const CACHE_NAME = 'financas-v2';
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
  './js/supabase-config.js',
  './js/utils.js',
  './js/state.js',
  './js/theme.js',
  './js/db.js',
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
  './js/reports.js',
  './js/backup.js',
  './js/ai-engine.js',
  './js/main.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;600;700&display=swap'
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
  // Ignora extensões do Chrome e não-GET
  if (!e.request.url.startsWith('http') || e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});