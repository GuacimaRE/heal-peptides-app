// HEAL Peptides — Service Worker
const CACHE_NAME = 'heal-peptides-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim().then(() => {
    self.clients.matchAll({type:'window'}).then(clients => {
      clients.forEach(client => client.postMessage({type:'SW_UPDATED'}));
    });
  });
});

self.addEventListener('fetch', (event) => {
  // Only GET requests, skip API calls
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('netlify.com') || url.hostname.includes('identity.netlify')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Push notifications support (future)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'HEAL Peptides', body: 'Reminder' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'HEAL Peptides', {
      body: data.body || 'Time for your dose',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
