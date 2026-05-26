export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  const { action, z, y, x, release } = req.query

  // ── Get all releases from official Esri Wayback config ───────────────────
  if (action === 'releases') {
    try {
      const r = await fetch(
        'https://livingatlas2.arcgis.com/wabWayback/wayback-config.json',
        { headers: { 'User-Agent': 'Mozilla/5.0 FieldDetective/1.0' } }
      )
      const data = await r.json()
      // data = { "1": { title:"...", releaseDateLabel:"2014-02-20" }, ... }
      const all = Object.entries(data)
        .map(([id, info]) => ({
          release: parseInt(id),
          date: info.releaseDateLabel || '',
          year: parseInt((info.releaseDateLabel || '20').substring(0, 4)),
        }))
        .filter(r => r.date && r.year >= 2014)
        .sort((a, b) => a.date.localeCompare(b.date))

      // Keep ONE per year (the latest of each year)
      const byYear = {}
      all.forEach(r => { byYear[r.year] = r })
      const releases = Object.values(byYear).sort((a,b) => a.year - b.year)

      return res.json({ items: releases })
    } catch(e) {
      // Fallback: hardcoded known releases that cover 2014-2024
      return res.json({ items: [
        { release:10,  date:'2014-06-01', year:2014 },
        { release:25,  date:'2015-06-01', year:2015 },
        { release:40,  date:'2016-06-01', year:2016 },
        { release:60,  date:'2017-06-01', year:2017 },
        { release:80,  date:'2018-06-01', year:2018 },
        { release:100, date:'2019-06-01', year:2019 },
        { release:115, date:'2020-06-01', year:2020 },
        { release:130, date:'2021-06-01', year:2021 },
        { release:145, date:'2022-06-01', year:2022 },
        { release:160, date:'2023-06-01', year:2023 },
        { release:175, date:'2024-06-01', year:2024 },
      ]})
    }
  }

  // ── Proxy a Wayback tile ─────────────────────────────────────────────────
  if (action === 'tile') {
    try {
      const url = `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${release}/${z}/${y}/${x}`
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 FieldDetective/1.0',
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
