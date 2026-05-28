import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { MAP_LAYERS, CATEGORIES, RARITY } from './constants'
import { getR, isAnc, fmtTime, haverD, callAI, exportGPX } from './helpers'

const MapComponent = dynamic(() => import('./Map'), { ssr: false })

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  el: {
    start:'Έναρξη Καταγραφής', stop:'Τερματισμός', pause:'Παύση', resume:'Συνέχεια',
    pin:'📍 Σήμανση Εύρηματος', pinActive:'● Πάτα στον χάρτη...',
    photo:'📷 Φωτογραφία', gallery:'🖼️ Συλλογή', skip:'Παράλειψη →',
    analyzing:'Ανάλυση AI...', saveFind:'Αποθήκευση', saving:'Αποθήκευση...',
    findName:'Όνομα ευρήματος', findNamePh:'π.χ. Βυζαντινό νόμισμα',
    depth:'Βάθος (cm)', notes:'Σημειώσεις', category:'Κατηγορία', rarity:'Σπανιότητα',
    aiAnalysis:'AI Ανάλυση', confidence:'Πιθανότητα', historical:'Ιστορικό Πλαίσιο',
    whyThis:'Γιατί αυτή η εκτίμηση', value:'Εκτιμώμενη Αξία', composition:'Σύνθεση',
    ancient:'⚠️ Πιθανό Αρχαίο Εύρημα', ancientLaw:'Ν.3028/2002: Δήλωση εντός 3 ημερών',
    ministry:'📞 Υπ. Πολιτισμού: 213 214 9805',
    sessionDone:'Συνεδρία Ολοκληρώθηκε!', route:'Διαδρομή', finds:'Ευρήματα',
    duration:'Διάρκεια', distance:'Απόσταση', exportGpx:'📤 Εξαγωγή GPX',
    aiSummary:'AI Σύνοψη Συνεδρίας', generating:'Δημιουργία...', getInsight:'Λήψη Σύνοψης',
    newSession:'Νέα Συνεδρία', history:'Ιστορικό', settings:'Ρυθμίσεις',
    noFinds:'Δεν βρέθηκαν ευρήματα', noSessions:'Καμία συνεδρία ακόμα',
    back:'← Πίσω', delete:'Διαγραφή', close:'Κλείσιμο',
    sosTitle:'🆘 Έκτακτη Ανάγκη', sosMsg:'Στείλε SMS με θέση σου',
    sosContacts:'Επαφές SOS', sosAddPhone:'Πρόσθεσε αριθμό τηλεφώνου',
    sosAdd:'Προσθήκη', sosSend:'📱 Στείλε SMS SOS',
    fontsize:'Μέγεθος Κειμένου', lang:'Γλώσσα',
    wayback:'🎬 Wayback Timelapse',
    privacy:'Απόρρητο', deleteAll:'🗑️ Διαγραφή Όλων', confirmDelete:'Διαγραφή ΟΛΩΝ;',
    gps:'GPS', rec:'REC', km:'km',
    rar:['Κοινό','Ασυνήθιστο','Σπάνιο','Επικό','Θρυλικό'],
    cats:CATEGORIES,
    gdprTitle:'Απόρρητο & Δεδομένα', gdprAccept:'✓ Αποδοχή & Συνέχεια',
    gdprText:'Τα δεδομένα σας αποθηκεύονται τοπικά στη συσκευή σας. Φωτογραφίες αναλύονται μέσω Anthropic AI. Καμία πώληση δεδομένων. GDPR (ΕΕ 2016/679).',
  },
  en: {
    start:'Start Recording', stop:'Stop Session', pause:'Pause', resume:'Resume',
    pin:'📍 Mark a Find', pinActive:'● Tap on map...',
    photo:'📷 Camera', gallery:'🖼️ Gallery', skip:'Skip →',
    analyzing:'AI Analyzing...', saveFind:'Save Find', saving:'Saving...',
    findName:'Find Name', findNamePh:'e.g. Byzantine coin',
    depth:'Depth (cm)', notes:'Notes', category:'Category', rarity:'Rarity',
    aiAnalysis:'AI Analysis', confidence:'Confidence', historical:'Historical Context',
    whyThis:'Why this match', value:'Estimated Value', composition:'Composition',
    ancient:'⚠️ Possible Ancient Find', ancientLaw:'Law 3028/2002: Report within 3 days',
    ministry:'📞 Ministry of Culture: 213 214 9805',
    sessionDone:'Session Complete!', route:'Route', finds:'Finds',
    duration:'Duration', distance:'Distance', exportGpx:'📤 Export GPX',
    aiSummary:'AI Session Summary', generating:'Generating...', getInsight:'Get Summary',
    newSession:'New Session', history:'History', settings:'Settings',
    noFinds:'No finds yet', noSessions:'No sessions yet',
    back:'← Back', delete:'Delete', close:'Close',
    sosTitle:'🆘 Emergency', sosMsg:'Send SMS with your location',
    sosContacts:'SOS Contacts', sosAddPhone:'Add phone number',
    sosAdd:'Add', sosSend:'📱 Send SOS SMS',
    fontsize:'Text Size', lang:'Language',
    wayback:'🎬 Wayback Timelapse',
    privacy:'Privacy', deleteAll:'🗑️ Delete All', confirmDelete:'Delete ALL data?',
    gps:'GPS', rec:'REC', km:'km',
    rar:['Common','Uncommon','Rare','Epic','Legendary'],
    cats:CATEGORIES,
    gdprTitle:'Privacy & Data', gdprAccept:'✓ Accept & Continue',
    gdprText:'Your data is stored locally on your device. Photos are analyzed via Anthropic AI. No data is sold. GDPR (EU 2016/679).',
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const useT = (lang) => T[lang] || T.en
const persist = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }
const load    = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def } }

// ─── ROUTE MAP CANVAS ────────────────────────────────────────────────────────
function RouteMap({ route, finds, sessionId, height=160 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'), W = c.width, H = c.height
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,W,H)
    if (!route || route.length < 2) {
      ctx.fillStyle = '#334155'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('No route data', W/2, H/2); return
    }
    const lats = route.map(p=>p.lat), lngs = route.map(p=>p.lng)
    const [minLat,maxLat] = [Math.min(...lats),Math.max(...lats)]
    const [minLng,maxLng] = [Math.min(...lngs),Math.max(...lngs)]
    const pad = 22
    const tx = lng => pad + ((lng-minLng)/(maxLng-minLng||0.001))*(W-pad*2)
    const ty = lat => H-pad - ((lat-minLat)/(maxLat-minLat||0.001))*(H-pad*2)
    // Grid
    ctx.strokeStyle='#1e293b'; ctx.lineWidth=1
    for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(W/4*i,0);ctx.lineTo(W/4*i,H);ctx.stroke()}
    for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,H/4*i);ctx.lineTo(W,H/4*i);ctx.stroke()}
    // Route
    ctx.beginPath(); ctx.strokeStyle='#d4a853'; ctx.lineWidth=2.5; ctx.lineJoin='round'
    route.forEach((p,i)=>i===0?ctx.moveTo(tx(p.lng),ty(p.lat)):ctx.lineTo(tx(p.lng),ty(p.lat)))
    ctx.stroke()
    // Start/end
    const s=route[0], e=route[route.length-1]
    ctx.beginPath();ctx.arc(tx(s.lng),ty(s.lat),6,0,Math.PI*2);ctx.fillStyle='#22c55e';ctx.fill()
    ctx.beginPath();ctx.arc(tx(e.lng),ty(e.lat),6,0,Math.PI*2);ctx.fillStyle='#ef4444';ctx.fill()
    // Finds
    const sf = finds.filter(f=>f.sessionId===sessionId)
    sf.forEach(f=>{
      ctx.beginPath();ctx.arc(tx(f.lng),ty(f.lat),5,0,Math.PI*2)
      ctx.fillStyle=getR(f.rarity).color;ctx.fill()
      ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke()
    })
    // Legend
    ctx.font='10px sans-serif'; ctx.textAlign='left'
    ctx.fillStyle='#22c55e';ctx.fillText('▶ Start',6,H-6)
    ctx.fillStyle='#ef4444';ctx.fillText('■ End',55,H-6)
    ctx.fillStyle='#64748b';ctx.fillText(`${route.length} pts`,W-50,H-6)
  },[route,finds,sessionId])
  return <canvas ref={ref} width={390} height={height} style={{width:'100%',height:height+'px',borderRadius:'12px',display:'block',border:'1px solid #1e293b'}}/>
}

