const CACHE_NAME = 'singrar-marine-os-v1';
const TILE_CACHE_NAME = 'singrar-map-tiles-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Intercept Map Tile Requests
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('tiles.openseamap.org') ||
    url.hostname.includes('server.arcgisonline.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Return from cache if available
        }
        
        // Otherwise fetch from network and cache it
        return fetch(event.request).then(networkResponse => {
          // Check if we received a valid response
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
            return networkResponse;
          }

          // Clone the response because it's a stream and can only be consumed once
          const responseToCache = networkResponse.clone();

          caches.open(TILE_CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return networkResponse;
        }).catch(() => {
          // If network fails and not in cache, return nothing or a placeholder
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // Default fetch behavior for other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          // Cache successful GET requests
          if (event.request.method === 'GET' && networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
  );
});
