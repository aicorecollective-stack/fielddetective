import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MOCK_FINDS, MOCK_SESSIONS, MAP_LAYERS, CATEGORIES, RARITY } from './constants'
import { getR, isAnc, fmtTime, haverD, callAI, exportGPX } from './helpers'

const MapComponent = dynamic(() => import('./Map'), { ssr: false })
const Timelapse   = dynamic(() => import('./Timelapse'), { ssr: false })

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  el: {
    appName:"FieldDetective",
    nav_finds:"Ευρήματα", nav_map:"Χάρτης", nav_stats:"Στατιστικά", nav_sessions:"Ιστορικό", nav_privacy:"Απόρρητο",
    map_start:"Έναρξη Καταγραφής", map_pause:"Παύση", map_resume:"Συνέχεια", map_stop:"Τέλος",
    map_pin:"📍 Πινέζα Εύρηματος", map_pin_active:"● Επιλογή σημείου...",
    map_tap:"Πάτα στον χάρτη για πινέζα", map_cancel:"Ακύρωση",
    finds_title:"Ευρήματα", finds_search:"Αναζήτηση...", finds_empty:"Δεν βρέθηκαν ευρήματα",
    add_title:"Νέο Εύρημα", add_name:"Όνομα *", add_name_ph:"π.χ. Roman Denarius",
    add_depth:"Βάθος (cm)", add_cat:"Κατηγορία", add_notes:"Σημειώσεις", add_rar:"Σπανιότητα",
    add_save:"Αποθήκευση 📍", add_ai:"🤖 AI Αναγνώριση", add_saved:"Αποθηκεύτηκε!",
    ai_analyzing:"AI Ανάλυση...", anc_title:"⚠️ Πιθανό Αρχαίο Εύρημα",
    anc_law:"Ν.3028/2002: υποχρεούστε να δηλώσετε το εύρημα εντός 3 ημερών.",
    anc_ministry:"📞 Υπ. Πολιτισμού: 213 214 9805", anc_ok:"Κατανοητό ✓",
    stats_title:"Στατιστικά", sess_title:"Συνεδρίες", sess_back:"Πίσω",
    sess_gpx:"📤 GPX Export", priv_title:"Απόρρητο",
    rar:["Κοινό","Ασυνήθιστο","Σπάνιο","Επικό","Θρυλικό"],
    gdpr_accept:"✓ Αποδοχή & Συνέχεια", gdpr_decline:"Απόρριψη",
    sc_title:"Συνεδρία Ολοκληρώθηκε! 🏁",
  },
  en: {
    appName:"FieldDetective",
    nav_finds:"Finds", nav_map:"Map", nav_stats:"Stats", nav_sessions:"History", nav_privacy:"Privacy",
    map_start:"Start Recording", map_pause:"Pause", map_resume:"Resume", map_stop:"Stop",
    map_pin:"📍 Pin a Find", map_pin_active:"● Select location...",
    map_tap:"Tap on map to drop a pin", map_cancel:"Cancel",
    finds_title:"Finds", finds_search:"Search...", finds_empty:"No finds",
    add_title:"New Find", add_name:"Find Name *", add_name_ph:"e.g. Roman Denarius",
    add_depth:"Depth (cm)", add_cat:"Category", add_notes:"Notes", add_rar:"Rarity",
    add_save:"Save Find 📍", add_ai:"🤖 AI Recognition", add_saved:"Saved!",
    ai_analyzing:"AI Analysis...", anc_title:"⚠️ Possible Ancient Find",
    anc_law:"Law 3028/2002: you must report this find within 3 days.",
    anc_ministry:"📞 Ministry of Culture: 213 214 9805", anc_ok:"Understood ✓",
    stats_title:"Statistics", sess_title:"Sessions", sess_back:"Back",
    sess_gpx:"📤 GPX Export", priv_title:"Privacy",
    rar:["Common","Uncommon","Rare","Epic","Legendary"],
    gdpr_accept:"✓ Accept & Continue", gdpr_decline:"Decline",
    sc_title:"Session Complete! 🏁",
  }
}

