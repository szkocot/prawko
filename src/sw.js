const CACHE_VERSION = 'prawko-v8';
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
  './data/translations_en.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  // Category JSON & translation files — stale-while-revalidate
  if (url.pathname.match(/\/data\/(?!meta\.json).+\.json$/)) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetched = fetch(event.request).then(async (response) => {
            if (response.ok) {
              if (cached) {
                const [oldText, newText] = await Promise.all([
                  cached.clone().text(),
                  response.clone().text()
                ]);
                if (oldText !== newText) {
                  notifyClients({ type: 'DATA_UPDATED' });
                }
              }
              safeCachePut(cache, event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Local media files — cache-first, cached on demand, LRU eviction
  if (url.pathname.match(/\/media\//)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok || response.type === 'opaque') {
              safeCachePut(cache, event.request, response.clone()).then(() =>
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

  // App shell — stale-while-revalidate
  event.respondWith(
    caches.open(APP_SHELL_CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetched = fetch(event.request).then(async (response) => {
          if (response.ok) {
            if (cached) {
              const [oldText, newText] = await Promise.all([
                cached.clone().text(),
                response.clone().text()
              ]);
              if (oldText !== newText) {
                notifyClients({ type: 'APP_UPDATED' });
              }
            }
            safeCachePut(cache, event.request, response.clone());
          }
          return response;
        }).catch(() => cached || caches.match('./index.html'));
        return cached || fetched;
      })
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function notifyClients(message) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}

function safeCachePut(cache, request, response) {
  const requestUrl = new URL(request.url);
  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return Promise.resolve();
  }
  return cache.put(request, response).catch(() => Promise.resolve());
}
