// Define the cache name and initial resources to cache
const CACHE_NAME = 'project-echo';
const INITIAL_RESOURCES = [
  '/favicon.ico',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Nabla&family=Parkinsans:wght@300..800&display=swap',
  'https://unpkg.com/feather-icons',
  'https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css',
  'https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js',
  'https://cdn.jsdelivr.net/gh/mdbassit/Coloris@0.24.0/dist/coloris.min.css',
  'https://cdn.jsdelivr.net/gh/mdbassit/Coloris@0.24.0/dist/coloris.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.2.2/dist/purify.min.js',
  '/bundle.js',
  '/main.js',
  '/guide/check-192.png',
  '/guide/check-512.png',
  '/guide/GUIDE.md',
  '/guide/guide1.png',
  '/guide/guide2.png',
  '/guide/guide3.png',
  '/guide/guide4.png',
  '/guide/guide5.png',
  '/guide/guide6.png',
  '/guide/guide7.png',
  '/guide/guide8.png',
  '/guide/guide9.png',
  '/guide/guide10.png',
  '/guide/guide11.png',
  '/guide/guide12.png',
  '/guide/guide14.png'
];

// Install event: Cache the initial resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(INITIAL_RESOURCES);
        })
    );
});

// Fetch event: Proxy requests based on the initial list of URLs
self.addEventListener('fetch', (event) => {
    const requestURL = new URL(event.request.url);
    const isInitialResource = INITIAL_RESOURCES.some((resource) => 
        requestURL.pathname.endsWith(resource)
    );

    if (isInitialResource) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        // Update the cache with the fresh network response
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Attempt to fetch from cache if network fails
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        throw new Error('Resource not available in cache or network');
                    });
                })
        );
    } else {
        // For non-listed resources, handle normally through the network
        event.respondWith(fetch(event.request));
    }
});

// Activate event: Cleanup old caches if necessary
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
