import { useState, useRef, useEffect, useCallback } from 'react'

const TILE_SZ = 256
const GRID    = 3   // 3×3 tiles per frame

const lat2tile = (lat, z) =>
  Math.floor((1 - Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 * Math.pow(2,z))
const lon2tile = (lon, z) =>
  Math.floor((lon+180)/360 * Math.pow(2,z))

const loadImg = src => new Promise(resolve => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = () => resolve(img)
  img.onerror = () => resolve(null)
  setTimeout(() => resolve(null), 8000) // 8s timeout
  img.src = src
})

const buildFrame = async (release, z, cx, cy, label) => {
  const half = Math.floor(GRID/2)
  const W = GRID*TILE_SZ, H = GRID*TILE_SZ
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0,0,W,H)

  // Load tiles in parallel
  await Promise.all(
    Array.from({length:GRID}, (_,dy) =>
      Array.from({length:GRID}, (_,dx) =>
        loadImg(`/api/wayback?action=tile&release=${release}&z=${z}&y=${cy+dy-half}&x=${cx+dx-half}`)
          .then(img => { if(img) ctx.drawImage(img, dx*TILE_SZ, dy*TILE_SZ, TILE_SZ, TILE_SZ) })
      )
    ).flat()
  )

  // Check if frame has content (not all dark)
  const px = ctx.getImageData(W/2, H/2, 4, 4).data
  const brightness = (px[0]+px[1]+px[2])/3
  if (brightness < 10) return null // blank tile = no data for this area/year

  // Year label
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(0, H-40, W, 40)
  ctx.fillStyle = '#d4a853'
  ctx.font = 'bold 20px DM Sans,sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, W/2, H-12)

  return canvas.toDataURL('image/jpeg', 0.85)
}

