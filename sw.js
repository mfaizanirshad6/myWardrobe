const CACHE = 'msw-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.includes('open-meteo.com')) return; // live weather: never cached

  // Pages: network first (so updates arrive), cached copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (app files, background-removal library and model): cache first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && (r.status === 200 || r.type === 'opaque')) {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(req, cp)).catch(() => { });
      }
      return r;
    }))
  );
});
