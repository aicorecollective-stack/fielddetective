import { useEffect, useRef, useState } from 'react'
import { MAP_LAYERS } from './constants'
import { getR, isAnc } from './helpers'

export default function MapComponent({ finds, currentPos, routePoints, layerIdx, onMapClick, tapMode, pickingArea, onAreaPicked, mapCenterRef, mapGetCenterRef, mapInstRef }) {
  const divRef     = useRef(null)
  const mapRef     = useRef(null)   // leaflet map instance
  const tileRef    = useRef(null)   // current tile layer
  const markersRef = useRef([])
  const routePLRef = useRef(null)
  const posMarkRef = useRef(null)
  const [ready, setReady] = useState(false)
  const pickingAreaRef = useRef(false)

  // ── 1. Load Leaflet + init map ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    import('leaflet').then(mod => {
      if (cancelled || !divRef.current || mapRef.current) return
      const L = mod.default || mod

      // Fix icon paths
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center = currentPos ? [currentPos.lat, currentPos.lng] : [37.9838, 23.7275]
      mapRef.current = L.map(divRef.current, { zoomControl: true }).setView(center, 14)

      // Add initial tile layer (index 0 = street)
      const cfg = MAP_LAYERS[0]
      tileRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom || 18,
        ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {}),
      }).addTo(mapRef.current)

      mapRef.current.on('click', e => {
        if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
        if (onAreaPicked && pickingAreaRef.current) {
          onAreaPicked({ lat: e.latlng.lat, lng: e.latlng.lng })
        }
      })

      ;[100, 500, 1200].forEach(d => setTimeout(() => mapRef.current?.invalidateSize(), d))

      // Expose map instance to parent
      if (mapInstRef) mapInstRef.current = mapRef.current

      // Expose getCenter as a callable function — always returns latest value
      if (mapGetCenterRef) {
        mapGetCenterRef.current = () => {
          const c = mapRef.current?.getCenter()
          return c ? { lat: c.lat, lng: c.lng } : { lat: 37.9838, lng: 23.7275 }
        }
      }
      // Also keep mapCenterRef updated
      const updateCenter = () => {
        const c = mapRef.current?.getCenter()
        if (c && mapCenterRef) mapCenterRef.current = { lat: c.lat, lng: c.lng }
      }
      mapRef.current.on('moveend', updateCenter)
      updateCenter()

      setReady(true)  // ← this makes layer effect re-run with correct state
    })
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // ── Sync pickingArea prop to ref (refs are readable inside closures) ───────
  useEffect(() => { pickingAreaRef.current = pickingArea }, [pickingArea])

  // ── 2. Switch tile layer ───────────────────────────────────────────────────
  // Depends on BOTH layerIdx AND ready — so if user clicks before map loads,
  // this runs again once ready becomes true
  useEffect(() => {
    if (!ready || !mapRef.current) return

    import('leaflet').then(mod => {
      const L = mod.default || mod
      if (!mapRef.current) return

      if (tileRef.current) {
        mapRef.current.removeLayer(tileRef.current)
        tileRef.current = null
      }

      const cfg = MAP_LAYERS[layerIdx]
      tileRef.current = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom || 18,
        ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {}),
      }).addTo(mapRef.current)
    })
  }, [layerIdx, ready])   // ← KEY FIX: depends on ready

  // ── 3. Find markers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    import('leaflet').then(mod => {
      const L = mod.default || mod
      markersRef.current.forEach(m => mapRef.current?.removeLayer(m))
      markersRef.current = []
      finds.forEach(f => {
        const rv = getR(f.rarity)
        const icon = L.divIcon({
          html: `<div style="width:26px;height:26px;border-radius:50%;background:${rv.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${rv.emoji}</div>`,
          iconSize: [26, 26], className: '',
        })
        markersRef.current.push(
          L.marker([f.lat, f.lng], { icon })
            .addTo(mapRef.current)
            .bindPopup(`<b>${f.name}</b><br><small>${f.category} · ${f.depth}cm${isAnc(f) ? ' · ⚠️' : ''}</small>`)
        )
      })
    })
  }, [finds, ready])

  // ── 4. Route ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || routePoints.length < 2) return
    import('leaflet').then(mod => {
      const L = mod.default || mod
      if (routePLRef.current) mapRef.current?.removeLayer(routePLRef.current)
      routePLRef.current = L.polyline(
        routePoints.map(p => [p.lat, p.lng]),
        { color: '#d4a853', weight: 3, dashArray: '6 4' }
      ).addTo(mapRef.current)
    })
  }, [routePoints, ready])

  // ── 5. Position dot ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || !currentPos) return
    import('leaflet').then(mod => {
      const L = mod.default || mod
      if (posMarkRef.current) mapRef.current?.removeLayer(posMarkRef.current)
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
        iconSize: [16, 16], className: '',
      })
      posMarkRef.current = L.marker([currentPos.lat, currentPos.lng], { icon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
      mapRef.current.panTo([currentPos.lat, currentPos.lng])
    })
  }, [currentPos, ready])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={divRef}
        style={{ width: '100%', height: '100%', cursor: pickingArea ? 'cell' : tapMode ? 'crosshair' : 'grab' }}
      />
      {/* Area picking banner */}
      {pickingArea && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'rgba(99,102,241,0.95)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pointerEvents: 'all',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🎬</span>
            <span style={{ color: '#fff', fontSize: '14px', fontWeight: '700' }}>
              Tap anywhere on the map to set the Timelapse center
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
