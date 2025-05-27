const CACHE_NAME = 'controle-estoque-sbb-v1.3'; // Incremente a versão se mudar os arquivos cacheados
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192x192.png', // Exemplo, adicione todos que deseja offline
  './icons/icon-512x512.png', // Exemplo
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  // Adicione aqui outras URLs de CDNs ou fontes se desejar que funcionem offline
  // Ex: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache SBB aberto:', CACHE_NAME);
        // Usar 'reload' para garantir que estamos pegando a versão mais recente dos arquivos da rede durante a instalação de uma nova versão do SW
        const requests = urlsToCache.map(url => new Request(url, {cache: 'reload'}));
        return cache.addAll(requests);
      })
      .catch(error => console.error('Falha ao cachear durante a instalação SBB:', error))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME && cacheName.startsWith('controle-estoque-sbb')) // Filtra para deletar apenas caches deste app
          .map(cacheName => {
            console.log('Service Worker SBB: Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('./index.html')) // Fallback para o index.html cacheado
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response; // Do cache

        return fetch(event.request).then(networkResponse => { // Da rede
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        }).catch(error => {
          console.warn('Fetch SBB falhou; sem cache disponível para:', event.request.url, error);
          // Poderia retornar um fallback genérico aqui se necessário (ex: imagem offline)
        });
      })
  );
});