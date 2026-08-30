import { APP_VERSION } from '@/lib/version'

/**
 * The service worker, served from a route rather than sat in `public/` so the cache name carries
 * the application version. That is what makes an update an update: a released version invalidates
 * every cache the previous one filled, and nobody has to remember to bump a constant by hand.
 *
 * It is deliberately small. Every page here is built for the person reading it, so there is no
 * shell of HTML worth keeping — what is cacheable is the build output, which is hashed and
 * therefore immutable, plus one page to show when a navigation cannot reach the network at all.
 */
const worker = (version: string) => `
const CACHE = 'splitrip-${version}'
const OFFLINE = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

// A waiting worker takes over only when the reader says so. Swapping the code under somebody
// half-way through typing an expense is not an improvement.
self.addEventListener('message', (event) => {
  if (event.data === 'apply-update') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Hashed build output never changes under its own name, so the cache can answer first and the
  // second opening does not wait for the network to hand back what it already has.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  // Pages are never served from cache: they are built for whoever is reading them, and a stale one
  // would show somebody another person's trip list. Only the failure is handled.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)))
  }
})
`

export function GET() {
  return new Response(worker(APP_VERSION), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      // The browser has to see a changed worker to update, and a cached one it never refetches
      // would pin the application to whatever was released first.
      'Cache-Control': 'no-cache',
    },
  })
}
