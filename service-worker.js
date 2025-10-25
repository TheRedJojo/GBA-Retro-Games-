const CACHE_NAME = 'retrogames-cache-v1';
const OFFLINE_URL = 'index.html';

const FILES_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'main.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
  // + eventuali file dei giochi: aggiungi qui i percorsi (es. 'games/snake.html', ecc.)
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
