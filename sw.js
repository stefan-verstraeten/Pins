// Pins works offline: the app itself is kept here. Always the network first, so a new
// version arrives as soon as there is a connection; the copy is used when there isn't.
// (Your memories and photos are kept by the app in IndexedDB, not here.)

const CACHE = 'pins-shell-v1';
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/library.js', 'js/idb.js', 'js/dropbox.js', 'js/config.js', 'js/capture.js', 'js/photos.js',
  'js/geocode.js', 'js/settings.js', 'js/countries.js', 'js/country-names.js', 'js/geo.js', 'js/ramps.js',
  'sample/data.js', 'sample/credits.json',
  'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/markercluster.js', 'vendor/topojson-client.min.js',
  'vendor/land-50m.json', 'vendor/countries-50m.json', 'vendor/subunits-50m.json',
  'vendor/fonts/cormorant.woff2', 'vendor/fonts/cormorant-italic.woff2', 'vendor/fonts/inter.woff2',
  'icons/icon-180.png', 'icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(e.request, { cache: 'no-cache' });
      if (res.ok) (await caches.open(CACHE)).put(e.request, res.clone());
      return res;
    } catch {
      const hit = await caches.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      if (e.request.mode === 'navigate') return caches.match('index.html');
      throw new Error('offline');
    }
  })());
});
