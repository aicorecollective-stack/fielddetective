// Tile proxy — bypasses CORS for Mapire historical tiles
export default async function handler(req, res) {
  const { provider, z, x, y } = req.query

  const SOURCES = {
    mapire18: `https://tiles.mapire.eu/mercator/europe-18century-firstsurvey/${z}/${x}/${y}`,
    mapire19: `https://tiles.mapire.eu/mercator/europe-19century-secondsurvey/${z}/${x}/${y}`,
  }

  const url = SOURCES[provider]
  if (!url) return res.status(400).json({ error: 'Unknown provider' })

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FieldDetective/1.0',
        'Referer': 'https://mapire.eu/',
      }
    })

    if (!response.ok) {
      return res.status(response.status).end()
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24h
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.send(Buffer.from(buffer))
  } catch (err) {
    res.status(500).end()
  }
}
