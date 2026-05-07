const CACHE_NAME = 'nx-search-api-v1'
const API_PATTERN = /\/api\//

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', e => {
  if (!API_PATTERN.test(e.request.url)) return
  // Cache API only supports GET — skip caching POST requests
  const isGet = e.request.method === 'GET'
  if (!isGet) return
  e.respondWith(
    fetch(e.request.clone())
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() =>
        caches.match(e.request).then(cached => {
          if (cached) {
            const stale = new Response(cached.body, {
              status: cached.status,
              headers: { ...Object.fromEntries(cached.headers), 'X-From-Cache': 'true' },
            })
            return stale
          }
          return new Response(JSON.stringify({ error: 'offline', results: [], total: 0, query_time_ms: 0 }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        })
      )
  )
})
