import { useState, useRef, useEffect, useCallback } from 'react'

// ── Tile coordinate helpers ────────────────────────────────────────────────
const lat2tile = (lat, z) =>
  Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 * Math.pow(2,z))
const lon2tile = (lon, z) =>
  Math.floor((lon+180)/360 * Math.pow(2,z))

const TILE_SIZE = 256
const GRID = 3  // 3×3 tiles = ~1km² at zoom 15

// Load a single image, resolve with null on error
const loadImage = (src) => new Promise(resolve => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = () => resolve(img)
  img.onerror = () => resolve(null)
  img.src = src
})

// Draw a grid of tiles + label onto a canvas, return dataURL
const renderFrame = async (release, z, cx, cy, date) => {
  const half = Math.floor(GRID/2)
  const canvasW = GRID * TILE_SIZE
  const canvasH = GRID * TILE_SIZE

  const canvas = document.createElement('canvas')
  canvas.width  = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Fetch tiles in parallel
  const jobs = []
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const px = dx + half
      const py = dy + half
      jobs.push(
        loadImage(`/api/wayback?action=tile&release=${release}&z=${z}&y=${cy+dy}&x=${cx+dx}`)
          .then(img => { if (img) ctx.drawImage(img, px*TILE_SIZE, py*TILE_SIZE, TILE_SIZE, TILE_SIZE) })
      )
    }
  }
  await Promise.all(jobs)

  // Date label
  const labelH = 36
  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  ctx.fillRect(0, canvasH - labelH, canvasW, labelH)
  ctx.fillStyle = '#d4a853'
  ctx.font = 'bold 18px DM Sans, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(date, canvasW/2, canvasH - 10)

  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function Timelapse({ center, onClose }) {
  const [step, setStep]       = useState('setup')   // setup | loading | done
  const [zoom, setZoom]       = useState(15)
  const [releases, setReleases] = useState([])
  const [selected, setSelected] = useState([])
  const [progress, setProgress] = useState({ cur:0, total:0 })
  const [frames, setFrames]   = useState([])         // { date, dataUrl }[]
  const [fi, setFi]           = useState(0)
  const animRef = useRef(null)
  const abortRef = useRef(false)

  // ── Load available releases ──────────────────────────────────────────────
  useEffect(() => {
    const z = zoom
    const tx = lon2tile(center.lng, z)
    const ty = lat2tile(center.lat, z)
    setReleases([])
    setSelected([])
    fetch(`/api/wayback?action=releases&z=${z}&y=${ty}&x=${tx}`)
      .then(r => r.json())
      .then(data => {
        // Normalize response — Esri returns { items: [...] } or array
        const items = Array.isArray(data) ? data : (data.items || data.waybackLayers || [])
        const parsed = items
          .map(item => ({
            release: item.id ?? item.releaseNum ?? item.itemId,
            date:    item.releaseDate ?? item.date ?? item.metaData?.publishedDate ?? '?',
          }))
          .filter(r => r.release != null && r.date !== '?')
          .sort((a,b) => a.date.localeCompare(b.date))

        setReleases(parsed)
        setSelected(parsed.map(r => r.release))  // select all by default
      })
      .catch(e => console.warn('Wayback releases error:', e))
  }, [center, zoom])

  // ── Generate frames ──────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    abortRef.current = false
    setStep('loading')
    setFrames([])
    setFi(0)

    const toRender = releases.filter(r => selected.includes(r.release))
    setProgress({ cur:0, total: toRender.length })

    const z  = zoom
    const tx = lon2tile(center.lng, z)
    const ty = lat2tile(center.lat, z)
    const built = []

    for (let i = 0; i < toRender.length; i++) {
      if (abortRef.current) break
      const { release, date } = toRender[i]
      const dataUrl = await renderFrame(release, z, tx, ty, date)
      built.push({ date, dataUrl })
      setProgress({ cur: i+1, total: toRender.length })
    }

    setFrames(built)
    setStep('done')

    // Auto-play
    let idx = 0
    animRef.current = setInterval(() => {
      idx = (idx+1) % built.length
      setFi(idx)
    }, 900)
  }, [center, zoom, releases, selected])

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => { clearInterval(animRef.current); abortRef.current = true }, [])

  // ── Download as WebM video (native, no library) ──────────────────────────
  const download = useCallback(() => {
    if (!frames.length) return
    const canvasW = GRID * TILE_SIZE
    const canvasH = GRID * TILE_SIZE

    const canvas = document.createElement('canvas')
    canvas.width  = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    const stream = canvas.captureStream(10)  // 10 fps

    const chunks = []
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    rec.ondataavailable = e => chunks.push(e.data)
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `fielddetective-timelapse-${center.lat.toFixed(4)}.webm`
      a.click()
    }
    rec.start()

    let i = 0
    const draw = () => {
      if (i >= frames.length) { rec.stop(); return }
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasW, canvasH)
        i++
        setTimeout(draw, 900)  // 0.9s per frame
      }
      img.src = frames[i].dataUrl
    }
    draw()
  }, [frames, center])

  // ── Toggle a release ─────────────────────────────────────────────────────
  const toggle = (release) =>
    setSelected(p => p.includes(release) ? p.filter(x=>x!==release) : [...p, release])

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:600,display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'#0f172a',width:'100%',borderRadius:'20px 20px 0 0',padding:'22px',maxHeight:'92vh',overflowY:'auto',border:'1px solid #1e293b'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'18px'}}>
          <div>
            <h3 style={{color:'#f8fafc',fontSize:'18px',fontFamily:"'Playfair Display',serif",margin:0}}>🎬 Area Timelapse</h3>
            <p style={{color:'#64748b',fontSize:'12px',margin:'4px 0 0'}}>
              Esri Wayback Imagery · {center.lat.toFixed(4)}°, {center.lng.toFixed(4)}°
            </p>
          </div>
          <button onClick={onClose}
            style={{background:'#1e293b',border:'none',color:'#64748b',borderRadius:'50%',width:'34px',height:'34px',cursor:'pointer',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            ×
          </button>
        </div>

        {/* ── SETUP ── */}
        {step === 'setup' && (
          <>
            {/* Zoom selector */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'8px'}}>
                Zoom Level — {zoom === 14 ? 'Wide area ~4km²' : zoom === 15 ? 'Medium ~1km²' : 'Detail ~250m²'}
              </label>
              <div style={{display:'flex',gap:'8px'}}>
                {[{z:14,lbl:'14 — Wide'},{z:15,lbl:'15 — Medium'},{z:16,lbl:'16 — Detail'}].map(({z,lbl})=>(
                  <button key={z} onClick={()=>setZoom(z)}
                    style={{flex:1,padding:'10px',border:`2px solid ${zoom===z?'#d4a853':'#334155'}`,background:zoom===z?'#d4a853':'#1e293b',color:zoom===z?'#0f172a':'#94a3b8',borderRadius:'9px',cursor:'pointer',fontWeight:zoom===z?'700':'400',fontSize:'12px'}}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Release selector */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'8px'}}>
                Available snapshots {releases.length > 0 ? `(${releases.length} found)` : '— loading...'}
              </label>
              {releases.length === 0 && (
                <div style={{background:'#1e293b',borderRadius:'10px',padding:'14px',textAlign:'center',color:'#475569',fontSize:'13px'}}>
                  Searching Esri Wayback archive...
                </div>
              )}
              <div style={{display:'flex',flexWrap:'wrap',gap:'7px'}}>
                {releases.map(r => (
                  <button key={r.release} onClick={()=>toggle(r.release)}
                    style={{padding:'7px 11px',border:`2px solid ${selected.includes(r.release)?'#d4a853':'#334155'}`,background:selected.includes(r.release)?'#d4a853':'#1e293b',color:selected.includes(r.release)?'#0f172a':'#94a3b8',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                    {r.date}
                  </button>
                ))}
              </div>
              {releases.length > 0 && (
                <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                  <button onClick={()=>setSelected(releases.map(r=>r.release))}
                    style={{fontSize:'11px',color:'#d4a853',background:'none',border:'none',cursor:'pointer',padding:0}}>Select all</button>
                  <button onClick={()=>setSelected([])}
                    style={{fontSize:'11px',color:'#64748b',background:'none',border:'none',cursor:'pointer',padding:0}}>Clear</button>
                </div>
              )}
            </div>

            <button onClick={generate} disabled={selected.length < 2}
              style={{width:'100%',background:selected.length>=2?'linear-gradient(135deg,#d4a853,#b8882f)':'#334155',border:'none',color:selected.length>=2?'#0f172a':'#64748b',padding:'15px',borderRadius:'13px',fontWeight:'700',fontSize:'16px',cursor:selected.length>=2?'pointer':'not-allowed',boxShadow:selected.length>=2?'0 4px 20px rgba(212,168,83,0.3)':'none'}}>
              🎬 Generate ({selected.length} frames)
            </button>
          </>
        )}

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <div style={{fontSize:'40px',marginBottom:'12px'}}>🛰️</div>
            <p style={{color:'#d4a853',fontSize:'16px',fontWeight:'700',margin:'0 0 16px'}}>
              Fetching satellite imagery...
            </p>
            <div style={{background:'#1e293b',borderRadius:'8px',height:'10px',overflow:'hidden',marginBottom:'10px'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#d4a853,#f59e0b)',width:`${progress.total?progress.cur/progress.total*100:0}%`,transition:'width 0.4s ease',borderRadius:'8px'}}/>
            </div>
            <p style={{color:'#64748b',fontSize:'13px',margin:'0 0 16px'}}>
              Frame {progress.cur} of {progress.total}
            </p>
            <button onClick={()=>{abortRef.current=true;setStep('setup')}}
              style={{background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>
              Cancel
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && frames.length > 0 && (
          <>
            {/* Preview */}
            <div style={{position:'relative',marginBottom:'12px',borderRadius:'12px',overflow:'hidden',background:'#111'}}>
              <img src={frames[fi].dataUrl} alt={frames[fi].date}
                style={{width:'100%',display:'block',borderRadius:'12px'}}/>
              {/* Play indicator */}
              <div style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,0,0,0.7)',borderRadius:'6px',padding:'3px 9px',fontSize:'11px',color:'#d4a853',fontWeight:'700'}}>
                ▶ {fi+1}/{frames.length}
              </div>
            </div>

            {/* Frame scrubber */}
            <div style={{display:'flex',gap:'4px',marginBottom:'14px',overflowX:'auto',paddingBottom:'4px'}}>
              {frames.map((f,i)=>(
                <button key={i} onClick={()=>{clearInterval(animRef.current);setFi(i)}}
                  style={{flex:'0 0 auto',padding:'5px 8px',border:`2px solid ${i===fi?'#d4a853':'#334155'}`,background:i===fi?'#d4a853':'#1e293b',color:i===fi?'#0f172a':'#94a3b8',borderRadius:'7px',cursor:'pointer',fontSize:'10px',fontWeight:'600',whiteSpace:'nowrap'}}>
                  {f.date.substring(0,10)}
                </button>
              ))}
            </div>

            {/* Speed control */}
            <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
              {[['⏸','Pause',0],['🐢','Slow',1500],['▶️','Normal',900],['⚡','Fast',400]].map(([ic,lbl,ms])=>(
                <button key={lbl} onClick={()=>{
                  clearInterval(animRef.current)
                  if(ms>0){let i=fi;animRef.current=setInterval(()=>{i=(i+1)%frames.length;setFi(i)},ms)}
                }}
                  style={{flex:1,padding:'8px 4px',background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',borderRadius:'8px',cursor:'pointer',fontSize:'11px',textAlign:'center'}}>
                  {ic}<div style={{fontSize:'9px',marginTop:'2px'}}>{lbl}</div>
                </button>
              ))}
            </div>

            {/* Buttons */}
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{clearInterval(animRef.current);setStep('setup')}}
                style={{flex:1,background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'13px',borderRadius:'10px',cursor:'pointer',fontSize:'14px'}}>
                ← Back
              </button>
              <button onClick={download}
                style={{flex:2,background:'linear-gradient(135deg,#d4a853,#b8882f)',border:'none',color:'#0f172a',padding:'13px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'15px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                📥 Download Video
              </button>
            </div>
            <p style={{color:'#475569',fontSize:'11px',textAlign:'center',marginTop:'10px'}}>
              WebM video · {frames.length} frames · Esri Wayback Imagery
            </p>
          </>
        )}

      </div>
    </div>
  )
}
