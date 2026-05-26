import { useEffect, useRef } from 'react'
import { MAP_LAYERS } from './constants'
import { getR, isAnc, haverD } from './helpers'

export default function MapComponent({ finds, currentPos, routePoints, layerIdx, onMapClick, tapMode }) {
  const mapRef = useRef(null)
  const mapInst = useRef(null)
  const tileRef = useRef(null)
  const markersRef = useRef([])
  const routeLayerRef = useRef(null)
  const posMarkerRef = useRef(null)

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const L = window.L
    if (!L) return

    mapInst.current = L.map(mapRef.current, { zoomControl: true })
      .setView(currentPos ? [currentPos.lat, currentPos.lng] : [37.9838, 23.7275], 14)

    const layer = MAP_LAYERS[0]
    const opts = { attribution: layer.attribution, maxZoom: layer.maxZoom }
    if (layer.subdomains) opts.subdomains = layer.subdomains
    tileRef.current = L.tileLayer(layer.url, opts).addTo(mapInst.current)

    setTimeout(() => mapInst.current?.invalidateSize(), 300)

    mapInst.current.on('click', (e) => {
      if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    })
  }, [])

  // Switch layer
  useEffect(() => {
    if (!mapInst.current || !window.L) return
    if (tileRef.current) { mapInst.current.removeLayer(tileRef.current); tileRef.current = null }
    const layer = MAP_LAYERS[layerIdx]
    const opts = { attribution: layer.attribution, maxZoom: layer.maxZoom || 18 }
    if (layer.subdomains) opts.subdomains = layer.subdomains
    tileRef.current = window.L.tileLayer(layer.url, opts).addTo(mapInst.current)
  }, [layerIdx])

  // Finds markers
  useEffect(() => {
    if (!mapInst.current || !window.L) return
    const L = window.L
    markersRef.current.forEach(m => mapInst.current.removeLayer(m))
    markersRef.current = []
    finds.forEach(f => {
      const rv = getR(f.rarity)
      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${rv.color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${rv.emoji}</div>`,
        iconSize: [28, 28], className: ""
      })
      markersRef.current.push(
        L.marker([f.lat, f.lng], { icon })
          .addTo(mapInst.current)
          .bindPopup(`<div style="font-family:sans-serif"><b>${f.name}</b><br><small>${f.category} · ${f.depth}cm${isAnc(f)?' · ⚠️ Ancient':''}</small></div>`)
      )
    })
  }, [finds])

  // Route
  useEffect(() => {
    if (!mapInst.current || !window.L || routePoints.length < 2) return
    if (routeLayerRef.current) mapInst.current.removeLayer(routeLayerRef.current)
    routeLayerRef.current = window.L.polyline(
      routePoints.map(p => [p.lat, p.lng]),
      { color: '#d4a853', weight: 3, dashArray: '6 4' }
    ).addTo(mapInst.current)
  }, [routePoints])

  // Position
  useEffect(() => {
    if (!mapInst.current || !window.L || !currentPos) return
    const L = window.L
    if (posMarkerRef.current) mapInst.current.removeLayer(posMarkerRef.current)
    const icon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
      iconSize: [18, 18], className: ""
    })
    posMarkerRef.current = L.marker([currentPos.lat, currentPos.lng], { icon, zIndexOffset: 1000 })
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
