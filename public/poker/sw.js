// Increase the version when the cache structure or offline policy changes.
// HTML is network-first, so ordinary trainer updates are fetched on the next online visit.
const CACHE_NAME = 'holdem-practice-v1';
const PREFIX = 'holdem-practice-';
const SHELL = [
  '/poker/',
  '/poker/index.html',
  '/poker/install.js',
  '/poker/manifest.webmanifest',
  '/poker/icon.svg',
  '/poker/icon-192.png',
  '/poker/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith(PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never intercept the party game, its sockets, or arbitrary URLs.
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !SHELL.includes(url.pathname)
  )
    return;

  const key = url.origin + url.pathname;
  // A sleeping Render instance must not hold an already cached trainer hostage.
  // Keep the refresh alive even when the cached page wins the short timeout.
  const network = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(event.request, { cache: 'no-cache' });
    if (response.ok) {
      await cache.put(key, response.clone()).catch(() => {});
      return response;
    }
    return (await cache.match(key)) || response;
  })();
  event.waitUntil(
    network.then(
      () => undefined,
      () => undefined,
    ),
  );
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(key);
      let timer;
      try {
        if (saved) {
          return await Promise.race([
            network.catch(() => saved),
            new Promise((resolve) => {
              timer = setTimeout(() => resolve(saved), 2500);
            }),
          ]);
        }
        return await network;
      } catch {
        return new Response('Open the trainer online once to make it available offline.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      } finally {
        clearTimeout(timer);
      }
    })(),
  );
});