// ─── WEATHER BAR ─────────────────────────────────────────────────────────────
function WeatherBar({ pos, lang }) {
  const [wx, setWx] = useState(null)
  const [alert, setAlert] = useState(null)
  useEffect(() => {
    if (!pos) return
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lng}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&hourly=precipitation_probability&forecast_hours=4&timezone=auto`)
      .then(r=>r.json())
      .then(d=>{
        const cur = d.current
        const temp  = Math.round(cur.temperature_2m)
        const wind  = Math.round(cur.wind_speed_10m)
        const rain  = cur.precipitation > 0
        const wcode = cur.weather_code
        const icon  = wcode<=1?'☀️':wcode<=3?'⛅':wcode<=49?'🌫️':wcode<=67?'🌧️':wcode<=77?'🌨️':wcode<=99?'⛈️':'☀️'
        const nextRain = d.hourly?.precipitation_probability?.slice(0,4).some(p=>p>60)
        setWx({temp,wind,rain,icon,wcode})
        if (nextRain || wcode>=80) setAlert(lang==='el'?'⚠️ Βροχή αναμένεται — σκεφτείτε να επιστρέψετε':'⚠️ Rain expected — consider returning')
        else setAlert(null)
      }).catch(()=>{})
  },[pos])
  if (!wx) return null
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'6px',background:'rgba(15,23,42,0.85)',borderRadius:'20px',padding:'4px 10px',border:'1px solid #334155'}}>
        <span style={{fontSize:'14px'}}>{wx.icon}</span>
        <span style={{color:'#f8fafc',fontSize:'12px',fontWeight:'600'}}>{wx.temp}°C</span>
        <span style={{color:'#64748b',fontSize:'11px'}}>💨{wx.wind}km/h</span>
      </div>
      {alert && <div style={{background:'rgba(239,68,68,0.15)',border:'1px solid #ef4444',borderRadius:'8px',padding:'4px 8px',fontSize:'11px',color:'#fca5a5',textAlign:'center'}}>{alert}</div>}
    </div>
  )
}

// ─── SOS BUTTON ──────────────────────────────────────────────────────────────
function SOSButton({ pos, lang }) {
  const t = useT(lang)
  const [open, setOpen] = useState(false)
  const [contacts, setContacts] = useState(() => load('fd_sos_contacts', []))
  const [newPhone, setNewPhone] = useState('')

  const addContact = () => {
    if (!newPhone.trim()) return
    const updated = [...contacts, newPhone.trim()]
    setContacts(updated); persist('fd_sos_contacts', updated); setNewPhone('')
  }
  const removeContact = (i) => {
    const updated = contacts.filter((_,idx)=>idx!==i)
    setContacts(updated); persist('fd_sos_contacts', updated)
  }
  const sendSOS = () => {
    const loc = pos ? `${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}` : 'unknown'
    const msg = `🆘 SOS FieldDetective! Location: https://maps.google.com/?q=${loc}`
    if (contacts.length > 0) {
      window.location.href = `sms:${contacts.join(',')}?body=${encodeURIComponent(msg)}`
    } else {
      window.location.href = `sms:?body=${encodeURIComponent(msg)}`
    }
    setOpen(false)
  }

  return (
    <>
      <button onClick={()=>setOpen(true)}
        style={{width:'44px',height:'44px',borderRadius:'50%',background:'#ef4444',border:'none',color:'white',fontWeight:'900',fontSize:'15px',cursor:'pointer',boxShadow:'0 2px 12px rgba(239,68,68,0.5)',flexShrink:0}}>
        SOS
      </button>
      {open && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:2000,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'#0f172a',width:'100%',maxWidth:'430px',margin:'0 auto',borderRadius:'20px 20px 0 0',padding:'24px',border:'1px solid #ef4444'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{color:'#ef4444',fontSize:'20px',fontFamily:"'Playfair Display',serif",margin:0}}>{t.sosTitle}</h3>
              <button onClick={()=>setOpen(false)} style={{background:'#1e293b',border:'none',color:'#64748b',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',fontSize:'18px'}}>×</button>
            </div>
            {pos && <div style={{background:'#1e293b',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:'#22c55e'}}>📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</div>}
            <div style={{marginBottom:'14px'}}>
              <div style={{color:'#94a3b8',fontSize:'12px',marginBottom:'8px'}}>{t.sosContacts}</div>
              {contacts.map((c,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                  <div style={{flex:1,background:'#1e293b',borderRadius:'8px',padding:'8px 12px',color:'#f8fafc',fontSize:'14px'}}>{c}</div>
                  <button onClick={()=>removeContact(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'18px'}}>×</button>
                </div>
              ))}
              <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder={t.sosAddPhone} type="tel"
                  style={{flex:1,background:'#1e293b',border:'1px solid #334155',borderRadius:'8px',padding:'10px 12px',color:'#f8fafc',fontSize:'14px',outline:'none'}}/>
                <button onClick={addContact} style={{background:'#334155',border:'none',color:'#f8fafc',borderRadius:'8px',padding:'10px 14px',cursor:'pointer',fontWeight:'600'}}>{t.sosAdd}</button>
              </div>
            </div>
            <button onClick={sendSOS}
              style={{width:'100%',background:'#ef4444',border:'none',color:'white',padding:'16px',borderRadius:'12px',fontWeight:'700',fontSize:'17px',cursor:'pointer',boxShadow:'0 4px 20px rgba(239,68,68,0.4)'}}>
              {t.sosSend}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── GDPR MODAL ──────────────────────────────────────────────────────────────
function GDPRModal({ lang, onAccept }) {
  const t = useT(lang)
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.96)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:'20px',padding:'28px',maxWidth:'380px',width:'100%'}}>
        <div style={{fontSize:'32px',textAlign:'center',marginBottom:'14px'}}>🕵️</div>
        <h2 style={{color:'#f8fafc',fontSize:'20px',fontFamily:"'Playfair Display',serif",textAlign:'center',margin:'0 0 16px'}}>FieldDetective</h2>
        <p style={{color:'#94a3b8',fontSize:'14px',lineHeight:'1.7',marginBottom:'20px',textAlign:'center'}}>{t.gdprText}</p>
        <button onClick={onAccept}
          style={{width:'100%',background:'#d4a853',border:'none',color:'#0f172a',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'16px',cursor:'pointer'}}>
          {t.gdprAccept}
        </button>
      </div>
    </div>
  )
}

