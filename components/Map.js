import { useEffect, useRef, useState } from 'react'
import { MAP_LAYERS } from './constants'
import { getR, isAnc } from './helpers'

export default function MapComponent({ finds, currentPos, routePoints, layerIdx, onMapClick, tapMode, mapGetCenterRef, mapInstRef }) {
  const divRef     = useRef(null)
  const mapRef     = useRef(null)
  const tileRef    = useRef(null)
  const markersRef = useRef([])
  const routePLRef = useRef(null)
  const posRef     = useRef(null)
  const [ready, setReady] = useState(false)
  const [mapH, setMapH]   = useState(400)
  const onMapClickRef = useRef(onMapClick)
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])

  // Compute pixel height (Leaflet needs explicit px, not %)
  useEffect(() => {
    const calc = () => {
      // Leave room for: top bar 52px + recording bar 44px + controls 110px + bottom nav 56px + buffer 20px = 282px
      // But controls only show when recording, so we use a generous fixed offset
      setMapH(Math.max(180, window.innerHeight - 310))
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setReady(true); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(css)
    const js = document.createElement('script')
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    js.onload = () => setReady(true)
    document.head.appendChild(js)
  }, [])

  // Init map
  useEffect(() => {
    if (!ready || !divRef.current || mapRef.current) return
    const L = window.L
    const center = currentPos ? [currentPos.lat, currentPos.lng] : [37.9838, 23.7275]
    mapRef.current = L.map(divRef.current, { zoomControl: true }).setView(center, 14)
    const cfg = MAP_LAYERS[0]
    const opts = { attribution: cfg.attribution, maxZoom: cfg.maxZoom || 18 }
    if (cfg.subdomains) opts.subdomains = cfg.subdomains
    tileRef.current = L.tileLayer(cfg.url, opts).addTo(mapRef.current)
    if (mapInstRef)    mapInstRef.current    = mapRef.current
    if (mapGetCenterRef) mapGetCenterRef.current = () => { const c = mapRef.current?.getCenter(); return c ? { lat: c.lat, lng: c.lng } : null }
    mapRef.current.on('click', e => { if (onMapClickRef.current) onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }) })
    ;[100, 400, 900].forEach(d => setTimeout(() => mapRef.current?.invalidateSize(), d))
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [ready])

  // Switch layer
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return
    const L = window.L
    if (tileRef.current) { try { mapRef.current.removeLayer(tileRef.current) } catch {} tileRef.current = null }
    const cfg = MAP_LAYERS[layerIdx]
    const opts = { attribution: cfg.attribution, maxZoom: cfg.maxZoom || 18 }
    if (cfg.subdomains) opts.subdomains = cfg.subdomains
    tileRef.current = L.tileLayer(cfg.url, opts).addTo(mapRef.current)
  }, [layerIdx, ready])

  // Finds markers
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return
    const L = window.L
    markersRef.current.forEach(m => { try { mapRef.current.removeLayer(m) } catch {} })
    markersRef.current = []
    finds.forEach(f => {
      const rv = getR(f.rarity)
      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;border-radius:50%;background:${rv.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${rv.emoji}</div>`,
        iconSize: [26, 26], className: ''
      })
      markersRef.current.push(
        L.marker([f.lat, f.lng], { icon }).addTo(mapRef.current)
          .bindPopup(`<b>${f.name}</b><br><small>${f.category} · ${f.depth}cm</small>`)
      )
    })
  }, [finds, ready])

  // Route
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L || routePoints.length < 2) return
    if (routePLRef.current) { try { mapRef.current.removeLayer(routePLRef.current) } catch {} }
    routePLRef.current = window.L.polyline(routePoints.map(p => [p.lat, p.lng]), { color: '#d4a853', weight: 3, dashArray: '6 4' }).addTo(mapRef.current)
  }, [routePoints, ready])

  // Position dot
  useEffect(() => {
    if (!ready || !mapRef.current || !window.L || !currentPos) return
    const L = window.L
    if (posRef.current) { try { mapRef.current.removeLayer(posRef.current) } catch {} }
    const icon = L.divIcon({
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
      iconSize: [16, 16], className: ''
    })
    posRef.current = L.marker([currentPos.lat, currentPos.lng], { icon, zIndexOffset: 1000 }).addTo(mapRef.current)
    mapRef.current.panTo([currentPos.lat, currentPos.lng])
  }, [currentPos, ready])

  return (
    <div ref={divRef} style={{ width: '100%', height: mapH + 'px', cursor: tapMode ? 'crosshair' : 'grab' }}/>
  )
}
