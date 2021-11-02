const cacheName = 'cache';
const OFFLINE_URL = './offline.html';
const precacheResources = [
  './offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => {
        return cache.addAll(precacheResources);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request)
    .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        .catch(error => {
        console.log(error);
        
        });
    }));
  if (event.request.mode === 'navigate') {
    try {
      return event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    } catch(error){
      console.log("Fetch response error " + error)
    }
  }
});
