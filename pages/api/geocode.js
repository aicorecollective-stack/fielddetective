export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { lat, lng } = req.query
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' })

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=el,en&zoom=14`,
      { headers: { 'User-Agent': 'FieldDetective/1.0 fielddetective.vercel.app' } }
    )
    const data = await r.json()
    const a = data.address || {}

    // Build location name from most specific to least
    const name =
      a.village || a.town || a.city_district || a.suburb ||
      a.city || a.county || a.state_district ||
      a.mountain_range || a.peak || a.bay || a.beach ||
      a.municipality || a.state || 'Unknown'

    // Extra context (mountain, beach etc)
    const feature =
      a.peak ? `⛰️ ${a.peak}` :
      a.beach ? `🏖️ ${a.beach}` :
      a.bay   ? `🌊 ${a.bay}`   :
      a.mountain_range ? `⛰️ ${a.mountain_range}` : null

    const region = a.county || a.state_district || a.state || ''

    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.json({ name, feature, region, full: data.display_name })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
