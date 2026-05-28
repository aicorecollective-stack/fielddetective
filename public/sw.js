const CACHE_NAME = 'fielddetective-tiles-v1'
const TILE_CACHE = 'fielddetective-tiles-map'

// Install
self.addEventListener('install', e => {
  self.skipWaiting()
})

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

// Intercept tile requests
self.addEventListener('fetch', e => {
  const url = e.request.url

  // Only cache OSM tile requests
  if (url.includes('tile.openstreetmap.org') || url.includes('/api/tiles-proxy')) {
    e.respondWith(
      caches.open(TILE_CACHE).then(async cache => {
        const cached = await cache.match(e.request)
        if (cached) return cached

        try {
          const response = await fetch(e.request)
          if (response.ok) {
            cache.put(e.request, response.clone())
          }
          return response
        } catch {
          // Offline — return cached or empty
          return cached || new Response('', { status: 503 })
        }
      })
    )
    return
  }
})

// Message handler — download area
self.addEventListener('message', async e => {
  if (e.data.type !== 'DOWNLOAD_AREA') return

  const { lat, lng, zoom_min, zoom_max } = e.data
  const cache = await caches.open(TILE_CACHE)

  const lat2tile = (lat, z) =>
    Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 * Math.pow(2,z))
  const lon2tile = (lon, z) =>
    Math.floor((lon+180)/360 * Math.pow(2,z))

  let total = 0, done = 0, errors = 0
  const subs = ['a','b','c']

  // Calculate total tiles
  for (let z = zoom_min; z <= zoom_max; z++) {
    const pad = Math.max(1, Math.floor(4 / (z - zoom_min + 1)))
    const cx = lon2tile(lng, z), cy = lat2tile(lat, z)
    total += (pad*2+1) * (pad*2+1)
  }

  // Download tiles
  for (let z = zoom_min; z <= zoom_max; z++) {
    const pad = Math.max(1, Math.floor(4 / (z - zoom_min + 1)))
    const cx = lon2tile(lng, z), cy = lat2tile(lat, z)

    for (let dx = -pad; dx <= pad; dx++) {
      for (let dy = -pad; dy <= pad; dy++) {
        const tx = cx+dx, ty = cy+dy
        const sub = subs[Math.abs(tx+ty)%3]
        const url = `https://${sub}.tile.openstreetmap.org/${z}/${tx}/${ty}.png`
        const req = new Request(url)

        try {
          const cached = await cache.match(req)
          if (!cached) {
            const res = await fetch(req, { mode: 'no-cors' })
            if (res.ok || res.type === 'opaque') await cache.put(req, res)
          }
        } catch { errors++ }

        done++
        // Report progress every 5 tiles
        if (done % 5 === 0 || done === total) {
          const clients_list = await self.clients.matchAll()
          clients_list.forEach(c => c.postMessage({
            type: 'DOWNLOAD_PROGRESS',
            done, total, errors,
            percent: Math.round(done/total*100)
          }))
        }
      }
    }
  }

  // Done
  const clients_list = await self.clients.matchAll()
  clients_list.forEach(c => c.postMessage({
    type: 'DOWNLOAD_DONE', total, errors,
    cacheSize: total - errors
  }))
})
