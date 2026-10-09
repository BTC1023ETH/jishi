/* 迹时 2.0 — Service Worker (v2) */
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `jishi-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `jishi-runtime-${CACHE_VERSION}`;
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/silence.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.addAll(PRECACHE);
      } catch (_e) {
        // 预缓存失败不阻塞 install
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML 走 network-first，避免新版本无法生效
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          return (await cache.match('/index.html')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // 静态资源走 stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => cached ?? Response.error());
      return cached || network;
    })(),
  );
});
