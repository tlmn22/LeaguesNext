const CACHE = 'leaguemn-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.json', '/icons/icon.svg', '/icons/icon-maskable.svg', '/fonts/material-icons-round.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Admin болон Next-ийн дотоод хүсэлтэд оролцохгүй
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/_next/data')) return;

  // Хуудас ачаалах: network-first, тасарвал offline хуудас
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Зураг, фонт, icon: cache-first, ард нь шинэчилнэ
  if (/\.(svg|png|jpe?g|webp|gif|ico|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
});
