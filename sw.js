/* Route Notebook — service worker
   Caches the app shell plus the Three.js / font CDN files. Map, geocoding and routing
   services (Overpass, Photon, Nominatim, Valhalla) always go to the network. */
const VER = 'route-notebook-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];
const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    // App shell: network first (so updates arrive immediately), cache when offline
    e.respondWith(
      fetch(e.request).then(res => { const copy = res.clone(); caches.open(VER).then(c => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  } else if (CDN_HOSTS.includes(url.host)) {
    // CDN: cache first
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VER).then(c => c.put(e.request, copy)); return res; }))
    );
  }
});
