const CACHE_VERSION = 'prawko-v3';
const APP_SHELL_CACHE = CACHE_VERSION + '-shell';
const DATA_CACHE = CACHE_VERSION + '-data';
const MEDIA_CACHE = CACHE_VERSION + '-media';
const MEDIA_CACHE_LIMIT = 500;

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/data.js',
  './js/exam.js',
  './js/learn.js',
  './js/ui.js',
  './js/timer.js',
  './js/stats.js',
  './js/i18n.js',
  './js/offline.js',
  './data/meta.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCaches = [APP_SHELL_CACHE, DATA_CACHE, MEDIA_CACHE];
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith('prawko-') && !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Category JSON & translation files — stale-while-revalidate
  if (url.pathname.match(/\/data\/(?!meta\.json).+\.json$/)) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetched = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Media files (external B2 or local) — cache-first, cached on demand, LRU eviction
  if (url.hostname.includes('backblazeb2.com') || url.pathname.match(/\/media\//)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok || response.type === 'opaque') {
              cache.put(event.request, response.clone()).then(() =>
                cache.keys().then((keys) => {
                  if (keys.length > MEDIA_CACHE_LIMIT) {
                    const toDelete = keys.slice(0, keys.length - MEDIA_CACHE_LIMIT);
                    toDelete.forEach((key) => cache.delete(key));
                  }
                })
              );
            }
            return response;
          }).catch(() =>
            new Response('', { status: 503, statusText: 'Offline' })
          );
        })
      )
    );
    return;
  }

  // App shell — cache-first, fall back to network, offline fallback
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).catch(() =>
        caches.match('./index.html')
      )
    )
  );
});
