const CACHE_NAME = 'kibo-cache-v2'; // Bumped version for update
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install event: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching core assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages
  );
});

// Fetch event: serve with a robust caching strategy
self.addEventListener('fetch', event => {
    // For navigation requests, use a network-first strategy
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
            .then(response => {
                // If the network request is successful, clone it and cache it.
                if (response.ok) {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // If the network fails, serve the root from cache.
                return caches.match('/');
            })
        );
        return;
    }

    // For other requests (scripts, images, etc.), use a stale-while-revalidate strategy
    event.respondWith(
        caches.match(event.request)
        .then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                // Check if we received a valid response
                if (networkResponse && networkResponse.status === 200) {
                    const resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                }
                return networkResponse;
            }).catch(err => {
                console.log('Fetch failed; returning offline page instead.', err);
            });
            // Return cached response immediately, then update cache in the background.
            return cachedResponse || fetchPromise;
        })
    );
});
