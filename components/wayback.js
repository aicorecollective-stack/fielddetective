// Wayback Imagery proxy — bypasses CORS for Esri Wayback API
export default async function handler(req, res) {
  const { action, z, y, x, release } = req.query

  // ── Get available releases for a specific tile ──────────────────────────
  if (action === 'releases') {
    try {
      const url = `https://waybackportal.esri.com/api/wayback-imagery-select?f=json&level=${z}&row=${y}&column=${x}`
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 FieldDetective/1.0',
          'Referer': 'https://livingatlas.arcgis.com/',
        }
      })
      const data = await r.json()
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      return res.json(data)
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── Proxy a Wayback tile ────────────────────────────────────────────────
  if (action === 'tile') {
    try {
      const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${release}/${z}/${y}/${x}`
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 FieldDetective/1.0',
          'Referer': 'https://livingatlas.arcgis.com/',
        }
      })
      if (!r.ok) return res.status(r.status).end()
      const buf = await r.arrayBuffer()
      res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.send(Buffer.from(buf))
    } catch(e) {
      return res.status(500).end()
    }
  }

  res.status(400).json({ error: 'Unknown action' })
}
