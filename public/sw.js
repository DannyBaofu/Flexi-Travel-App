/*
 * Offline shell for TravelSync.
 *
 * The trip itself already survives without a connection — it lives in
 * localStorage — but until now the *app* did not: a reload on hotel wifi or
 * roaming data got a blank page, because index.html and the JS bundle had to
 * come from the network. This caches those so the app opens anyway.
 *
 * Two rules, and the split between them matters:
 *
 *   Navigations go to the network first. A page cached forever is how a PWA
 *   ends up stuck on a version from three deploys ago, and this app deploys on
 *   every push. The cached copy is a fallback for when the network fails, not
 *   the normal path.
 *
 *   Built assets are cache-first, because Vite fingerprints their filenames.
 *   A given /assets/index-abc123.js is immutable — if the content changes the
 *   name changes — so serving it from the cache can never be stale.
 *
 * Everything cross-origin is left alone: Supabase, the geocoder, the exchange
 * rate API and Google Fonts all go straight to the network. Caching somebody
 * else's API responses here would mean serving a stale trip while telling the
 * user they are in sync, which is the one failure this app cannot have.
 */

const VERSION = 'travelsync-v1';
const SHELL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(new Request(SHELL, { cache: 'reload' })))
      // A failed precache must not leave the worker unable to install; the
      // shell will be cached on the first successful navigation instead.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Any URL can be an entry point — "/" and the invite path /j/AB3F7K both
  // resolve to index.html — so the fallback is the shell, not the URL asked for.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(SHELL, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(SHELL).then((cached) => cached || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
