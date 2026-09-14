/* Rota Defteri — service worker
   Uygulama kabuğu + Three.js/yazı tipi CDN dosyaları önbelleğe alınır; harita/adres/rota
   servisleri (Overpass, Nominatim, Valhalla) her zaman ağdan gider. */
const VER = 'rota-defteri-v1';
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
    // Kabuk: önce ağ (güncellemeler hemen gelsin), çevrimdışıysa önbellek
    e.respondWith(
      fetch(e.request).then(res => { const copy = res.clone(); caches.open(VER).then(c => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  } else if (CDN_HOSTS.includes(url.host)) {
    // CDN: önce önbellek
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VER).then(c => c.put(e.request, copy)); return res; }))
    );
  }
});
