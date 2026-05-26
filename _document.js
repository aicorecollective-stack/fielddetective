import { useEffect, useRef } from 'react'
import { MAP_LAYERS } from './constants'
import { getR, isAnc } from './helpers'

export default function MapComponent({ finds, currentPos, routePoints, layerIdx, onMapClick, tapMode }) {
  const mapRef      = useRef(null)
  const mapInst     = useRef(null)
  const tileRef     = useRef(null)
  const markersRef  = useRef([])
  const routeRef    = useRef(null)
  const posRef      = useRef(null)
  const LRef        = useRef(null)

  // ── Init map + load Leaflet from npm ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return

    // Import leaflet dynamically (avoids SSR issues)
    import('leaflet').then(L => {
      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      LRef.current = L

      const center = currentPos
        ? [currentPos.lat, currentPos.lng]
        : [37.9838, 23.7275]

      mapInst.current = L.map(mapRef.current, { zoomControl: true })
        .setView(center, 14)

      // Add initial tile layer
      const layer = MAP_LAYERS[0]
      const opts  = { attribution: layer.attribution, maxZoom: layer.maxZoom || 18 }
      if (layer.subdomains) opts.subdomains = layer.subdomains
      tileRef.current = L.tileLayer(layer.url, opts).addTo(mapInst.current)

      // Click handler
      mapInst.current.on('click', e => {
        if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
      })

      // Multiple invalidateSize calls for mobile
      ;[100, 400, 900, 1800].forEach(d =>
        setTimeout(() => mapInst.current?.invalidateSize(), d)
      )
    })

    // Cleanup
    return () => {
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null }
    }
  }, [])

  // ── Switch tile layer ─────────────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current
    if (!L || !mapInst.current) return

    if (tileRef.current) {
      mapInst.current.removeLayer(tileRef.current)
      tileRef.current = null
    }

    const layer = MAP_LAYERS[layerIdx]
    const opts  = { attribution: layer.attribution, maxZoom: layer.maxZoom || 18 }
    if (layer.subdomains) opts.subdomains = layer.subdomains
    tileRef.current = L.tileLayer(layer.url, opts).addTo(mapInst.current)
  }, [layerIdx])

  // ── Find markers ─────────────────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current
    if (!L || !mapInst.current) return

    markersRef.current.forEach(m => mapInst.current.removeLayer(m))
    markersRef.current = []

    finds.forEach(f => {
      const rv   = getR(f.rarity)
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${rv.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${rv.emoji}</div>`,
        iconSize: [28, 28], className: ''
      })
      markersRef.current.push(
        L.marker([f.lat, f.lng], { icon })
          .addTo(mapInst.current)
          .bindPopup(`<b>${f.name}</b><br><small>${f.category} · ${f.depth}cm${isAnc(f) ? ' · ⚠️' : ''}</small>`)
      )
    })
  }, [finds])

  // ── Route polyline ────────────────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current
    if (!L || !mapInst.current || routePoints.length < 2) return
    if (routeRef.current) mapInst.current.removeLayer(routeRef.current)
    routeRef.current = L.polyline(
      routePoints.map(p => [p.lat, p.lng]),
      { color: '#d4a853', weight: 3, dashArray: '6 4' }
    ).addTo(mapInst.current)
  }, [routePoints])

  // ── Current position dot ──────────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current
    if (!L || !mapInst.current || !currentPos) return
    if (posRef.current) mapInst.current.removeLayer(posRef.current)
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
      iconSize: [18, 18], className: ''
    })
    posRef.current = L.marker([currentPos.lat, currentPos.lng], { icon, zIndexOffset: 1000 })
      .addTo(mapInst.current)
    mapInst.current.panTo([currentPos.lat, currentPos.lng])
  }, [currentPos])

  return (
    <div
      ref={mapRef}
      style={{ width: '100%', height: '100%', cursor: tapMode ? 'crosshair' : 'grab' }}
    />
  )
}
