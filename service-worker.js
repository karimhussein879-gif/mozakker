/* ============================================================
   Mozakker - Service Worker
   تحديث تلقائي + Cache ذكي
   ============================================================ */

const CACHE_VERSION = 'mozakker-v2';
const CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './features.js',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// ==================== Install ====================
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('⚠️ بعض الملفات مش موجودة:', err);
      });
    })
  );
  // فعّل الـ Service Worker الجديد فوراً
  self.skipWaiting();
});

// ==================== Activate ====================
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Activated');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('🗑️ حذف كاش قديم:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // سيطر على كل الصفحات المفتوحة فوراً
  self.clients.claim();
});

// ==================== Fetch (Strategy) ====================
self.addEventListener('fetch', event => {
  // متتعاملش مع طلبات مش HTTP
  if (!event.request.url.startsWith('http')) return;

  // للـ HTML: Network First (يجيب الجديد، ولو مفيش نت يجيب من الكاش)
  if (event.request.mode === 'navigate' ||
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // لبقية الملفات: Cache First (من الكاش، ولو مش موجود يجيب من النت)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // خزّن الملف الجديد في الكاش
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // fallback لو مفيش نت
        return caches.match('./index.html');
      });
    })
  );
});

// ==================== Messages ====================
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 Service Worker: Loaded');
