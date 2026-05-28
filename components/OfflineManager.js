import { useState, useEffect, useRef } from 'react'

const ZOOM_LEVELS = [
  { label: 'Μικρή (~1km²)',  zoom_min:14, zoom_max:16, approx:  80 },
  { label: 'Μεσαία (~4km²)', zoom_min:13, zoom_max:16, approx: 200 },
  { label: 'Μεγάλη (~10km²)',zoom_min:12, zoom_max:16, approx: 500 },
]

export default function OfflineManager({ currentPos, lang }) {
  const [swReady, setSwReady]       = useState(false)
  const [swError, setSwError]       = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress]     = useState(null)  // { done, total, percent }
  const [done, setDone]             = useState(null)  // { cacheSize, errors }
  const [area, setArea]             = useState(0)     // index into ZOOM_LEVELS
  const [cacheInfo, setCacheInfo]   = useState(null)  // { count, size }

  // Register Service Worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setSwError('Service Workers not supported on this browser')
      return
    }
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        setSwReady(true)
        // Listen for SW messages
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data.type === 'DOWNLOAD_PROGRESS') {
            setProgress({ done: e.data.done, total: e.data.total, percent: e.data.percent })
          }
          if (e.data.type === 'DOWNLOAD_DONE') {
            setDownloading(false)
            setDone({ cacheSize: e.data.cacheSize, errors: e.data.errors })
            setProgress(null)
            updateCacheInfo()
          }
        })
      })
      .catch(err => setSwError(err.message))
  }, [])

  const updateCacheInfo = async () => {
    try {
      const cache = await caches.open('fielddetective-tiles-map')
      const keys  = await cache.keys()
      setCacheInfo({ count: keys.length })
    } catch {}
  }

  useEffect(() => { updateCacheInfo() }, [swReady])

  const downloadArea = async () => {
    if (!swReady || !currentPos) return
    const sw = navigator.serviceWorker.controller
    if (!sw) {
      // Force SW to take control
      await navigator.serviceWorker.ready
      window.location.reload()
      return
    }
    setDownloading(true)
    setDone(null)
    setProgress({ done:0, total:1, percent:0 })
    const cfg = ZOOM_LEVELS[area]
    sw.postMessage({
      type:     'DOWNLOAD_AREA',
      lat:       currentPos.lat,
      lng:       currentPos.lng,
      zoom_min:  cfg.zoom_min,
      zoom_max:  cfg.zoom_max,
    })
  }

  const clearCache = async () => {
    try {
      await caches.delete('fielddetective-tiles-map')
      setCacheInfo({ count: 0 })
      setDone(null)
    } catch {}
  }

  const el = lang === 'el'

  return (
    <div>
      {/* SW Status */}
      {swError && (
        <div style={{background:'#ef444422',border:'1px solid #ef4444',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'13px',color:'#fca5a5'}}>
          ⚠️ {swError}
        </div>
      )}

      {!swError && !swReady && (
        <div style={{color:'#64748b',fontSize:'13px',marginBottom:'12px'}}>⏳ {el?'Εκκίνηση...':'Starting...'}</div>
      )}

      {/* Cache info */}
      {cacheInfo && cacheInfo.count > 0 && (
        <div style={{background:'rgba(34,197,94,0.08)',border:'1px solid #22c55e',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{color:'#22c55e',fontSize:'13px',fontWeight:'600'}}>✅ {el?'Αποθηκευμένοι χάρτες':'Cached maps'}</div>
            <div style={{color:'#64748b',fontSize:'12px',marginTop:'2px'}}>{cacheInfo.count} {el?'tiles':'tiles'}</div>
          </div>
          <button onClick={clearCache}
            style={{background:'none',border:'1px solid #ef4444',color:'#ef4444',borderRadius:'8px',padding:'6px 12px',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>
            {el?'Καθαρισμός':'Clear'}
          </button>
        </div>
      )}

      {/* No GPS warning */}
      {!currentPos && (
        <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid #f59e0b',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',fontSize:'13px',color:'#fbbf24'}}>
          📍 {el?'Χρειάζεται GPS για να επιλέξεις περιοχή':'GPS required to select area'}
        </div>
      )}

      {/* Area selector */}
      {swReady && currentPos && !downloading && (
        <>
          <div style={{color:'#64748b',fontSize:'12px',marginBottom:'8px'}}>
            {el?'Μέγεθος περιοχής':'Area size'} ({el?'γύρω από τη θέση σου':'around your position'})
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'14px'}}>
            {ZOOM_LEVELS.map((z,i)=>(
              <button key={i} onClick={()=>setArea(i)}
                style={{background:area===i?'rgba(212,168,83,0.12)':'#1e293b',border:`2px solid ${area===i?'#d4a853':'#334155'}`,borderRadius:'10px',padding:'12px 14px',cursor:'pointer',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{color:area===i?'#d4a853':'#f8fafc',fontSize:'14px',fontWeight:'600'}}>{z.label}</div>
                  <div style={{color:'#64748b',fontSize:'12px',marginTop:'2px'}}>~{z.approx} tiles</div>
                </div>
                {area===i && <span style={{color:'#d4a853',fontSize:'18px'}}>✓</span>}
              </button>
            ))}
          </div>
          <button onClick={downloadArea}
            style={{width:'100%',background:'linear-gradient(135deg,#d4a853,#b8882f)',border:'none',color:'#0f172a',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'15px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
            📥 {el?'Κατέβασε χάρτες':'Download maps'}
          </button>
        </>
      )}

      {/* Progress */}
      {downloading && progress && (
        <div style={{marginTop:'8px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{color:'#d4a853',fontSize:'14px',fontWeight:'700'}}>
              📥 {el?'Λήψη...':'Downloading...'} {progress.percent}%
            </span>
            <span style={{color:'#64748b',fontSize:'12px'}}>{progress.done}/{progress.total}</span>
          </div>
          <div style={{background:'#1e293b',borderRadius:'8px',height:'10px',overflow:'hidden'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#d4a853,#f59e0b)',width:`${progress.percent}%`,transition:'width 0.3s ease',borderRadius:'8px'}}/>
          </div>
          <div style={{color:'#64748b',fontSize:'11px',marginTop:'6px',textAlign:'center'}}>
            {el?'Μην κλείσεις την εφαρμογή':'Keep the app open'}
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div style={{background:'rgba(34,197,94,0.08)',border:'1px solid #22c55e',borderRadius:'10px',padding:'12px 14px',marginTop:'8px',textAlign:'center'}}>
          <div style={{fontSize:'28px',marginBottom:'6px'}}>✅</div>
          <div style={{color:'#22c55e',fontSize:'14px',fontWeight:'700',marginBottom:'4px'}}>
            {el?'Ολοκληρώθηκε!':'Download complete!'}
          </div>
          <div style={{color:'#64748b',fontSize:'12px'}}>
            {done.cacheSize} {el?'tiles αποθηκεύτηκαν':'tiles cached'}
            {done.errors > 0 && ` · ${done.errors} ${el?'σφάλματα':'errors'}`}
          </div>
          <div style={{color:'#94a3b8',fontSize:'12px',marginTop:'6px'}}>
            {el?'Ο χάρτης δουλεύει τώρα χωρίς σήμα!':'Map works offline now!'}
          </div>
        </div>
      )}
    </div>
  )
}