// ─── ICONS (inline SVG, zero dependencies) ───────────────────────────────────
const Icon = ({ d, size=20, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)
const HomeIco  = () => <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"/>
const MapIco   = () => <Icon d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z M9 4v13 M15 7v13"/>
const BarIco   = () => <Icon d="M18 20V10 M12 20V4 M6 20v-6"/>
const CalIco   = () => <Icon d="M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
const ShieldIco= () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
const PlusIco  = () => <Icon d="M12 5v14 M5 12h14"/>
const TrashIco = () => <Icon d="M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6"/>
const PlayIco  = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
const PauseIco = () => <Icon d="M6 4h4v16H6z M14 4h4v16h-4z"/>
const StopIco  = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
const ZapIco   = () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
const PinIco   = () => <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
const ArrowIco = () => <Icon d="M19 12H5 M12 19l-7-7 7-7"/>
const GlobeIco = () => <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>
const LayersIco= () => <Icon d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5"/>
const NavIco   = () => <Icon d="M3 11l19-9-9 19-2-8-8-2z"/>

// ─── GDPR ─────────────────────────────────────────────────────────────────────
function GDPRModal({ lang, onAccept }) {
  const t = T[lang]
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.95)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:'20px',padding:'28px',maxWidth:'380px',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center'}}><ShieldIco/></div>
          <div><h3 style={{color:'#f8fafc',fontSize:'18px',fontFamily:"'Playfair Display',serif",margin:0}}>Privacy & Data</h3><p style={{color:'#64748b',fontSize:'12px',margin:0}}>GDPR Compliance</p></div>
        </div>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'14px',marginBottom:'16px',fontSize:'13px',color:'#94a3b8',lineHeight:'1.7'}}>
          <p style={{margin:'0 0 6px'}}>📍 <strong style={{color:'#e2e8f0'}}>GPS</strong> — only during recording</p>
          <p style={{margin:'0 0 6px'}}>🖼️ <strong style={{color:'#e2e8f0'}}>Photos</strong> — stored locally</p>
          <p style={{margin:'0 0 6px'}}>🤖 <strong style={{color:'#e2e8f0'}}>AI</strong> — Anthropic API for analysis only</p>
          <p style={{margin:'10px 0 0',fontSize:'12px',color:'#64748b'}}>No data sold or shared. Delete anytime. GDPR (EU 2016/679)</p>
        </div>
        <button onClick={onAccept} style={{width:'100%',background:'#d4a853',border:'none',color:'#0f172a',padding:'14px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'15px'}}>{t.gdpr_accept}</button>
      </div>
    </div>
  )
}

