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
 *
 * With one exception: pictures. An activity photo or a trip cover is a link
 * somebody pasted, it says nothing about what is in sync, and it is looked at
 * standing in the street on roaming data — so once one has been opened it is
 * kept, and the next look costs no download and needs no signal. Map tiles
 * are images too and are left out: a day of panning would push every photo
 * out of the cache, and the tile server's own caching already covers them.
 *
 * A picture from another site arrives opaque — the worker can store it but
 * cannot tell a photo from an error page. So the page says when one failed to
 * draw (`forget-photo`), and that copy is dropped rather than kept for good.
 */

const VERSION = 'travelsync-v1';
const SHELL = '/';

// Its own cache, so a new VERSION does not throw the pictures away.
const PHOTOS = 'travelsync-photos-v1';
const PHOTO_LIMIT = 150;
const TILE_HOSTS = ['tile.openstreetmap.org'];

const isTile = (url) => TILE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));

// Oldest first out: keys() comes back in the order entries were added.
const trimPhotos = (cache) =>
  cache.keys().then((keys) =>
    Promise.all(keys.slice(0, Math.max(0, keys.length - PHOTO_LIMIT)).map((key) => cache.delete(key)))
  );

const keptPhoto = (request) =>
  caches.open(PHOTOS).then((cache) =>
    cache.match(request, { ignoreVary: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok || response.type === 'opaque') {
          cache.put(request, response.clone()).then(() => trimPhotos(cache)).catch(() => {});
        }
        return response;
      });
    })
  );

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'forget-photo' || typeof data.url !== 'string') return;
  event.waitUntil(
    caches.open(PHOTOS).then((cache) => cache.delete(data.url, { ignoreVary: true })).catch(() => {})
  );
});

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
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== PHOTOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    if (request.destination === 'image' && url.protocol === 'https:' && !isTile(url)) {
      event.respondWith(keptPhoto(request));
    }
    return;
  }

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
