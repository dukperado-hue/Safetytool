// Safetytool service worker — lets the app open and work with no network after the first visit.
// Strategy: pre-cache the app shell; then "stale-while-revalidate" for same-origin GET requests
// (answer from cache immediately, refresh the cache in the background when online).
// Bump VERSION whenever the file list changes.
const VERSION = 'safetytool-v1';
const SHELL = [
  './', 'index.html', 'css/app.css',
  'js/app.js', 'js/forms.js', 'js/help.js', 'js/i18n.js', 'js/layout.js', 'js/lint.js', 'js/model.js', 'js/render.js',
  'js/shell.js', 'js/swiss.js', 'js/textmetrics.js', 'js/simtab.js', 'js/guide.js', 'js/gallery.js',
  'js/scenario.js', 'js/bowtie-analysis.js', 'js/evidence.js',
  'data/example-wildlife.json', 'data/example-swiss.json', 'data/example-shell.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { net.catch(() => {}); return hit; }
      const res = await net;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }),
  );
});