export default function Timelapse({ center, onClose }) {
  const [step,setStep]         = useState('setup')
  const [zoom,setZoom]         = useState(15)
  const [releases,setReleases] = useState([])
  const [selected,setSelected] = useState([])
  const [loading,setLoading]   = useState(true)
  const [progress,setProgress] = useState({cur:0,tot:0})
  const [frames,setFrames]     = useState([])
  const [fi,setFi]             = useState(0)
  const animRef  = useRef(null)
  const abortRef = useRef(false)

  // ── Fetch available releases ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setReleases([])
    setSelected([])
    const z  = zoom
    const cx = lon2tile(center.lng, z)
    const cy = lat2tile(center.lat, z)
    fetch(`/api/wayback?action=releases&z=${z}&y=${cy}&x=${cx}`)
      .then(r => r.json())
      .then(data => {
        const items = (data.items || []).filter(r => r.release && r.date)
        setReleases(items)
        setSelected(items.map(r => r.release))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [center, zoom])

  // ── Generate timelapse ────────────────────────────────────────────────────
  const generate = useCallback(async () => {
    abortRef.current = false
    setStep('loading')
    setFrames([])
    const z  = zoom
    const cx = lon2tile(center.lng, z)
    const cy = lat2tile(center.lat, z)
    const toRender = releases.filter(r => selected.includes(r.release))
    setProgress({cur:0, tot:toRender.length})
    const built = []
    for (let i=0; i<toRender.length; i++) {
      if (abortRef.current) break
      const {release, date, year} = toRender[i]
      const label = date.length >= 7 ? date.substring(0,7) : String(year)
      const dataUrl = await buildFrame(release, z, cx, cy, label)
      if (dataUrl) built.push({date:label, dataUrl})
      setProgress({cur:i+1, tot:toRender.length})
    }
    if (built.length === 0) {
      setStep('nodata')
    } else {
      setFrames(built)
      setFi(0)
      setStep('done')
      let idx=0
      animRef.current = setInterval(()=>{ idx=(idx+1)%built.length; setFi(idx) }, 900)
    }
  }, [center, zoom, releases, selected])

  useEffect(() => ()=>{ clearInterval(animRef.current); abortRef.current=true }, [])

  // ── Download as WebM ──────────────────────────────────────────────────────
  const download = useCallback(async () => {
    if (!frames.length) return
    const W = GRID*TILE_SZ, H = GRID*TILE_SZ
    const canvas = document.createElement('canvas')
    canvas.width=W; canvas.height=H
    const ctx = canvas.getContext('2d')
    const stream = canvas.captureStream(10)
    const chunks = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8' : 'video/webm'
    const rec = new MediaRecorder(stream, {mimeType})
    rec.ondataavailable = e => chunks.push(e.data)
    rec.onstop = () => {
      const blob = new Blob(chunks, {type:'video/webm'})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `fielddetective-timelapse-${center.lat.toFixed(3)}.webm`
      a.click()
    }
    rec.start()
    let i=0
    const draw = () => {
      if (i>=frames.length) { rec.stop(); return }
      const img = new Image()
      img.onload = () => { ctx.drawImage(img,0,0,W,H); i++; setTimeout(draw,900) }
      img.src = frames[i].dataUrl
    }
    draw()
  }, [frames, center])

  const toggle = r => setSelected(p => p.includes(r) ? p.filter(x=>x!==r) : [...p,r])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:600,display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'#0f172a',width:'100%',borderRadius:'20px 20px 0 0',padding:'22px',maxHeight:'92vh',overflowY:'auto',border:'1px solid #1e293b'}}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'18px'}}>
          <div>
            <h3 style={{color:'#f8fafc',fontSize:'18px',fontFamily:"'Playfair Display',serif",margin:0}}>🎬 Timelapse</h3>
            <p style={{color:'#64748b',fontSize:'12px',margin:'4px 0 0'}}>
              Esri Wayback · {center.lat.toFixed(4)}°, {center.lng.toFixed(4)}°
            </p>
          </div>
          <button onClick={onClose}
            style={{background:'#1e293b',border:'none',color:'#64748b',borderRadius:'50%',width:'34px',height:'34px',cursor:'pointer',fontSize:'18px',flexShrink:0}}>
            ×
          </button>
        </div>

        {/* ── SETUP ── */}
        {step==='setup' && (
          <>
            {/* Zoom */}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'8px'}}>
                Detail level — {zoom===14?'Wide ~4km²':zoom===15?'Medium ~1km²':'Detail ~250m²'}
              </label>
              <div style={{display:'flex',gap:'8px'}}>
                {[{z:14,l:'14 Wide'},{z:15,l:'15 Med'},{z:16,l:'16 Detail'}].map(({z,l})=>(
                  <button key={z} onClick={()=>setZoom(z)}
                    style={{flex:1,padding:'10px',border:`2px solid ${zoom===z?'#d4a853':'#334155'}`,background:zoom===z?'#d4a853':'#1e293b',color:zoom===z?'#0f172a':'#94a3b8',borderRadius:'9px',cursor:'pointer',fontWeight:zoom===z?'700':'400',fontSize:'13px'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Releases */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'8px'}}>
                {loading ? '⏳ Loading snapshots...' : releases.length===0 ? '⚠️ No snapshots found' : `📅 ${releases.length} snapshots available`}
              </label>
              {!loading && releases.length>0 && (
                <>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'8px'}}>
                    {releases.map(r=>(
                      <button key={r.release} onClick={()=>toggle(r.release)}
                        style={{padding:'7px 11px',border:`2px solid ${selected.includes(r.release)?'#d4a853':'#334155'}`,background:selected.includes(r.release)?'#d4a853':'#1e293b',color:selected.includes(r.release)?'#0f172a':'#94a3b8',borderRadius:'8px',cursor:'pointer',fontWeight:'600',fontSize:'12px'}}>
                        {r.date.substring(0,7)}
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:'12px'}}>
                    <button onClick={()=>setSelected(releases.map(r=>r.release))} style={{fontSize:'11px',color:'#d4a853',background:'none',border:'none',cursor:'pointer'}}>Select all</button>
                    <button onClick={()=>setSelected([])} style={{fontSize:'11px',color:'#64748b',background:'none',border:'none',cursor:'pointer'}}>Clear</button>
                  </div>
                </>
              )}
            </div>

            <button onClick={generate} disabled={selected.length<1||loading}
              style={{width:'100%',background:selected.length>=1&&!loading?'linear-gradient(135deg,#d4a853,#b8882f)':'#334155',border:'none',color:selected.length>=1&&!loading?'#0f172a':'#64748b',padding:'15px',borderRadius:'13px',fontWeight:'700',fontSize:'16px',cursor:selected.length>=1&&!loading?'pointer':'not-allowed',boxShadow:selected.length>=1?'0 4px 20px rgba(212,168,83,0.3)':'none'}}>
              🎬 Generate ({selected.length} frames)
            </button>
          </>
        )}

        {/* ── LOADING ── */}
        {step==='loading' && (
          <div style={{textAlign:'center',padding:'28px 0'}}>
            <div style={{fontSize:'44px',marginBottom:'14px'}}>🛰️</div>
            <p style={{color:'#d4a853',fontSize:'16px',fontWeight:'700',margin:'0 0 16px'}}>Fetching satellite imagery...</p>
            <div style={{background:'#1e293b',borderRadius:'8px',height:'10px',overflow:'hidden',marginBottom:'10px'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#d4a853,#f59e0b)',width:`${progress.tot?progress.cur/progress.tot*100:0}%`,transition:'width 0.4s ease',borderRadius:'8px'}}/>
            </div>
            <p style={{color:'#64748b',fontSize:'13px',margin:'0 0 16px'}}>Frame {progress.cur} of {progress.tot} — checking imagery coverage...</p>
            <button onClick={()=>{abortRef.current=true;setStep('setup')}}
              style={{background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>
              Cancel
            </button>
          </div>
        )}

        {/* ── NO DATA ── */}
        {step==='nodata' && (
          <div style={{textAlign:'center',padding:'28px 0'}}>
            <div style={{fontSize:'44px',marginBottom:'14px'}}>📭</div>
            <p style={{color:'#f8fafc',fontSize:'16px',fontWeight:'700',margin:'0 0 8px'}}>No imagery found for this area</p>
            <p style={{color:'#64748b',fontSize:'13px',margin:'0 0 20px',lineHeight:'1.6'}}>
              Esri Wayback may not have historical coverage here.<br/>Try a lower zoom level or a different location.
            </p>
            <button onClick={()=>setStep('setup')}
              style={{background:'#d4a853',border:'none',color:'#0f172a',padding:'12px 24px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'15px'}}>
              ← Try Again
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step==='done' && frames.length>0 && (
          <>
            <div style={{position:'relative',marginBottom:'12px',borderRadius:'12px',overflow:'hidden',background:'#111'}}>
              <img src={frames[fi].dataUrl} alt={frames[fi].date} style={{width:'100%',display:'block',borderRadius:'12px'}}/>
              <div style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,0,0,0.7)',borderRadius:'6px',padding:'3px 9px',fontSize:'11px',color:'#d4a853',fontWeight:'700'}}>
                ▶ {fi+1}/{frames.length}
              </div>
            </div>

            {/* Scrubber */}
            <div style={{display:'flex',gap:'4px',marginBottom:'12px',overflowX:'auto',paddingBottom:'4px'}}>
              {frames.map((f,i)=>(
                <button key={i} onClick={()=>{clearInterval(animRef.current);setFi(i)}}
                  style={{flex:'0 0 auto',padding:'5px 8px',border:`2px solid ${i===fi?'#d4a853':'#334155'}`,background:i===fi?'#d4a853':'#1e293b',color:i===fi?'#0f172a':'#94a3b8',borderRadius:'7px',cursor:'pointer',fontSize:'10px',fontWeight:'600',whiteSpace:'nowrap'}}>
                  {f.date}
                </button>
              ))}
            </div>

            {/* Speed */}
            <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
              {[['⏸',0],['🐢',1600],['▶',900],['⚡',400]].map(([ic,ms])=>(
                <button key={ms} onClick={()=>{
                  clearInterval(animRef.current)
                  if(ms>0){let i=fi;animRef.current=setInterval(()=>{i=(i+1)%frames.length;setFi(i)},ms)}
                }}
                  style={{flex:1,padding:'10px 4px',background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',borderRadius:'8px',cursor:'pointer',fontSize:'18px',textAlign:'center'}}>
                  {ic}
                </button>
              ))}
            </div>

            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>{clearInterval(animRef.current);setStep('setup')}}
                style={{flex:1,background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'13px',borderRadius:'10px',cursor:'pointer',fontSize:'14px'}}>
                ← Back
              </button>
              <button onClick={download}
                style={{flex:2,background:'linear-gradient(135deg,#d4a853,#b8882f)',border:'none',color:'#0f172a',padding:'13px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'15px'}}>
                📥 Download Video
              </button>
            </div>
            <p style={{color:'#475569',fontSize:'11px',textAlign:'center',marginTop:'10px'}}>
              {frames.length} frames with confirmed imagery · WebM format
            </p>
          </>
        )}

      </div>
    </div>
  )
}