// ─── ANCIENT ALERT ────────────────────────────────────────────────────────────
function AncientAlert({ find, lang, onClose }) {
  const t = T[lang]
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#0f172a',border:'2px solid #f59e0b',borderRadius:'20px',padding:'24px',maxWidth:'380px',width:'100%'}}>
        <h3 style={{color:'#f59e0b',fontSize:'17px',fontFamily:"'Playfair Display',serif",margin:'0 0 12px'}}>{t.anc_title}</h3>
        <p style={{color:'#94a3b8',fontSize:'13px',margin:'0 0 6px'}}>"{find.name}"</p>
        <div style={{background:'#1e293b',borderRadius:'12px',padding:'14px',margin:'12px 0',fontSize:'13px',color:'#94a3b8',lineHeight:'1.8'}}>
          <p style={{margin:'0 0 6px'}}>{t.anc_law}</p>
          <p style={{margin:0,color:'#d4a853'}}>{t.anc_ministry}</p>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <a href="tel:+302132149805" style={{flex:1,background:'#1e293b',border:'1px solid #334155',color:'#d4a853',padding:'12px',borderRadius:'10px',fontSize:'13px',textAlign:'center',textDecoration:'none'}}>📞 Call</a>
          <button onClick={onClose} style={{flex:2,background:'#f59e0b',border:'none',color:'#0f172a',padding:'12px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>{t.anc_ok}</button>
        </div>
      </div>
    </div>
  )
}

// ─── ADD FIND MODAL ───────────────────────────────────────────────────────────
function AddFindModal({ lang, sessions, currentPos, onClose, onAdd }) {
  const t = T[lang]
  const [form, setForm] = useState({ name:'', category:'Coin', depth:'', notes:'', rarity:1, sessionId:sessions[0]?.id||1, aiResult:'' })
  const [aiLoading, setAiLoading] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef(null)

  const analyzePhoto = async (b64) => {
    setAiLoading(true)
    try {
      const r = await callAI(`Expert archaeologist. Metal detector find:\n1. Object name (4 words max)\n2. Period\n3. Material\n4. Rarity 1-5\n5. Ancient? yes/no\nBe concise.`, b64)
      const nm = r.split('\n')[0].replace(/^[\d\.\:\-\*\s]+/,'').trim().substring(0,45)
      if(nm) setForm(f=>({...f, name:nm, aiResult:r}))
      const rm = r.match(/rarity.*?([1-5])/i)
      if(rm) setForm(f=>({...f, rarity:parseInt(rm[1])}))
    } catch(e) {}
    setAiLoading(false)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev) => analyzePhoto(ev.target.result.split(',')[1])
    reader.readAsDataURL(file)
  }

  const save = () => {
    if(!form.name) return
    onAdd({ ...form, id:Date.now(), depth:parseInt(form.depth)||0,
      lat: currentPos?.lat||(37.984+(Math.random()-0.5)*0.01),
      lng: currentPos?.lng||(23.728+(Math.random()-0.5)*0.01),
      date: new Date().toISOString().split('T')[0]
    })
    setDone(true); setTimeout(onClose, 600)
  }

  if(done) return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'60px'}}>✅</div>
        <p style={{color:'#f8fafc',fontSize:'18px',marginTop:'16px',fontFamily:"'Playfair Display',serif"}}>{t.add_saved}</p>
      </div>
    </div>
  )

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:300,display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'#0f172a',width:'100%',borderRadius:'20px 20px 0 0',padding:'24px',maxHeight:'92vh',overflowY:'auto',border:'1px solid #1e293b'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
          <h3 style={{color:'#f8fafc',fontSize:'18px',fontFamily:"'Playfair Display',serif",margin:0}}>{t.add_title}</h3>
          <button onClick={onClose} style={{background:'#1e293b',border:'none',color:'#94a3b8',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',fontSize:'18px'}}>×</button>
        </div>
        {currentPos && <div style={{background:'#1e293b',borderRadius:'10px',padding:'8px 14px',marginBottom:'14px',fontSize:'12px',color:'#22c55e'}}>📍 GPS: {currentPos.lat.toFixed(5)}, {currentPos.lng.toFixed(5)}</div>}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:'none'}}/>
        <button onClick={()=>fileRef.current.click()} style={{width:'100%',background:'linear-gradient(135deg,#1e293b,#0f172a)',border:'1px solid #d4a853',color:'#d4a853',padding:'13px',borderRadius:'12px',fontSize:'14px',fontWeight:'600',cursor:'pointer',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
          {aiLoading ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</span> {t.ai_analyzing}</> : t.add_ai}
        </button>
        {form.aiResult && <div style={{background:'#1e293b',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:'#94a3b8',borderLeft:'3px solid #d4a853'}}>🤖 {form.aiResult.substring(0,120)}...</div>}
        {[{lbl:t.add_name,ph:t.add_name_ph,k:'name',tp:'text'},{lbl:t.add_depth,ph:'e.g. 15',k:'depth',tp:'number'},{lbl:t.add_notes,ph:'...',k:'notes',tp:'text'}].map(({lbl,ph,k,tp})=>(
          <div key={k} style={{marginBottom:'12px'}}>
            <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{lbl}</label>
            <input type={tp} placeholder={ph} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}
              style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px 13px',color:'#f8fafc',fontSize:'14px',boxSizing:'border-box',outline:'none'}}/>
          </div>
        ))}
        <div style={{marginBottom:'12px'}}>
          <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{t.add_cat}</label>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px',color:'#f8fafc',fontSize:'14px',outline:'none'}}>
            {CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{marginBottom:'20px'}}>
          <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'7px'}}>{t.add_rar}</label>
          <div style={{display:'flex',gap:'8px'}}>
            {RARITY.map(rv=>(
              <button key={rv.score} onClick={()=>setForm(f=>({...f,rarity:rv.score}))}
                style={{flex:1,padding:'10px 2px',borderRadius:'9px',border:`2px solid ${form.rarity===rv.score?rv.color:'#334155'}`,background:form.rarity===rv.score?rv.color+'22':'transparent',cursor:'pointer',fontSize:'20px'}}>
                {rv.emoji}
              </button>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:'5px',fontSize:'12px',color:getR(form.rarity).color}}>{T[lang].rar[form.rarity-1]}</div>
        </div>
        <button onClick={save} style={{width:'100%',background:'#d4a853',border:'none',color:'#0f172a',padding:'15px',borderRadius:'12px',fontWeight:'700',fontSize:'16px',cursor:'pointer'}}>{t.add_save}</button>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('el')
  const [gdpr, setGdpr] = useState(false)
  const [tab, setTab] = useState('map')
  const [finds, setFinds] = useState(MOCK_FINDS)
  const [sessions, setSessions] = useState(MOCK_SESSIONS)
  const [ancAlert, setAncAlert] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [layerIdx, setLayerIdx] = useState(0)
  const [tapMode, setTapMode] = useState(false)
  const [tappedLoc, setTappedLoc] = useState(null)
  const [search, setSearch] = useState('')
  const [sessState, setSessState] = useState('idle')
  const [showTimelapse, setShowTimelapse] = useState(false)
  const [timelapseCenter, setTimelapseCenter] = useState(null)
  const [pickingArea, setPickingArea] = useState(false)
  const mapCenterRef = useRef({lat:37.9838, lng:23.7275})
  const mapGetCenter = useRef(null)  // set by MapComponent
  const [sessTime, setSessTime] = useState(0)
  const [curPos, setCurPos] = useState(null)
  const [route, setRoute] = useState([])
  const [sessFinds, setSessFinds] = useState(0)
  const [sessDone, setSessDone] = useState(null)
  const watchRef = useRef(null)
  const timerRef = useRef(null)
  const t = T[lang]

  const startGPS = () => {
    if(!navigator.geolocation) return
    watchRef.current = navigator.geolocation.watchPosition(
      pos => { const p={lat:pos.coords.latitude,lng:pos.coords.longitude}; setCurPos(p); setRoute(r=>[...r,p]) },
      () => {},
      { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }
    )
  }
  const stopGPS = () => { if(watchRef.current!==null){ navigator.geolocation.clearWatch(watchRef.current); watchRef.current=null } }

  const handleSession = (action) => {
    if(action==='start'){ setSessState('recording'); setSessTime(0); setRoute([]); setSessFinds(0); startGPS(); timerRef.current=setInterval(()=>setSessTime(x=>x+1),1000) }
    else if(action==='pause'){ setSessState('paused'); stopGPS(); clearInterval(timerRef.current) }
    else if(action==='resume'){ setSessState('recording'); startGPS(); timerRef.current=setInterval(()=>setSessTime(x=>x+1),1000) }
    else if(action==='stop'){
      setSessState('idle'); stopGPS(); clearInterval(timerRef.current)
      const dist = route.length>1?(route.reduce((a,p,i)=>i===0?a:a+haverD(route[i-1],p),0)/1000).toFixed(2):'0.00'
      const ns = { id:Date.now(), name:`Session ${sessions.length+1}`, date:new Date().toISOString().split('T')[0], duration:Math.floor(sessTime/60), distance:parseFloat(dist), finds:sessFinds, weather:'Live', location:'GPS', route }
      setSessions(p=>[ns,...p]); setSessDone({...ns,elapsed:sessTime}); setRoute([])
    }
  }
  useEffect(()=>()=>{ stopGPS(); clearInterval(timerRef.current) },[])

  const addFind = (f) => {
    setFinds(p=>[f,...p]); setSessFinds(c=>c+1)
    if(isAnc(f)) setTimeout(()=>setAncAlert(f), 700)
  }

  const handleMapClick = (latlng) => {
    if(!tapMode) return
    setTappedLoc(latlng); setTapMode(false)
    setShowAdd(true)
  }

  const dist = route.length>1?(route.reduce((a,p,i)=>i===0?a:a+haverD(route[i-1],p),0)/1000).toFixed(2):'0.00'
  const filtered = finds.filter(f=>f.name.toLowerCase().includes(search.toLowerCase()))

  const TABS = [
    { id:'home', icon:<HomeIco/>,  lbl:t.nav_finds },
    { id:'map',  icon:<MapIco/>,   lbl:t.nav_map   },
    { id:'stats',icon:<BarIco/>,   lbl:t.nav_stats  },
    { id:'sessions',icon:<CalIco/>,lbl:t.nav_sessions},
    { id:'privacy',icon:<ShieldIco/>,lbl:t.nav_privacy},
  ]

  if(!gdpr) return <GDPRModal lang={lang} onAccept={()=>setGdpr(true)}/>

  return (
    <div style={{background:'#020617',minHeight:'100vh',maxWidth:'430px',margin:'0 auto',display:'flex',flexDirection:'column',position:'relative'}}>
      <style>{`
        *{box-sizing:border-box} input,select{outline:none;font-family:'DM Sans',sans-serif} button{font-family:'DM Sans',sans-serif} ::-webkit-scrollbar{width:0}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulse-ring{0%{transform:scale(0.5);opacity:1}100%{transform:scale(2.2);opacity:0}}
      `}</style>



      {/* Modals */}
      {ancAlert && <AncientAlert find={ancAlert} lang={lang} onClose={()=>setAncAlert(null)}/>}
      {showAdd && <AddFindModal lang={lang} sessions={sessions} currentPos={tappedLoc||curPos} onClose={()=>{setShowAdd(false);setTappedLoc(null)}} onAdd={addFind}/>}
      {sessDone && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'#0f172a',border:'1px solid #d4a853',borderRadius:'20px',padding:'28px',maxWidth:'360px',width:'100%',textAlign:'center'}}>
            <div style={{fontSize:'48px',marginBottom:'14px'}}>🏁</div>
            <h3 style={{color:'#d4a853',fontSize:'20px',fontFamily:"'Playfair Display',serif",margin:'0 0 6px'}}>{t.sc_title}</h3>
            <p style={{color:'#64748b',marginBottom:'20px'}}>{sessDone.name}</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
              {[['⏱️',fmtTime(sessDone.elapsed)],['🗺️',`${sessDone.distance} km`],['📍',sessDone.finds],['✓','Saved']].map(([ic,v])=>(
                <div key={ic} style={{background:'#1e293b',borderRadius:'10px',padding:'12px'}}><div style={{color:'#f8fafc',fontSize:'16px',fontWeight:'700'}}>{v}</div><div style={{color:'#64748b',fontSize:'11px'}}>{ic}</div></div>
              ))}
            </div>
            <button onClick={()=>setSessDone(null)} style={{width:'100%',background:'#d4a853',border:'none',color:'#0f172a',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'16px',cursor:'pointer'}}>🎉</button>
          </div>
        </div>
      )}

      {/* Crosshair area picker overlay */}
      {pickingArea && tab==='map' && (
        <div style={{position:'fixed',inset:0,zIndex:9000,pointerEvents:'none'}}>
          {/* Dim overlay */}
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.25)'}}/>
          {/* Crosshair */}
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none'}}>
            <div style={{fontSize:'48px',lineHeight:1,filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.8))'}}>⊕</div>
            <div style={{color:'white',fontSize:'13px',marginTop:'8px',background:'rgba(0,0,0,0.6)',padding:'4px 12px',borderRadius:'10px',whiteSpace:'nowrap'}}>
              {lang==='el'?'Κέντρασε τον χάρτη στην περιοχή σου':'Pan map to your area'}
            </div>
          </div>
          {/* Buttons */}
          <div style={{position:'absolute',bottom:'90px',left:0,right:0,display:'flex',gap:'12px',padding:'0 20px',pointerEvents:'all'}}>
            <button onClick={()=>setPickingArea(false)}
              style={{flex:1,background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'15px',cursor:'pointer'}}>
              ✕ {lang==='el'?'Ακύρωση':'Cancel'}
            </button>
            <button onClick={(e)=>{
              e.stopPropagation()
              const c = mapGetCenter.current
                ? mapGetCenter.current()
                : mapCenterRef.current
              setTimelapseCenter({lat: c.lat, lng: c.lng})
              setPickingArea(false)
              setTimeout(()=>setShowTimelapse(true), 50)
            }}
              style={{flex:2,background:'linear-gradient(135deg,#6366f1,#4f46e5)',border:'none',color:'white',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'15px',cursor:'pointer',boxShadow:'0 4px 16px rgba(99,102,241,0.4)'}}>
              🎬 {lang==='el'?'Επιβεβαίωση Περιοχής':'Confirm Area'}
            </button>
          </div>
        </div>
      )}

      {/* Timelapse modal */}
      {showTimelapse && timelapseCenter && (
        <Timelapse center={timelapseCenter} onClose={()=>setShowTimelapse(false)}/>
      )}

      {/* Top bar */}
      <div style={{background:'#020617',padding:'10px 20px 8px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #1e293b',flexShrink:0}}>
        <div style={{color:'#d4a853',fontSize:'16px',fontWeight:'800',fontFamily:"'Playfair Display',serif",letterSpacing:'0.08em'}}>
          🕵️ FieldDetective
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          {sessState==='recording' && (
            <div style={{display:'flex',alignItems:'center',gap:'5px',background:'#ef444422',border:'1px solid #ef4444',borderRadius:'20px',padding:'3px 10px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#ef4444',animation:'pulse 1s ease infinite'}}/>
              <span style={{color:'#ef4444',fontSize:'11px',fontWeight:'700'}}>REC {fmtTime(sessTime)}</span>
            </div>
          )}
          <button onClick={()=>setLang(l=>l==='el'?'en':'el')}
            style={{display:'flex',alignItems:'center',gap:'5px',background:'#1e293b',border:'1px solid #334155',borderRadius:'20px',padding:'4px 11px',cursor:'pointer',color:'#d4a853',fontSize:'12px',fontWeight:'700'}}>
            <GlobeIco/> {lang==='el'?'🇬🇷 EL':'🇬🇧 EN'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:'auto',paddingBottom:'68px'}}>

        {/* MAP TAB */}
        {tab==='map' && (
          <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 130px)'}}>
            {/* Layer tabs */}
            <div style={{display:'flex',background:'#0f172a',borderBottom:'1px solid #1e293b',overflowX:'auto',flexShrink:0}}>
              {MAP_LAYERS.map((l,idx)=>(
                <button key={l.k} onClick={()=>setLayerIdx(idx)}
                  style={{flex:'0 0 auto',padding:'8px 10px',border:'none',borderBottom:`3px solid ${layerIdx===idx?'#d4a853':'transparent'}`,background:'transparent',color:layerIdx===idx?'#d4a853':'#475569',fontSize:'10px',fontWeight:layerIdx===idx?'700':'400',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',minWidth:'60px'}}>
                  <span style={{fontSize:'16px'}}>{l.emoji}</span>
                  {l.label[lang]}
                </button>
              ))}
            </div>
            {/* Map */}
            <div style={{flex:1,position:'relative'}}>
              <MapComponent
                finds={finds}
                currentPos={curPos}
                routePoints={route}
                layerIdx={layerIdx}
                onMapClick={handleMapClick}
                tapMode={tapMode}
                pickingArea={pickingArea}
                mapCenterRef={mapCenterRef}
                mapGetCenterRef={mapGetCenter}
              />
              {/* Tap banner */}
              {tapMode && (
                <div style={{position:'absolute',top:0,left:0,right:0,zIndex:9999,background:'rgba(212,168,83,0.95)',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{color:'#0f172a',fontSize:'14px',fontWeight:'700'}}>📍 {t.map_tap}</span>
                  <button onClick={()=>setTapMode(false)} style={{background:'rgba(0,0,0,0.2)',border:'none',color:'#0f172a',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px'}}>{t.map_cancel}</button>
                </div>
              )}
              {/* GPS button */}
              {curPos && (
                <button style={{position:'absolute',top:'10px',right:'10px',zIndex:999,background:'rgba(15,23,42,0.88)',border:'1px solid #334155',color:'#3b82f6',borderRadius:'8px',padding:'7px 10px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',gap:'5px'}}>
                  <NavIco/> GPS
                </button>
              )}
              {/* Session HUD */}
              {sessState!=='idle' && (
                <div style={{position:'absolute',top:'10px',left:'10px',zIndex:999,background:'rgba(15,23,42,0.92)',borderRadius:'10px',padding:'8px 12px',border:'1px solid #334155'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px'}}>
                    <div style={{width:'7px',height:'7px',borderRadius:'50%',background:sessState==='recording'?'#ef4444':'#f59e0b',animation:sessState==='recording'?'pulse 1.5s infinite':'none'}}/>
                    <span style={{color:sessState==='recording'?'#ef4444':'#f59e0b',fontSize:'11px',fontWeight:'700'}}>{sessState==='recording'?'● REC':'⏸'}</span>
                  </div>
                  <div style={{color:'#f8fafc',fontSize:'16px',fontWeight:'700',fontVariantNumeric:'tabular-nums'}}>{fmtTime(sessTime)}</div>
                  <div style={{color:'#64748b',fontSize:'10px'}}>{dist} km</div>
                </div>
              )}
            </div>
            {/* Controls */}
            <div style={{background:'#0f172a',borderTop:'1px solid #1e293b',padding:'12px 14px 16px',flexShrink:0}}>
              {sessState==='idle' ? (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  <button onClick={()=>handleSession('start')}
                    style={{width:'100%',background:'linear-gradient(135deg,#d4a853,#b8882f)',border:'none',color:'#0f172a',padding:'15px',borderRadius:'14px',fontWeight:'700',fontSize:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 4px 20px rgba(212,168,83,0.35)'}}>
                    <PlayIco/>{t.map_start}
                  </button>
                  <button onClick={()=>setPickingArea(true)}
                    style={{width:'100%',background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'12px',borderRadius:'12px',fontWeight:'600',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                    🎬 {lang==='el'?'Timelapse Περιοχής':'Area Timelapse'}
                  </button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {sessState==='recording' && (
                    <button onClick={()=>setTapMode(x=>!x)}
                      style={{width:'100%',background:tapMode?'rgba(212,168,83,0.15)':'linear-gradient(135deg,#1e3a5f,#0f2340)',border:`2px solid ${tapMode?'#d4a853':'#3b82f6'}`,color:tapMode?'#d4a853':'#60a5fa',padding:'12px',borderRadius:'12px',fontWeight:'700',fontSize:'15px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
                      <PinIco/>{tapMode?t.map_pin_active:t.map_pin}
                    </button>
                  )}
                  <div style={{display:'flex',gap:'8px'}}>
                    {sessState==='recording' ? (
                      <button onClick={()=>handleSession('pause')} style={{flex:1,background:'#1e293b',border:'1px solid #f59e0b',color:'#f59e0b',padding:'12px',borderRadius:'10px',fontWeight:'700',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><PauseIco/>{t.map_pause}</button>
                    ) : (
                      <button onClick={()=>handleSession('resume')} style={{flex:1,background:'#1e293b',border:'1px solid #22c55e',color:'#22c55e',padding:'12px',borderRadius:'10px',fontWeight:'700',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><PlayIco/>{t.map_resume}</button>
                    )}
                    <button onClick={()=>handleSession('stop')} style={{flex:1,background:'#ef4444',border:'none',color:'white',padding:'12px',borderRadius:'10px',fontWeight:'700',fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><StopIco/>{t.map_stop}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FINDS TAB */}
        {tab==='home' && (
          <div style={{animation:'fadeUp 0.25s ease'}}>
            <div style={{padding:'18px 20px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h2 style={{color:'#f8fafc',fontSize:'22px',fontFamily:"'Playfair Display',serif",margin:0}}>{t.finds_title}</h2>
              <div style={{color:'#d4a853',fontSize:'24px',fontWeight:'700'}}>{finds.reduce((a,f)=>a+f.rarity,0)}</div>
            </div>
            <div style={{padding:'0 20px 12px',position:'relative'}}>
              <span style={{position:'absolute',left:'32px',top:'50%',transform:'translateY(-50%)',color:'#475569',fontSize:'14px'}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.finds_search}
                style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'10px 12px 10px 34px',color:'#f8fafc',fontSize:'14px',boxSizing:'border-box'}}/>
            </div>
            <div style={{padding:'0 20px 100px'}}>
              {filtered.length===0 && <div style={{textAlign:'center',padding:'40px',color:'#475569'}}>{t.finds_empty}</div>}
              {filtered.map(f=>{ const rv=getR(f.rarity); const anc=isAnc(f); return (
                <div key={f.id} style={{background:'#0f172a',border:`1px solid ${anc?'#f59e0b44':rv.color+'33'}`,borderRadius:'14px',padding:'13px 15px',marginBottom:'9px',display:'flex',alignItems:'center',gap:'13px',position:'relative'}}>
                  {anc&&<span style={{position:'absolute',top:'8px',right:'38px'}}>⚠️</span>}
                  <div style={{width:'42px',height:'42px',borderRadius:'50%',background:rv.color+'22',border:`2px solid ${rv.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px',flexShrink:0}}>{rv.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:'#f8fafc',fontSize:'15px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</div>
                    <div style={{color:'#64748b',fontSize:'12px'}}>{f.category} · {f.depth}cm · {f.date}</div>
                    {f.aiResult&&<div style={{color:'#d4a853',fontSize:'11px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>🤖 {f.aiResult.substring(0,55)}...</div>}
                  </div>
                  <button onClick={()=>setFinds(p=>p.filter(x=>x.id!==f.id))} style={{background:'none',border:'none',color:'#475569',cursor:'pointer'}}><TrashIco/></button>
                </div>
              )})}
            </div>
            <button onClick={()=>setShowAdd(true)}
              style={{position:'fixed',bottom:'90px',right:'20px',width:'58px',height:'58px',borderRadius:'50%',background:'#d4a853',border:'none',cursor:'pointer',boxShadow:'0 4px 24px rgba(212,168,83,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
              <PlusIco/>
            </button>
          </div>
        )}

        {/* STATS TAB */}
        {tab==='stats' && (
          <div style={{padding:'20px 20px 100px',animation:'fadeUp 0.25s ease'}}>
            <h2 style={{color:'#f8fafc',fontSize:'22px',fontFamily:"'Playfair Display',serif",marginBottom:'20px'}}>{t.stats_title}</h2>
            {/* Rarity bars */}
            <div style={{background:'#1e293b',borderRadius:'16px',padding:'16px',marginBottom:'14px'}}>
              <h4 style={{color:'#94a3b8',fontSize:'12px',margin:'0 0 14px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Rarity Distribution</h4>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-end',height:'80px'}}>
                {RARITY.map(rv=>{ const cnt=finds.filter(f=>f.rarity===rv.score).length; const max=Math.max(...RARITY.map(r=>finds.filter(f=>f.rarity===r.score).length),1); return (
                  <div key={rv.score} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',justifyContent:'flex-end'}}>
                    <span style={{fontSize:'11px',color:rv.color,fontWeight:'700'}}>{cnt}</span>
                    <div style={{width:'100%',background:rv.color,borderRadius:'4px 4px 0 0',height:`${(cnt/max)*60}px`,minHeight:cnt>0?4:0}}/>
                    <span style={{fontSize:'15px'}}>{rv.emoji}</span>
                  </div>
                )})}
              </div>
            </div>
            {/* Summary */}
            <div style={{background:'#1e293b',borderRadius:'16px',padding:'16px'}}>
              <h4 style={{color:'#94a3b8',fontSize:'12px',margin:'0 0 14px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Summary</h4>
              {[['📍','Total finds',finds.length],['🏅','Sessions',sessions.length],['⭐','Avg rarity',(finds.reduce((a,f)=>a+f.rarity,0)/Math.max(finds.length,1)).toFixed(1)],['🏛️','Ancient finds',finds.filter(isAnc).length],['🗺️','Total km',sessions.reduce((a,s)=>a+s.distance,0).toFixed(1)]].map(([ic,lbl,v])=>(
                <div key={lbl} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid #334155'}}>
                  <span style={{color:'#94a3b8',fontSize:'14px'}}>{ic} {lbl}</span>
                  <span style={{color:'#f8fafc',fontSize:'14px',fontWeight:'600'}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {tab==='sessions' && (
          <div style={{padding:'20px 20px 100px',animation:'fadeUp 0.25s ease'}}>
            <h2 style={{color:'#f8fafc',fontSize:'22px',fontFamily:"'Playfair Display',serif",marginBottom:'20px'}}>{t.sess_title}</h2>
            {sessions.map((s,i)=>(
              <div key={s.id} style={{cursor:'pointer',position:'relative',paddingLeft:'26px',marginBottom:'16px'}}>
                {i<sessions.length-1&&<div style={{position:'absolute',left:'8px',top:'30px',bottom:'-12px',width:'2px',background:'#1e293b'}}/>}
                <div style={{position:'absolute',left:'0',top:'18px',width:'18px',height:'18px',borderRadius:'50%',background:'#d4a853',border:'3px solid #020617'}}/>
                <div style={{background:'#1e293b',borderRadius:'14px',padding:'14px 16px',border:'1px solid #334155'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                    <div><div style={{color:'#f8fafc',fontSize:'15px',fontWeight:'600'}}>{s.name}</div><div style={{color:'#64748b',fontSize:'12px'}}>{s.date} · {s.location}</div></div>
                    <button onClick={()=>exportGPX(s,finds,s.route||[])} style={{background:'#0f172a',border:'1px solid #334155',color:'#64748b',borderRadius:'7px',padding:'4px 8px',cursor:'pointer',fontSize:'11px'}}>{t.sess_gpx}</button>
                  </div>
                  <div style={{display:'flex',gap:'12px',fontSize:'12px',color:'#94a3b8'}}>
                    <span>📍 {s.finds}</span><span>🗺️ {s.distance}km</span><span>⏱️ {Math.floor(s.duration/60)}h</span><span>🌤️ {s.weather}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRIVACY TAB */}
        {tab==='privacy' && (
          <div style={{padding:'20px 20px 100px',animation:'fadeUp 0.25s ease'}}>
            <h2 style={{color:'#f8fafc',fontSize:'22px',fontFamily:"'Playfair Display',serif",marginBottom:'20px'}}>{t.priv_title}</h2>
            {[['📍','GPS Data','Used only during recording. Never stored on servers.'],['🤖','AI Analysis','Photos sent to Anthropic API for analysis only. Not retained.'],['💾','Local Storage','All data stays on your device. Zero cloud storage.'],['🔒','Security','No accounts, no selling of data, no tracking.']].map(([ic,title,desc])=>(
              <div key={title} style={{background:'#1e293b',borderRadius:'14px',padding:'16px',marginBottom:'10px',display:'flex',gap:'14px'}}>
                <span style={{fontSize:'22px'}}>{ic}</span>
                <div><p style={{color:'#f8fafc',fontSize:'14px',fontWeight:'600',margin:'0 0 4px'}}>{title}</p><p style={{color:'#64748b',fontSize:'13px',margin:0,lineHeight:'1.6'}}>{desc}</p></div>
              </div>
            ))}
            <div style={{background:'#1e293b',borderRadius:'14px',padding:'16px',marginBottom:'10px'}}>
              <p style={{color:'#94a3b8',fontSize:'13px',margin:'0 0 8px'}}>Stored data:</p>
              <p style={{color:'#f8fafc',fontSize:'13px',margin:'0 0 4px'}}>• {finds.length} finds · ~{Math.round(finds.length*0.5)} KB</p>
              <p style={{color:'#f8fafc',fontSize:'13px',margin:0}}>• No third-party cookies</p>
            </div>
            <button onClick={()=>{if(window.confirm('Delete ALL data?'))setFinds([])}} style={{width:'100%',background:'#1e293b',border:'1px solid #ef4444',color:'#ef4444',padding:'14px',borderRadius:'12px',fontWeight:'600',fontSize:'15px',cursor:'pointer',marginTop:'8px'}}>🗑️ Delete All Data</button>
            <p style={{color:'#475569',fontSize:'12px',textAlign:'center',marginTop:'16px',lineHeight:'1.6'}}>Regulation (EU) 2016/679 (GDPR)<br/>Right of access, rectification, erasure</p>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'430px',background:'#0f172a',borderTop:'1px solid #1e293b',display:'flex',zIndex:80,paddingBottom:'6px'}}>
        {TABS.map(({id,icon,lbl})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'9px 4px 5px',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',position:'relative'}}>
            {id==='map'&&sessState==='recording'&&<div style={{position:'absolute',top:'6px',right:'18%',width:'7px',height:'7px',borderRadius:'50%',background:'#ef4444',border:'1.5px solid #0f172a'}}/>}
            <span style={{color:tab===id?'#d4a853':'#475569'}}>{icon}</span>
            <span style={{fontSize:'10px',color:tab===id?'#d4a853':'#475569',fontWeight:tab===id?'700':'400'}}>{lbl}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
