// Service Worker pour Hub-Lib
// Cache des assets statiques et mode offline basique

const CACHE_NAME = 'hub-lib-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Erreur lors du cache initial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim();
});

// Stratégie de cache: Network First avec fallback sur cache
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Mettre en cache les réponses réussies
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si le réseau échoue, essayer le cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si c'est une navigation et qu'on n'a pas de cache, retourner la page d'accueil
    if (request.mode === 'navigate') {
      const indexCache = await caches.match('/index.html');
      if (indexCache) {
        return indexCache;
      }
    }
    
    throw error;
  }
}

// Intercepter les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas mettre en cache les requêtes vers l'API ou les données dynamiques
  if (url.pathname.startsWith('/api/') || url.pathname.includes('localStorage')) {
    event.respondWith(fetch(request));
    return;
  }

  // Pour les assets statiques (CSS, JS, images), utiliser Network First
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Pour les navigations (pages HTML), utiliser Network First
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Pour les autres requêtes, utiliser la stratégie par défaut
  event.respondWith(fetch(request));
});

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});


