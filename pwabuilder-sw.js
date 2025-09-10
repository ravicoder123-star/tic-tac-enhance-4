// pwabuilder-sw.js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `pwa-cache-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
  // add any other core assets here, e.g. './css/styles.css', './js/game.js'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch: navigation -> network-first (fallback to cache), others -> cache-first
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const req = event.request;

  // For navigations (page loads) do network-first then fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Cache the fresh navigation response for offline use
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // For other assets (CSS, JS, images) try cache first, then network and cache it
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        // don't cache opaque cross-origin responses blindly
        if (!response || response.type === 'opaque') return response;
        const respCopy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, respCopy));
        return response;
      }).catch(() => {
        // optional: return a fallback image or resource for failed requests
        return caches.match('./icons/icon-192.png');
      });
    })
  );
});

// Optional: allow page to trigger immediate activation
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
