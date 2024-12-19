

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open('project-echo').then(function (cache) {
      return cache.addAll([
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
      ]);
    }),
  );
});
self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request).then(res => {
      if (caches.match(event.request)){
        cache.put(event.request, res.clone());
      }
      return res;
    }).catch(function () {
      return caches.match(event.request);
    }),
  );
});