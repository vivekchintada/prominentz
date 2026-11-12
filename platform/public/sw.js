// Service Worker for Offline POS Support
//
// Rules (v2): live data must never be served from cache while the network works.
//  - /api/*, RSC payloads and every dashboard page: network only (never stored).
//  - /pos and /kds pages: network first, stored copy used only when offline.
//  - Hashed build files and images: cache first (their URLs change when content changes).
// v1 cached every GET cache-first, which froze dashboard numbers and reservations.
const CACHE_NAME = 'resto-pos-cache-v2'
const OFFLINE_PAGES = ['/pos', '/kds']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(['/manifest.json']))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:svg|png|jpg|jpeg|webp|avif|ico|woff2?)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Live data and Next.js server-component payloads: always go to the network.
  if (url.pathname.startsWith('/api/') || url.searchParams.has('_rsc') || request.headers.has('RSC')) return

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
      )
    )
    return
  }

  // Page loads: network first. Only the offline-capable terminals keep a copy.
  if (request.mode === 'navigate') {
    const keep = OFFLINE_PAGES.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'))
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (keep && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/pos')))
    )
  }
})