// ─── AI FIND MODAL (full flow: photo → AI → form → save) ─────────────────────
function FindModal({ lang, sessions, pos, onClose, onSave }) {
  const t = useT(lang)
  const [step, setStep]           = useState('photo')   // photo | analyzing | form
  const [preview, setPreview]     = useState(null)
  const [b64, setB64]             = useState(null)
  const [aiData, setAiData]       = useState(null)
  const [aiErr, setAiErr]         = useState(null)
  const [form, setForm]           = useState({ name:'', category:'Coin', depth:'', notes:'', rarity:1 })
  const [saving, setSaving]       = useState(false)
  const camRef = useRef(null), galRef = useRef(null)

  const compressAndAnalyze = async (file) => {
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setPreview(dataUrl)
      const raw = dataUrl.split(',')[1]
      // Compress
      const img = new Image()
      img.onload = async () => {
        const scale = Math.min(1, 800/Math.max(img.width,img.height))
        const canvas = document.createElement('canvas')
        canvas.width = img.width*scale; canvas.height = img.height*scale
        canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
        const compressed = canvas.toDataURL('image/jpeg',0.7).split(',')[1]
        setB64(compressed)
        setStep('analyzing')
        setAiErr(null)
        try {
          const res = await fetch('/api/ai', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              prompt: `You are an expert archaeologist and numismatist analyzing a metal detector find photo.
Respond in JSON only, no other text. Write "historical_context" and "why_this_match" in ${lang==='el'?'Greek (Ελληνικά)':'English'}:
{
  "name": "object name (max 5 words, in English)",
  "period": "historical period (in ${lang==='el'?'Greek':'English'})",
  "material": "primary material (in ${lang==='el'?'Greek':'English'})",
  "composition": "metal percentages e.g. Ag 85% Cu 15%, or N/A",
  "rarity": 3,
  "confidence": 78,
  "value": "50-200 EUR",
  "ancient": false,
  "historical_context": "2-3 sentences in ${lang==='el'?'Greek':'English'} about historical significance",
  "why_this_match": "1-2 sentences in ${lang==='el'?'Greek':'English'} explaining the visual reasoning"
}`,
              imageBase64: compressed,
            })
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'AI error')
          const parsed = JSON.parse(data.text.replace(/```json|```/g,'').trim())
          setAiData(parsed)
          setForm(f=>({
            ...f,
            name: parsed.name || '',
            rarity: Math.min(5, Math.max(1, parsed.rarity || 1)),
          }))
        } catch(e) {
          setAiErr(e.message)
        }
        setStep('form')
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleFile = (e) => { const f=e.target.files[0]; if(f) compressAndAnalyze(f) }

  const save = () => {
    if (!form.name) return
    setSaving(true)
    const find = {
      id:       Date.now(),
      name:     form.name,
      category: form.category,
      depth:    parseInt(form.depth) || 0,
      notes:    form.notes,
      rarity:   form.rarity,
      lat:      pos?.lat || (37.984+(Math.random()-0.5)*0.01),
      lng:      pos?.lng || (23.728+(Math.random()-0.5)*0.01),
      date:     new Date().toISOString().split('T')[0],
      sessionId:sessions[0]?.id || null,
      photo:    preview,
      aiData,
      aiResult: aiData ? `${aiData.name} — ${aiData.period}` : '',
    }
    setTimeout(()=>{ onSave(find); onClose() }, 300)
  }

  const rv = getR(form.rarity)

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:1500,display:'flex',alignItems:'flex-end'}}>
      <div style={{background:'#0f172a',width:'100%',maxWidth:'430px',margin:'0 auto',borderRadius:'20px 20px 0 0',border:'1px solid #1e293b',maxHeight:'95vh',overflowY:'auto'}}>

        {/* Handle */}
        <div style={{display:'flex',justifyContent:'center',padding:'10px 0 0'}}><div style={{width:'40px',height:'4px',borderRadius:'2px',background:'#334155'}}/></div>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px 0'}}>
          <h3 style={{color:'#f8fafc',fontSize:'17px',fontFamily:"'Playfair Display',serif",margin:0}}>
            {step==='photo'?'📍 '+t.pin.replace('📍 ',''):step==='analyzing'?t.analyzing:'📍 '+t.saveFind}
          </h3>
          <button onClick={onClose} style={{background:'#1e293b',border:'none',color:'#64748b',borderRadius:'50%',width:'32px',height:'32px',cursor:'pointer',fontSize:'18px'}}>×</button>
        </div>

        <div style={{padding:'16px 20px 32px'}}>

          {/* STEP: PHOTO */}
          {step==='photo' && (
            <>
              <p style={{color:'#64748b',fontSize:'13px',marginBottom:'20px',lineHeight:'1.6'}}>
                {lang==='el'?'Φωτογράφισε το εύρημα για AI αναγνώριση, ή παράλειψε αυτό το βήμα.':'Photograph the find for AI recognition, or skip this step.'}
              </p>
              <div style={{display:'flex',gap:'10px',marginBottom:'14px'}}>
                <label htmlFor="fd-cam" style={{flex:1,background:'linear-gradient(135deg,#d4a853,#b8882f)',borderRadius:'14px',padding:'18px',textAlign:'center',cursor:'pointer',fontWeight:'700',fontSize:'15px',color:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                  📷 {t.photo}
                  <input id="fd-cam" type="file" accept="image/*" capture="environment" onChange={handleFile} style={{display:'none'}}/>
                </label>
                <label htmlFor="fd-gal" style={{flex:1,background:'#1e293b',border:'1px solid #334155',borderRadius:'14px',padding:'18px',textAlign:'center',cursor:'pointer',fontWeight:'600',fontSize:'15px',color:'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                  🖼️ {t.gallery}
                  <input id="fd-gal" type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
                </label>
              </div>
              <button onClick={()=>setStep('form')} style={{width:'100%',background:'transparent',border:'none',color:'#475569',fontSize:'13px',cursor:'pointer',padding:'8px'}}>{t.skip}</button>
            </>
          )}

          {/* STEP: ANALYZING */}
          {step==='analyzing' && (
            <div style={{textAlign:'center',padding:'32px 0'}}>
              {preview && <img src={preview} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'14px',marginBottom:'20px'}}/>}
              <div style={{fontSize:'32px',marginBottom:'12px',animation:'spin 1.5s linear infinite',display:'inline-block'}}>🔬</div>
              <p style={{color:'#d4a853',fontSize:'16px',fontWeight:'600',margin:'0 0 6px'}}>{t.analyzing}</p>
              <p style={{color:'#64748b',fontSize:'13px',margin:0}}>{lang==='el'?'Αναγνώριση αντικειμένου, εποχής, υλικού...':'Identifying object, period, material...'}</p>
            </div>
          )}

          {/* STEP: FORM */}
          {step==='form' && (
            <>
              {/* Photo preview */}
              {preview && (
                <div style={{position:'relative',marginBottom:'16px'}}>
                  <img src={preview} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'14px'}}/>
                  {aiData && (
                    <div style={{position:'absolute',bottom:'10px',left:'10px',background:'rgba(15,23,42,0.9)',borderRadius:'8px',padding:'4px 10px',display:'flex',alignItems:'center',gap:'5px'}}>
                      <span style={{color:'#d4a853',fontSize:'12px',fontWeight:'700'}}>🤖 AI</span>
                      <span style={{color:'#22c55e',fontSize:'12px',fontWeight:'700'}}>{aiData.confidence}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* AI Result Panel */}
              {aiData && !aiErr && (
                <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',border:'1px solid #d4a853',borderRadius:'14px',padding:'16px',marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                    <div>
                      <div style={{color:'#d4a853',fontSize:'12px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'4px'}}>🤖 {t.aiAnalysis}</div>
                      <div style={{color:'#f8fafc',fontSize:'16px',fontWeight:'700'}}>{aiData.name}</div>
                      <div style={{color:'#94a3b8',fontSize:'13px',marginTop:'2px'}}>{aiData.period}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{color:'#22c55e',fontSize:'22px',fontWeight:'800'}}>{aiData.confidence}%</div>
                      <div style={{color:'#64748b',fontSize:'11px'}}>{t.confidence}</div>
                    </div>
                  </div>

                  {/* Value + Composition */}
                  {(aiData.value || aiData.composition) && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                      {aiData.value && <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid #22c55e',borderRadius:'8px',padding:'8px 10px'}}>
                        <div style={{color:'#22c55e',fontSize:'10px',marginBottom:'3px'}}>💰 {t.value}</div>
                        <div style={{color:'#f8fafc',fontSize:'13px',fontWeight:'600'}}>{aiData.value}</div>
                      </div>}
                      {aiData.composition && aiData.composition!=='N/A' && <div style={{background:'rgba(99,102,241,0.1)',border:'1px solid #6366f1',borderRadius:'8px',padding:'8px 10px'}}>
                        <div style={{color:'#818cf8',fontSize:'10px',marginBottom:'3px'}}>⚗️ {t.composition}</div>
                        <div style={{color:'#f8fafc',fontSize:'12px',fontWeight:'600'}}>{aiData.composition}</div>
                      </div>}
                    </div>
                  )}

                  {/* Historical context */}
                  {aiData.historical_context && (
                    <div style={{marginBottom:'10px'}}>
                      <div style={{color:'#64748b',fontSize:'11px',marginBottom:'4px'}}>🏛️ {t.historical}</div>
                      <div className='fd-text' style={{color:'#e2e8f0',lineHeight:'1.6'}}>{aiData.historical_context}</div>
                    </div>
                  )}

                  {/* Why this match */}
                  {aiData.why_this_match && (
                    <div style={{borderTop:'1px solid #334155',paddingTop:'10px'}}>
                      <div style={{color:'#64748b',fontSize:'11px',marginBottom:'4px'}}>🔍 {t.whyThis}</div>
                      <div className='fd-text-sm' style={{color:'#94a3b8',lineHeight:'1.6',fontStyle:'italic'}}>{aiData.why_this_match}</div>
                    </div>
                  )}

                  {/* Ancient warning */}
                  {aiData.ancient && (
                    <div style={{marginTop:'10px',background:'rgba(245,158,11,0.1)',border:'1px solid #f59e0b',borderRadius:'8px',padding:'10px 12px'}}>
                      <div style={{color:'#fbbf24',fontSize:'13px',fontWeight:'600',marginBottom:'3px'}}>{t.ancient}</div>
                      <div style={{color:'#94a3b8',fontSize:'12px'}}>{t.ancientLaw}</div>
                      <a href="tel:+302132149805" style={{color:'#d4a853',fontSize:'12px',display:'block',marginTop:'4px',textDecoration:'none'}}>{t.ministry}</a>
                    </div>
                  )}
                </div>
              )}

              {aiErr && <div style={{background:'#ef444422',border:'1px solid #ef4444',borderRadius:'10px',padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:'#fca5a5'}}>⚠️ {aiErr}</div>}

              {/* Form fields */}
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{t.findName} *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={t.findNamePh}
                  style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'12px 14px',color:'#f8fafc',fontSize:'15px',boxSizing:'border-box',outline:'none'}}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div>
                  <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{t.category}</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                    style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px',color:'#f8fafc',fontSize:'14px',outline:'none'}}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{t.depth}</label>
                  <input type="number" value={form.depth} onChange={e=>setForm(f=>({...f,depth:e.target.value}))} placeholder="e.g. 15"
                    style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px 13px',color:'#f8fafc',fontSize:'14px',boxSizing:'border-box',outline:'none'}}/>
                </div>
              </div>

              <div style={{marginBottom:'14px'}}>
                <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{t.notes}</label>
                <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="..."
                  style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px 13px',color:'#f8fafc',fontSize:'14px',boxSizing:'border-box',outline:'none'}}/>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'7px'}}>{t.rarity}</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {RARITY.map(rv=>(
                    <button key={rv.score} onClick={()=>setForm(f=>({...f,rarity:rv.score}))}
                      style={{flex:1,padding:'10px 2px',borderRadius:'9px',border:`2px solid ${form.rarity===rv.score?rv.color:'#334155'}`,background:form.rarity===rv.score?rv.color+'22':'transparent',cursor:'pointer',fontSize:'20px'}}>
                      {rv.emoji}
                    </button>
                  ))}
                </div>
                <div style={{textAlign:'center',marginTop:'5px',fontSize:'12px',color:rv.color,fontWeight:'600'}}>{T[lang].rar[form.rarity-1]}</div>
              </div>

              <button onClick={save} disabled={!form.name||saving}
                style={{width:'100%',background:form.name&&!saving?'#d4a853':'#334155',border:'none',color:form.name&&!saving?'#0f172a':'#64748b',padding:'16px',borderRadius:'13px',fontWeight:'700',fontSize:'17px',cursor:form.name?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',transition:'all 0.2s'}}>
                {saving?<><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⟳</span> {t.saving}</>:<>📍 {t.saveFind}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SESSION SUMMARY SCREEN ──────────────────────────────────────────────────
function SessionSummary({ session, finds, lang, onDone }) {
  const t = useT(lang)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const sf = finds.filter(f=>f.sessionId===session.id)

  const getAISummary = async () => {
    setLoading(true)
    try {
      const findsList = sf.map(f=>`${f.name} (${f.category}, depth ${f.depth}cm, rarity ${f.rarity}/5${f.aiData?.ancient?' ANCIENT':''})`)
      const res = await fetch('/api/ai', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt: `You are a metal detecting expert. Session details: Location: ${session.location}, Duration: ${session.duration} min, Distance: ${session.distance}km, Finds: ${findsList.join(', ')||'none'}.
Write a brief summary in ${lang==='el'?'Greek (Ελληνικά)':'English'} (3-4 sentences): what was found, historical significance of the area, and one practical tip for the next session here. Be enthusiastic and specific.`
        })
      })
      const data = await res.json()
      setSummary(data.text)
    } catch(e) {}
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#020617',zIndex:1500,overflowY:'auto'}}>
      <div style={{maxWidth:'430px',margin:'0 auto',padding:'20px 20px 40px'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'24px'}}>
          <div style={{fontSize:'52px',marginBottom:'10px'}}>🏁</div>
          <h2 style={{color:'#d4a853',fontSize:'22px',fontFamily:"'Playfair Display',serif",margin:'0 0 4px'}}>{t.sessionDone}</h2>
          <div style={{color:'#64748b',fontSize:'14px'}}>{session.name} · {session.date}</div>
        </div>

        {/* Stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
          {[
            ['⏱️',t.duration, fmtTime(session.elapsed)],
            ['🗺️',t.distance, `${session.distance} km`],
            ['📍',t.finds,    sf.length],
            ['⭐','Avg Rarity',(sf.reduce((a,f)=>a+f.rarity,0)/Math.max(sf.length,1)).toFixed(1)],
          ].map(([ic,lbl,v])=>(
            <div key={lbl} style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'12px',padding:'14px',textAlign:'center'}}>
              <div style={{fontSize:'22px',marginBottom:'4px'}}>{ic}</div>
              <div style={{color:'#f8fafc',fontSize:'18px',fontWeight:'700'}}>{v}</div>
              <div style={{color:'#64748b',fontSize:'11px'}}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Route map */}
        <div style={{marginBottom:'20px'}}>
          <div style={{color:'#64748b',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'8px'}}>🗺️ {t.route}</div>
          <RouteMap route={session.route||[]} finds={finds} sessionId={session.id} height={180}/>
        </div>

        {/* Finds */}
        {sf.length > 0 && (
          <div style={{marginBottom:'20px'}}>
            <div style={{color:'#64748b',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'10px'}}>📍 {t.finds}</div>
            {sf.map(f=>{
              const rv=getR(f.rarity)
              return (
                <div key={f.id} style={{background:'#0f172a',border:`1px solid ${rv.color}33`,borderRadius:'12px',padding:'12px 14px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px'}}>
                  {f.photo ? <img src={f.photo} alt="" style={{width:'48px',height:'48px',objectFit:'cover',borderRadius:'8px',flexShrink:0}}/> : <div style={{width:'48px',height:'48px',borderRadius:'8px',background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>{rv.emoji}</div>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:'#f8fafc',fontSize:'14px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</div>
                    <div style={{color:'#64748b',fontSize:'12px'}}>{f.category} · {f.depth}cm · {rv.emoji} {T[lang].rar[rv.score-1]}</div>
                    {f.aiData?.value && <div style={{color:'#22c55e',fontSize:'11px',marginTop:'2px'}}>💰 {f.aiData.value}</div>}
                  </div>
                  {isAnc(f) && <span style={{fontSize:'16px'}}>⚠️</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* AI Summary */}
        <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',border:'1px solid #d4a853',borderRadius:'14px',padding:'16px',marginBottom:'20px'}}>
          <div style={{color:'#d4a853',fontSize:'13px',fontWeight:'700',marginBottom:'10px'}}>🤖 {t.aiSummary}</div>
          {summary ? (
            <p className='fd-text' style={{color:'#e2e8f0',lineHeight:'1.7',margin:0}}>{summary}</p>
          ) : (
            <button onClick={getAISummary} disabled={loading}
              style={{width:'100%',background:loading?'#334155':'#d4a853',border:'none',color:loading?'#64748b':'#0f172a',padding:'12px',borderRadius:'10px',fontWeight:'700',fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
              {loading?t.generating:t.getInsight}
            </button>
          )}
        </div>

        {/* GPX + Done */}
        <div style={{display:'flex',gap:'10px'}}>
          <button onClick={()=>exportGPX(session,finds,session.route||[])}
            style={{flex:1,background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'14px',borderRadius:'12px',fontWeight:'600',fontSize:'14px',cursor:'pointer'}}>
            {t.exportGpx}
          </button>
          <button onClick={onDone}
            style={{flex:2,background:'#d4a853',border:'none',color:'#0f172a',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'16px',cursor:'pointer'}}>
            🎉 {t.newSession}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FIND DETAIL VIEW ────────────────────────────────────────────────────────
function FindDetail({ find, lang, onClose, onDelete }) {
  const t  = useT(lang)
  const rv = getR(find.rarity)
  const d  = find.aiData

  return (
    <div style={{position:'fixed',inset:0,background:'#020617',zIndex:1500,overflowY:'auto'}}>
      <div style={{maxWidth:'430px',margin:'0 auto',paddingBottom:'40px'}}>
        {/* Sticky header */}
        <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'16px 20px',borderBottom:'1px solid #1e293b',background:'#020617',position:'sticky',top:0,zIndex:10}}>
          <button onClick={onClose} style={{background:'#1e293b',border:'none',color:'#94a3b8',borderRadius:'50%',width:'36px',height:'36px',cursor:'pointer',fontSize:'18px',flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{color:'#f8fafc',fontSize:'17px',fontFamily:"'Playfair Display',serif",margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{find.name}</h2>
            <div style={{color:rv.color,fontSize:'12px',fontWeight:'600'}}>{rv.emoji} {T[lang].rar[rv.score-1]}</div>
          </div>
          <button onClick={()=>{onDelete(find.id);onClose()}} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'22px',flexShrink:0}}>🗑️</button>
        </div>

        {/* Photo */}
        {find.photo
          ? <img src={find.photo} alt={find.name} style={{width:'100%',maxHeight:'280px',objectFit:'cover',display:'block'}}/>
          : <div style={{height:'120px',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'48px',color:'#334155'}}>📷</div>
        }

        <div style={{padding:'16px 20px'}}>
          {/* Basic info grid */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px'}}>
            {[['📂','Category',find.category],['📏','Depth',`${find.depth}cm`],['📅','Date',find.date],['📍','GPS',`${find.lat?.toFixed(4)}°N`]].map(([ic,lbl,v])=>(
              <div key={lbl} style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'10px',padding:'10px 12px'}}>
                <div style={{color:'#64748b',fontSize:'11px',marginBottom:'3px'}}>{ic} {lbl}</div>
                <div style={{color:'#f8fafc',fontSize:'14px',fontWeight:'600'}}>{v}</div>
              </div>
            ))}
          </div>

          {/* AI Data */}
          {d && (
            <>
              {/* Confidence + value */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div style={{background:'#0f172a',border:'1px solid #22c55e',borderRadius:'10px',padding:'10px 12px'}}>
                  <div style={{color:'#22c55e',fontSize:'11px',marginBottom:'3px'}}>✓ {t.confidence}</div>
                  <div style={{color:'#f8fafc',fontSize:'20px',fontWeight:'800'}}>{d.confidence}%</div>
                </div>
                {d.value && <div style={{background:'#0f172a',border:'1px solid #22c55e',borderRadius:'10px',padding:'10px 12px'}}>
                  <div style={{color:'#22c55e',fontSize:'11px',marginBottom:'3px'}}>💰 {t.value}</div>
                  <div style={{color:'#f8fafc',fontSize:'14px',fontWeight:'700'}}>{d.value}</div>
                </div>}
              </div>

              {/* Composition */}
              {d.composition && d.composition!=='N/A' && (
                <div style={{background:'rgba(99,102,241,0.08)',border:'1px solid #6366f1',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px'}}>
                  <div style={{color:'#818cf8',fontSize:'11px',marginBottom:'4px'}}>⚗️ {t.composition}</div>
                  <div style={{color:'#f8fafc',fontSize:'14px',fontWeight:'600'}}>{d.composition}</div>
                </div>
              )}

              {/* Historical context */}
              {d.historical_context && (
                <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:'10px',padding:'12px 14px',marginBottom:'12px'}}>
                  <div style={{color:'#64748b',fontSize:'11px',marginBottom:'6px'}}>🏛️ {t.historical}</div>
                  <div className='fd-text' style={{color:'#e2e8f0',lineHeight:'1.7'}}>{d.historical_context}</div>
                </div>
              )}

              {/* Why this match */}
              {d.why_this_match && (
                <div style={{background:'#0f172a',border:'1px solid #d4a853',borderRadius:'10px',padding:'12px 14px',marginBottom:'12px'}}>
                  <div style={{color:'#d4a853',fontSize:'11px',marginBottom:'6px'}}>🔍 {t.whyThis}</div>
                  <div className='fd-text-sm' style={{color:'#94a3b8',lineHeight:'1.7',fontStyle:'italic'}}>{d.why_this_match}</div>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          {find.notes && (
            <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:'10px',padding:'12px 14px',marginBottom:'12px'}}>
              <div style={{color:'#64748b',fontSize:'11px',marginBottom:'6px'}}>📝 {t.notes}</div>
              <div className='fd-text' style={{color:'#e2e8f0',lineHeight:'1.6'}}>{find.notes}</div>
            </div>
          )}

          {/* Ancient warning */}
          {isAnc(find) && (
            <div style={{background:'rgba(245,158,11,0.08)',border:'1px solid #f59e0b',borderRadius:'10px',padding:'12px 14px',marginBottom:'14px'}}>
              <div style={{color:'#fbbf24',fontSize:'13px',fontWeight:'700',marginBottom:'4px'}}>{t.ancient}</div>
              <div style={{color:'#94a3b8',fontSize:'12px',marginBottom:'6px'}}>{t.ancientLaw}</div>
              <a href="tel:+302132149805" style={{color:'#d4a853',fontSize:'13px',textDecoration:'none'}}>{t.ministry}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── HISTORY SCREEN ──────────────────────────────────────────────────────────
function HistoryScreen({ finds, sessions, lang, onSelectFind, onSelectSession, onDeleteFind }) {
  const t = useT(lang)
  const [view, setView] = useState('album')

  // Group by date
  const byDate = {}
  finds.forEach(f=>{ if(!byDate[f.date]) byDate[f.date]=[]; byDate[f.date].push(f) })
  const sortedDates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a))

  return (
    <div style={{padding:'16px 16px 100px'}}>
      {/* Toggle */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {['album','sessions'].map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{flex:1,background:view===v?'#d4a853':'#1e293b',border:'none',color:view===v?'#0f172a':'#64748b',padding:'10px',borderRadius:'10px',cursor:'pointer',fontWeight:view===v?'700':'400',fontSize:'14px'}}>
            {v==='album'?(lang==='el'?'📸 Άλμπουμ':'📸 Album'):(lang==='el'?'📋 Συνεδρίες':'📋 Sessions')}
          </button>
        ))}
      </div>

      {/* ALBUM — grouped by date */}
      {view==='album' && (
        sortedDates.length===0
          ? <div style={{textAlign:'center',padding:'60px 20px',color:'#475569'}}><div style={{fontSize:'48px',marginBottom:'12px'}}>📷</div>{t.noFinds}</div>
          : sortedDates.map(date=>(
            <div key={date} style={{marginBottom:'24px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
                <div style={{color:'#d4a853',fontSize:'13px',fontWeight:'700'}}>📅 {date}</div>
                <div style={{flex:1,height:'1px',background:'#1e293b'}}/>
                <div style={{color:'#475569',fontSize:'12px'}}>{byDate[date].length} {t.finds}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {byDate[date].map(f=>{
                  const rv=getR(f.rarity)
                  return (
                    <div key={f.id} onClick={()=>onSelectFind(f)}
                      style={{background:'#0f172a',borderRadius:'12px',overflow:'hidden',border:`1px solid ${rv.color}33`,cursor:'pointer',position:'relative'}}>
                      {f.photo
                        ? <img src={f.photo} alt={f.name} style={{width:'100%',height:'120px',objectFit:'cover',display:'block'}}/>
                        : <div style={{height:'120px',background:'#1e293b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'36px'}}>{rv.emoji}</div>
                      }
                      {isAnc(f) && <div style={{position:'absolute',top:'6px',right:'6px',fontSize:'14px'}}>⚠️</div>}
                      <div style={{padding:'8px 10px'}}>
                        <div style={{color:'#f8fafc',fontSize:'13px',fontWeight:'600',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.name}</div>
                        <div style={{color:'#64748b',fontSize:'11px'}}>{f.category} · {f.depth}cm</div>
                        {f.aiData?.confidence && <div style={{color:'#22c55e',fontSize:'11px',marginTop:'2px'}}>🤖 {f.aiData.confidence}%</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
      )}

      {/* SESSIONS */}
      {view==='sessions' && (
        sessions.length===0
          ? <div style={{textAlign:'center',padding:'60px 20px',color:'#475569'}}><div style={{fontSize:'48px',marginBottom:'12px'}}>🗺️</div>{t.noSessions}</div>
          : sessions.map((s,i)=>(
            <div key={s.id} onClick={()=>onSelectSession(s)}
              style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'14px',padding:'14px 16px',marginBottom:'10px',cursor:'pointer'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                <div>
                  <div style={{color:'#f8fafc',fontSize:'15px',fontWeight:'600'}}>{s.name}</div>
                  <div style={{color:'#64748b',fontSize:'12px'}}>{s.date} · {s.location}</div>
                </div>
                <span style={{color:'#334155',fontSize:'20px'}}>⌄</span>
              </div>
              <RouteMap route={s.route||[]} finds={finds} sessionId={s.id} height={100}/>
              <div style={{display:'flex',gap:'12px',fontSize:'12px',color:'#94a3b8',marginTop:'10px'}}>
                <span>📍 {s.finds}</span>
                <span>🗺️ {s.distance}km</span>
                <span>⏱️ {Math.floor(s.duration/60)}h {s.duration%60}m</span>
              </div>
            </div>
          ))
      )}
    </div>
  )
}

// ─── SETTINGS SCREEN ────────────────────────────────────────────────────────
function SettingsScreen({ lang, setLang, fontSize, setFontSize, finds, setFinds, sessions, setSessions, layerIdx, setLayerIdx }) {
  const t = useT(lang)
  const [sosContacts, setSosContacts] = useState(() => load('fd_sos_contacts', []))
  const [newPhone, setNewPhone]       = useState('')

  const addContact = () => {
    if (!newPhone.trim()) return
    const u = [...sosContacts, newPhone.trim()]
    setSosContacts(u); persist('fd_sos_contacts', u); setNewPhone('')
  }
  const removeContact = (i) => {
    const u = sosContacts.filter((_,idx)=>idx!==i)
    setSosContacts(u); persist('fd_sos_contacts', u)
  }

  return (
    <div style={{padding:'16px 16px 100px'}}>

      {/* Language */}
      <Section icon="🌍" title={t.lang}>
        <div style={{display:'flex',gap:'10px'}}>
          {['el','en'].map(l=>(
            <button key={l} onClick={()=>setLang(l)}
              style={{flex:1,background:lang===l?'#d4a853':'#1e293b',border:'none',color:lang===l?'#0f172a':'#64748b',padding:'12px',borderRadius:'10px',cursor:'pointer',fontWeight:lang===l?'700':'400',fontSize:'15px'}}>
              {l==='el'?'🇬🇷 Ελληνικά':'🇬🇧 English'}
            </button>
          ))}
        </div>
      </Section>

      {/* Font size */}
      <Section icon="🔤" title={t.fontsize}>
        <div style={{background:'#1e293b',borderRadius:'10px',padding:'12px',marginBottom:'12px',borderLeft:'3px solid #d4a853'}}>
          <div style={{color:'#64748b',fontSize:'11px',marginBottom:'4px'}}>Preview</div>
          <div style={{color:'#e2e8f0',fontSize:fontSize+'px',lineHeight:'1.6'}}>Roman silver denarius, 200 AD. Ag 85% Cu 15%. Value: 50-200 EUR.</div>
        </div>
        <input type="range" min={12} max={22} step={1} value={fontSize}
          onChange={e=>{const v=parseInt(e.target.value);setFontSize(v);persist('fd_fontsize',v)}}
          style={{width:'100%',accentColor:'#d4a853',marginBottom:'8px'}}/>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          {[12,14,16,18,20,22].map(s=>(
            <button key={s} onClick={()=>{setFontSize(s);persist('fd_fontsize',s)}}
              style={{background:fontSize===s?'#d4a853':'#1e293b',border:'none',color:fontSize===s?'#0f172a':'#64748b',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',fontSize:'12px',fontWeight:fontSize===s?'700':'400'}}>
              {s}
            </button>
          ))}
        </div>
      </Section>

      {/* SOS Contacts */}
      <Section icon="🆘" title={`${t.sosTitle} — ${t.sosContacts}`}>
        {sosContacts.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
            <div style={{flex:1,background:'#1e293b',borderRadius:'8px',padding:'10px 12px',color:'#f8fafc',fontSize:'14px'}}>{c}</div>
            <button onClick={()=>removeContact(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'20px'}}>×</button>
          </div>
        ))}
        <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
          <input value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder={t.sosAddPhone} type="tel"
            style={{flex:1,background:'#1e293b',border:'1px solid #334155',borderRadius:'8px',padding:'10px 12px',color:'#f8fafc',fontSize:'14px',outline:'none'}}/>
          <button onClick={addContact} style={{background:'#334155',border:'none',color:'#f8fafc',borderRadius:'8px',padding:'10px 14px',cursor:'pointer',fontWeight:'600'}}>{t.sosAdd}</button>
        </div>
      </Section>

      {/* Map Layers */}
      <Section icon="🗺️" title={lang==='el'?'Επίπεδα Χάρτη':'Map Layers'}>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {MAP_LAYERS.map((l,idx)=>(
            <button key={l.k} onClick={()=>setLayerIdx(idx)}
              style={{width:'100%',background:layerIdx===idx?'#d4a853':'#1e293b',border:`1px solid ${layerIdx===idx?'#d4a853':'#334155'}`,color:layerIdx===idx?'#0f172a':'#94a3b8',padding:'12px 14px',borderRadius:'10px',cursor:'pointer',fontSize:'14px',fontWeight:layerIdx===idx?'700':'400',display:'flex',alignItems:'center',gap:'10px',textAlign:'left'}}>
              <span style={{fontSize:'20px'}}>{l.emoji}</span>
              <div>
                <div style={{fontWeight:layerIdx===idx?'700':'600'}}>{l.label[lang]}</div>
                {layerIdx===idx && <div style={{fontSize:'11px',opacity:0.7,marginTop:'2px'}}>{lang==='el'?'● Ενεργό':'● Active'}</div>}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Wayback */}
      <Section icon="🎬" title="Wayback Timelapse">
        <button onClick={()=>window.open('https://livingatlas.arcgis.com/wayback/','_blank')}
          style={{width:'100%',background:'#1e293b',border:'1px solid #6366f1',color:'#818cf8',padding:'12px',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
          🎬 {lang==='el'?'Άνοιξε Wayback Timelapse ↗':'Open Wayback Timelapse ↗'}
        </button>
      </Section>

      {/* Privacy */}
      <Section icon="🔒" title={t.privacy}>
        <p style={{color:'#64748b',fontSize:'13px',lineHeight:'1.6',margin:'0 0 12px'}}>
          {lang==='el'
            ?`${finds.length} ευρήματα · ${sessions.length} συνεδρίες · Τοπική αποθήκευση · Κανένα cookie`
            :`${finds.length} finds · ${sessions.length} sessions · Local storage only · No cookies`}
        </p>
        <button onClick={()=>{if(window.confirm(t.confirmDelete)){setFinds([]);setSessions([]);localStorage.removeItem('fd_finds');localStorage.removeItem('fd_sessions')}}}
          style={{width:'100%',background:'#1e293b',border:'1px solid #ef4444',color:'#ef4444',padding:'12px',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
          {t.deleteAll}
        </button>
      </Section>

    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'14px',padding:'16px',marginBottom:'12px'}}>
      <div style={{color:'#94a3b8',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'12px'}}>{icon} {title}</div>
      {children}
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]           = useState(() => load('fd_lang','el'))
  const [gdpr, setGdpr]           = useState(() => !!load('fd_gdpr',false))
  const [fontSize, setFontSize]   = useState(() => load('fd_fontsize',15))
  const [finds, setFinds]         = useState(() => load('fd_finds',[]))
  const [sessions, setSessions]   = useState(() => load('fd_sessions',[]))
  const [screen, setScreen]       = useState('map')   // map | history | settings
  const [selectedFind, setSelectedFind]       = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [showFindModal, setShowFindModal]     = useState(false)
  const [sessionSummary, setSessionSummary]   = useState(null)
  const [tapMode, setTapMode]     = useState(false)
  const [tappedLoc, setTappedLoc] = useState(null)
  const [layerIdx, setLayerIdx]   = useState(0)
  const [showLayerMenu, setShowLayerMenu] = useState(false)

  // GPS session
  const [sessState, setSessState] = useState('idle')
  const [sessTime, setSessTime]   = useState(0)
  const [curPos, setCurPos]       = useState(null)
  const [route, setRoute]         = useState([])
  const [sessFinds, setSessFinds] = useState(0)
  const [sessId, setSessId]       = useState(null)
  const [locName, setLocName]     = useState('')
  const watchRef   = useRef(null)
  const timerRef   = useRef(null)
  const geocodedRef= useRef(false)
  const mapInstRef = useRef(null)
  const mapGetCenterRef = useRef(null)

  const t = useT(lang)

  // Persist lang
  useEffect(()=>persist('fd_lang',lang),[lang])

  // Saves
  const saveFinds    = (f) => persist('fd_finds',f)
  const saveSessions = (s) => persist('fd_sessions',s)

  const addFind = useCallback((f) => {
    setFinds(p=>{ const u=[f,...p]; saveFinds(u); return u })
    setSessFinds(c=>c+1)
  },[])
  const deleteFind = useCallback((id) => {
    setFinds(p=>{ const u=p.filter(f=>f.id!==id); saveFinds(u); return u })
  },[])

  // GPS
  const startGPS = () => {
    if (!navigator.geolocation) return
    geocodedRef.current = false
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const p = { lat:pos.coords.latitude, lng:pos.coords.longitude }
        setCurPos(p); setRoute(r=>[...r,p])
        if (!geocodedRef.current) {
          geocodedRef.current = true
          fetch(`/api/geocode?lat=${p.lat}&lng=${p.lng}`)
            .then(r=>r.json()).then(d=>{ if(d.name) setLocName(d.name) }).catch(()=>{})
        }
      },
      ()=>{}, { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }
    )
  }
  const stopGPS = () => { if(watchRef.current!==null){ navigator.geolocation.clearWatch(watchRef.current); watchRef.current=null } }

  const handleSession = (action) => {
    if (action==='start') {
      const id = Date.now()
      setSessId(id); setSessState('recording'); setSessTime(0); setRoute([]); setSessFinds(0); setLocName('')
      startGPS(); timerRef.current=setInterval(()=>setSessTime(x=>x+1),1000)
    } else if (action==='pause') {
      setSessState('paused'); stopGPS(); clearInterval(timerRef.current)
    } else if (action==='resume') {
      setSessState('recording'); startGPS(); timerRef.current=setInterval(()=>setSessTime(x=>x+1),1000)
    } else if (action==='stop') {
      setSessState('idle'); stopGPS(); clearInterval(timerRef.current)
      const dist = route.length>1 ? (route.reduce((a,p,i)=>i===0?a:a+haverD(route[i-1],p),0)/1000).toFixed(2) : '0.00'
      const ns = {
        id: sessId || Date.now(),
        name: locName ? `${locName} #${sessions.length+1}` : `Session #${sessions.length+1}`,
        date: new Date().toISOString().split('T')[0],
        duration: Math.floor(sessTime/60), distance: parseFloat(dist),
        finds: sessFinds, weather:'Live', location: locName||'GPS', route,
        elapsed: sessTime,
      }
      setSessions(p=>{ const u=[ns,...p]; saveSessions(u); return u })
      setSessionSummary(ns)
      setRoute([])
    }
  }
  useEffect(()=>()=>{ stopGPS(); clearInterval(timerRef.current) },[])

  // Auto-get position on app open (one-time, fast)
  useEffect(()=>{
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setCurPos({ lat:pos.coords.latitude, lng:pos.coords.longitude }),
      ()  => {},
      { enableHighAccuracy:true, timeout:8000, maximumAge:30000 }
    )
  },[])

  const handleMapClick = useCallback((latlng) => {
    if (!tapMode) return
    setTappedLoc(latlng); setTapMode(false); setShowFindModal(true)
  },[tapMode])

  const dist = route.length>1?(route.reduce((a,p,i)=>i===0?a:a+haverD(route[i-1],p),0)/1000).toFixed(2):'0.00'

  if (!gdpr) return (
    <div style={{background:'#020617',minHeight:'100vh',fontFamily:"'DM Sans',sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <GDPRModal lang={lang} onAccept={()=>{ setGdpr(true); persist('fd_gdpr',true) }}/>
    </div>
  )

  return (
    <div style={{background:'#020617',minHeight:'100vh',maxWidth:'430px',margin:'0 auto',display:'flex',flexDirection:'column',fontFamily:"'DM Sans',sans-serif",color:'#f8fafc',fontSize:fontSize+'px'}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box} input,select,button{font-family:'DM Sans',sans-serif;outline:none} ::-webkit-scrollbar{width:0}
        .fd-text{font-size:inherit!important} .fd-text-sm{font-size:0.87em!important} .fd-text-lg{font-size:1.2em!important}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .leaflet-container{background:#0f172a}
        .leaflet-control-container,.leaflet-pane,.leaflet-top,.leaflet-bottom{z-index:400!important}
      `}</style>

      {/* Overlays */}
      {showFindModal && (
        <FindModal lang={lang} sessions={sessions} pos={tappedLoc||curPos}
          onClose={()=>{ setShowFindModal(false); setTappedLoc(null) }}
          onSave={addFind}/>
      )}
      {selectedFind && (
        <FindDetail find={selectedFind} lang={lang}
          onClose={()=>setSelectedFind(null)}
          onDelete={(id)=>{ deleteFind(id); setSelectedFind(null) }}/>
      )}
      {selectedSession && (
        <SessionSummary session={{...selectedSession,elapsed:selectedSession.elapsed||selectedSession.duration*60}}
          finds={finds} lang={lang} onDone={()=>setSelectedSession(null)}/>
      )}
      {sessionSummary && (
        <SessionSummary session={sessionSummary} finds={finds} lang={lang}
          onDone={()=>setSessionSummary(null)}/>
      )}

      {/* Top bar */}
      <div style={{background:'#020617',padding:'10px 16px 8px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #1e293b',flexShrink:0,gap:'10px'}}>
        <div style={{color:'#d4a853',fontSize:'18px',fontWeight:'800',fontFamily:"'Playfair Display',serif",letterSpacing:'0.08em',flexShrink:0}}>
          🕵️ FieldDetective
        </div>
        <WeatherBar pos={curPos} lang={lang}/>
        <SOSButton pos={curPos} lang={lang}/>
      </div>

      {/* Session recording bar */}
      {sessState!=='idle' && (
        <div style={{background:sessState==='recording'?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)',borderBottom:`1px solid ${sessState==='recording'?'#ef444433':'#f59e0b33'}`,padding:'8px 16px',display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',flex:1}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:sessState==='recording'?'#ef4444':'#f59e0b',animation:sessState==='recording'?'pulse 1.5s infinite':'none',flexShrink:0}}/>
            <span style={{color:sessState==='recording'?'#ef4444':'#f59e0b',fontSize:'13px',fontWeight:'700'}}>{sessState==='recording'?t.rec:'⏸'}</span>
            <span style={{color:'#f8fafc',fontSize:'16px',fontWeight:'700',fontVariantNumeric:'tabular-nums',letterSpacing:'0.05em'}}>{fmtTime(sessTime)}</span>
            <span style={{color:'#64748b',fontSize:'12px'}}>{dist}km</span>
            {locName && <span style={{color:'#94a3b8',fontSize:'12px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>📍 {locName}</span>}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{flex:1,display:'flex',flexDirection:'column'}}>

        {/* MAP SCREEN */}
        {screen==='map' && (
          <div style={{display:'flex',flexDirection:'column'}}>



            {/* Map */}
            <div style={{flex:1,position:'relative',minHeight:'200px'}}>
              <MapComponent finds={finds} currentPos={curPos} routePoints={route}
                layerIdx={layerIdx} onMapClick={handleMapClick} tapMode={tapMode}
                mapGetCenterRef={mapGetCenterRef} mapInstRef={mapInstRef}/>

              {/* Layer button — floating top right */}
              <div style={{position:'absolute',top:'10px',right:'10px',zIndex:999}}>
                <button onClick={()=>setShowLayerMenu(l=>!l)}
                  style={{background:'rgba(15,23,42,0.88)',border:'1px solid #334155',color:MAP_LAYERS[layerIdx].emoji?'#f8fafc':'#94a3b8',borderRadius:'10px',padding:'8px 12px',cursor:'pointer',fontSize:'13px',fontWeight:'600',display:'flex',alignItems:'center',gap:'6px',backdropFilter:'blur(4px)'}}>
                  {MAP_LAYERS[layerIdx].emoji} {MAP_LAYERS[layerIdx].label[lang]}
                  <span style={{color:'#64748b',fontSize:'10px'}}>{showLayerMenu?'▲':'▼'}</span>
                </button>
                {showLayerMenu && (
                  <div style={{position:'absolute',top:'42px',right:0,background:'#0f172a',border:'1px solid #334155',borderRadius:'12px',padding:'6px',minWidth:'160px',zIndex:1000,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
                    {MAP_LAYERS.map((l,idx)=>(
                      <button key={l.k} onClick={()=>{setLayerIdx(idx);setShowLayerMenu(false)}}
                        style={{width:'100%',background:layerIdx===idx?'#d4a853':'transparent',border:'none',color:layerIdx===idx?'#0f172a':'#94a3b8',borderRadius:'8px',padding:'10px 12px',cursor:'pointer',fontSize:'13px',fontWeight:layerIdx===idx?'700':'400',textAlign:'left',display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
                        <span style={{fontSize:'18px'}}>{l.emoji}</span>{l.label[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tap banner */}
              {tapMode && (
                <div style={{position:'absolute',top:0,left:0,right:0,zIndex:9999,background:'rgba(212,168,83,0.95)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{color:'#0f172a',fontSize:'14px',fontWeight:'700'}}>📍 {t.pinActive}</span>
                  <button onClick={()=>setTapMode(false)} style={{background:'rgba(0,0,0,0.2)',border:'none',color:'#0f172a',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px',fontWeight:'600'}}>✕</button>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{background:'#0f172a',borderTop:'1px solid #1e293b',padding:'12px 14px 14px',flexShrink:0}}>
              {sessState==='idle' ? (
                <button onClick={()=>handleSession('start')}
                  style={{width:'100%',background:'linear-gradient(135deg,#d4a853,#b8882f)',border:'none',color:'#0f172a',padding:'16px',borderRadius:'14px',fontWeight:'700',fontSize:'17px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 4px 20px rgba(212,168,83,0.35)'}}>
                  ▶ {t.start}
                </button>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {/* Pin button */}
                  {sessState==='recording' && (
                    <button onClick={()=>setTapMode(x=>!x)}
                      style={{width:'100%',background:tapMode?'rgba(212,168,83,0.12)':'linear-gradient(135deg,#1e3a5f,#0f2340)',border:`2px solid ${tapMode?'#d4a853':'#3b82f6'}`,color:tapMode?'#d4a853':'#60a5fa',padding:'13px',borderRadius:'12px',fontWeight:'700',fontSize:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
                      📍 {tapMode?t.pinActive:t.pin}
                    </button>
                  )}
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={()=>handleSession(sessState==='recording'?'pause':'resume')}
                      style={{flex:1,background:'#1e293b',border:`1px solid ${sessState==='recording'?'#f59e0b':'#22c55e'}`,color:sessState==='recording'?'#f59e0b':'#22c55e',padding:'13px',borderRadius:'11px',fontWeight:'700',fontSize:'15px',cursor:'pointer'}}>
                      {sessState==='recording'?`⏸ ${t.pause}`:`▶ ${t.resume}`}
                    </button>
                    <button onClick={()=>handleSession('stop')}
                      style={{flex:1,background:'#ef4444',border:'none',color:'white',padding:'13px',borderRadius:'11px',fontWeight:'700',fontSize:'15px',cursor:'pointer'}}>
                      ■ {t.stop}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORY SCREEN */}
        {screen==='history' && (
          <div style={{flex:1,overflowY:'auto',animation:'fadeUp 0.2s ease',position:'relative'}}>
            <HistoryScreen finds={finds} sessions={sessions} lang={lang}
              onSelectFind={setSelectedFind}
              onSelectSession={setSelectedSession}
              onDeleteFind={deleteFind}/>
            {/* FAB — add find from History screen */}
            <button onClick={()=>setShowFindModal(true)}
              style={{position:'fixed',bottom:'80px',right:'20px',width:'58px',height:'58px',borderRadius:'50%',background:'#d4a853',border:'none',cursor:'pointer',boxShadow:'0 4px 24px rgba(212,168,83,0.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',zIndex:100}}>
              +
            </button>
          </div>
        )}

        {/* SETTINGS SCREEN */}
        {screen==='settings' && (
          <div style={{flex:1,overflowY:'auto',animation:'fadeUp 0.2s ease'}}>
            <SettingsScreen lang={lang} setLang={setLang} fontSize={fontSize} setFontSize={setFontSize}
              finds={finds} setFinds={setFinds} sessions={sessions} setSessions={setSessions}
              layerIdx={layerIdx} setLayerIdx={setLayerIdx}/>
          </div>
        )}

      </div>

      {/* Bottom navigation — 3 items only */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'430px',background:'#0f172a',borderTop:'1px solid #1e293b',display:'flex',zIndex:80,paddingBottom:'6px'}}>
        {[
          {id:'map',     emoji:'🗺️', label:lang==='el'?'Χάρτης':'Map'},
          {id:'history', emoji:'📍', label:lang==='el'?'Ευρήματα':'Finds'},
          {id:'settings',emoji:'⚙️', label:lang==='el'?'Ρυθμίσεις':'Settings'},
        ].map(({id,emoji,label})=>(
          <button key={id} onClick={()=>setScreen(id)}
            style={{flex:1,background:'none',border:'none',cursor:'pointer',padding:'9px 4px 5px',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',position:'relative'}}>
            {id==='map'&&sessState==='recording'&&<div style={{position:'absolute',top:'6px',right:'22%',width:'7px',height:'7px',borderRadius:'50%',background:'#ef4444',border:'1.5px solid #0f172a'}}/>}
            <span style={{fontSize:'20px',filter:screen===id?'none':'grayscale(0.4)'}}>{emoji}</span>
            <span style={{fontSize:'10px',color:screen===id?'#d4a853':'#475569',fontWeight:screen===id?'700':'400'}}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
