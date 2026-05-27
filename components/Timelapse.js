import { useState, useEffect, useRef } from 'react'

export default function Timelapse({ mapInstance, onClose }) {
  const [releases, setReleases]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeIdx, setActiveIdx] = useState(null)
  const [playing, setPlaying]     = useState(false)
  const [error, setError]         = useState(null)
  const waybackLayerRef = useRef(null)
  const playRef         = useRef(null)

  // ── Load releases from API ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/wayback?action=releases')
      .then(r => r.json())
      .then(data => {
        const items = (data.items || []).filter(r => r.release && r.date)
        setReleases(items)
        if (items.length > 0) setActiveIdx(items.length - 1) // latest
      })
      .catch(() => setError('Could not load releases'))
      .finally(() => setLoading(false))
  }, [])

  // ── Switch Wayback layer when activeIdx changes ──────────────────────────
  useEffect(() => {
    if (!mapInstance || activeIdx === null || !releases[activeIdx]) return
    const L = window.L
    if (!L) return

    // Remove old wayback layer
    if (waybackLayerRef.current) {
      mapInstance.removeLayer(waybackLayerRef.current)
      waybackLayerRef.current = null
    }

    const { release, date } = releases[activeIdx]
    // Add Wayback tiles directly to Leaflet — no canvas, no CORS
    waybackLayerRef.current = L.tileLayer(
      `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${release}/{z}/{y}/{x}`,
      {
        attribution: `© Esri Wayback ${date}`,
        maxZoom: 19,
        opacity: 1,
        zIndex: 500,
      }
    ).addTo(mapInstance)
  }, [activeIdx, releases, mapInstance])

  // ── Cleanup on close ─────────────────────────────────────────────────────
  const handleClose = () => {
    clearInterval(playRef.current)
    if (waybackLayerRef.current && mapInstance) {
      mapInstance.removeLayer(waybackLayerRef.current)
      waybackLayerRef.current = null
    }
    onClose()
  }

  // ── Auto-play ────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (playing) {
      clearInterval(playRef.current)
      setPlaying(false)
    } else {
      setPlaying(true)
      playRef.current = setInterval(() => {
        setActiveIdx(i => {
          const next = (i + 1) % releases.length
          return next
        })
      }, 1200)
    }
  }

  useEffect(() => () => clearInterval(playRef.current), [])

  const cur = activeIdx !== null ? releases[activeIdx] : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      display: 'flex', flexDirection: 'column',
      pointerEvents: 'none',
    }}>
      {/* Bottom panel — this is the only interactive part */}
      <div style={{
        marginTop: 'auto',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '20px 20px 0 0',
        padding: '18px 20px 32px',
        pointerEvents: 'all',
      }}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
          <div>
            <h3 style={{color:'#f8fafc',fontSize:'17px',fontFamily:"'Playfair Display',serif",margin:0}}>
              🎬 Wayback Timelapse
            </h3>
            <p style={{color:'#64748b',fontSize:'12px',margin:'3px 0 0'}}>
              {loading ? 'Loading snapshots...' :
               error   ? error :
               cur     ? `Showing: ${cur.date}` : ''}
            </p>
          </div>
          <button onClick={handleClose}
            style={{background:'#1e293b',border:'none',color:'#94a3b8',borderRadius:'50%',width:'34px',height:'34px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            ×
          </button>
        </div>

        {loading && (
          <div style={{textAlign:'center',padding:'20px',color:'#64748b'}}>
            Loading snapshots...
          </div>
        )}

        {!loading && !error && releases.length > 0 && (
          <>
            {/* Active year badge */}
            {cur && (
              <div style={{
                textAlign:'center',marginBottom:'14px',
                background:'#1e293b',borderRadius:'10px',padding:'8px',
              }}>
                <span style={{color:'#d4a853',fontSize:'20px',fontWeight:'700'}}>{cur.date.substring(0,4)}</span>
                <span style={{color:'#64748b',fontSize:'13px',marginLeft:'8px'}}>{cur.date}</span>
              </div>
            )}

            {/* Year buttons — scrollable row */}
            <div style={{
              display:'flex', gap:'6px', overflowX:'auto',
              paddingBottom:'8px', marginBottom:'12px',
            }}>
              {releases.map((r, i) => (
                <button key={r.release} onClick={()=>{setPlaying(false);clearInterval(playRef.current);setActiveIdx(i)}}
                  style={{
                    flex:'0 0 auto',
                    padding:'8px 12px',
                    border:`2px solid ${i===activeIdx?'#d4a853':'#334155'}`,
                    background: i===activeIdx ? '#d4a853' : '#1e293b',
                    color: i===activeIdx ? '#0f172a' : '#94a3b8',
                    borderRadius:'8px', cursor:'pointer',
                    fontWeight: i===activeIdx ? '700' : '400',
                    fontSize:'13px', whiteSpace:'nowrap',
                  }}>
                  {r.date.substring(0,4)}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range" min={0} max={releases.length-1} value={activeIdx??0}
              onChange={e=>{setPlaying(false);clearInterval(playRef.current);setActiveIdx(parseInt(e.target.value))}}
              style={{width:'100%',marginBottom:'14px',accentColor:'#d4a853'}}
            />

            {/* Play button */}
            <button onClick={togglePlay}
              style={{
                width:'100%',
                background: playing ? '#1e293b' : 'linear-gradient(135deg,#d4a853,#b8882f)',
                border: playing ? '1px solid #d4a853' : 'none',
                color: playing ? '#d4a853' : '#0f172a',
                padding:'14px', borderRadius:'12px',
                fontWeight:'700', fontSize:'16px', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
              }}>
              {playing ? '⏸ Pause' : '▶ Play Timelapse'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
