// Deliberately minimal. The main app is served dynamically behind a password check
// (via /api/app), and its data comes from a live sync backend — caching that content
// for offline use would risk showing stale, misleading counts with no way to know
// they're stale. So this service worker only exists to satisfy PWA installability
// requirements and to speed up the public login shell; it does not cache the app itself.

const CACHE_NAME = 'table-sense-shell-v1';
const SHELL_ASSETS = ['/login.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls or the dynamic app route — always go to the network
  // so auth state and live sync data are never served stale from a cache.
  if (url.pathname.startsWith('/api/') || url.pathname === '/') {
    return;
  }

  // For the small public shell (login page, manifest, icons), try network first,
  // fall back to cache if offline.
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
