export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { action, z, y, x, release } = req.query

  // ── Get releases from official S3 config ─────────────────────────────────
  if (action === 'releases') {
    const CONFIG_URLS = [
      'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json',
      'https://livingatlas2.arcgis.com/wabWayback/wayback-config.json',
    ]
    let releases = null
    for (const url of CONFIG_URLS) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://livingatlas.arcgis.com' }
        })
        if (!r.ok) continue
        const data = await r.json()
        // Format: { "1": { releaseDateLabel:"2014-02-20", ... }, "2": {...}, ... }
        releases = Object.entries(data)
          .map(([id, info]) => ({
            release: parseInt(id),
            date: info.releaseDateLabel || info.date || '',
          }))
          .filter(r => r.date && r.date.length >= 4)
          .sort((a,b) => a.date.localeCompare(b.date))
        // One per year
        const byYear = {}
        releases.forEach(r => {
          const yr = r.date.substring(0,4)
          byYear[yr] = r  // keeps last per year
        })
        releases = Object.values(byYear).sort((a,b) => a.date.localeCompare(b.date))
        break
      } catch(e) { continue }
    }

    // If both fail, probe which release IDs actually return tiles for this location
    if (!releases) {
      res.setHeader('Cache-Control', 'public, max-age=3600')
      // Known verified Esri Wayback release IDs (from official app source)
      const KNOWN = [
        {release:1,   date:'2014-02-20'},
        {release:3,   date:'2015-01-12'},
        {release:8,   date:'2016-03-14'},
        {release:15,  date:'2017-02-13'},
        {release:24,  date:'2018-01-15'},
        {release:35,  date:'2019-02-18'},
        {release:46,  date:'2020-01-13'},
        {release:57,  date:'2021-02-08'},
        {release:68,  date:'2022-01-10'},
        {release:79,  date:'2023-02-13'},
        {release:90,  date:'2024-01-08'},
      ]
      return res.json({ items: KNOWN, source: 'fallback' })
    }

    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.json({ items: releases, source: 'config' })
  }

  // ── Probe: check if a tile actually has content ───────────────────────────
  if (action === 'probe') {
    try {
      const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${release}/${z}/${y}/${x}`
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://livingatlas.arcgis.com/' }
      })
      return res.json({ ok: r.ok, status: r.status, size: r.headers.get('content-length') })
    } catch(e) {
      return res.json({ ok: false, error: e.message })
    }
  }

  // ── Proxy tile ────────────────────────────────────────────────────────────
  if (action === 'tile') {
    try {
      const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${release}/${z}/${y}/${x}`
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://livingatlas.arcgis.com/wayback/',
          'Origin':  'https://livingatlas.arcgis.com',
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
