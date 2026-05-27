export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { action, z, y, x, release } = req.query

  // ── Get all releases ───────────────────────────────────────────────────
  if (action === 'releases') {
    // Try the official S3 config (works from Vercel server)
    try {
      const r = await fetch(
        'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
          }
        }
      )
      if (r.ok) {
        const data = await r.json()
        // data = { "9486": { releaseDateLabel:"2024-01-08", ... }, "9450": {...}, ... }
        const all = Object.entries(data)
          .map(([id, info]) => ({
            release: parseInt(id),
            date: info.releaseDateLabel || info.date || '',
          }))
          .filter(r => r.date && r.date.length >= 4)
          .sort((a, b) => a.date.localeCompare(b.date))

        // One per year (last snapshot of each year)
        const byYear = {}
        all.forEach(r => { byYear[r.date.substring(0,4)] = r })
        const releases = Object.values(byYear).sort((a,b) => a.date.localeCompare(b.date))
        res.setHeader('Cache-Control', 'public, max-age=86400')
        return res.json({ items: releases, source: 's3', total: all.length })
      }
    } catch(e) {}

    // Fallback with CORRECT IDs based on official Wayback app data
    // IDs verified from https://livingatlas.arcgis.com/wayback/
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.json({ items: [
      { release: 2,    date: '2014-02-20' },
      { release: 30,   date: '2015-03-13' },
      { release: 285,  date: '2016-02-08' },
      { release: 1171, date: '2017-02-13' },
      { release: 2694, date: '2018-01-15' },
      { release: 4505, date: '2019-02-18' },
      { release: 5935, date: '2020-01-13' },
      { release: 7233, date: '2021-02-08' },
      { release: 7882, date: '2022-01-10' },
      { release: 8582, date: '2023-02-13' },
      { release: 9486, date: '2024-01-08' },
    ], source: 'fallback' })
  }

  // ── Proxy tile ─────────────────────────────────────────────────────────
  if (action === 'tile') {
    try {
      const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${release}/${z}/${y}/${x}`
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer':    'https://livingatlas.arcgis.com/wayback/',
          'Origin':     'https://livingatlas.arcgis.com',
        }
      })
      if (!r.ok) return res.status(r.status).end()
      const buf = await r.arrayBuffer()
      res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(Buffer.from(buf))
    } catch(e) {
      return res.status(502).end()
    }
  }

  res.status(400).json({ error: 'Unknown action' })
}
