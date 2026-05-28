import { useState, useEffect } from 'react'
import { supabase, updateProfile, uploadFinds, uploadSessions } from '../lib/supabase'

const EXPERIENCE = ['beginner','intermediate','expert']
const EXP_LABELS = {
  el: { beginner:'Αρχάριος', intermediate:'Μεσαίος', expert:'Έμπειρος' },
  en: { beginner:'Beginner', intermediate:'Intermediate', expert:'Expert' },
}

export default function ProfileScreen({ user, profile, lang, finds, sessions, onProfileUpdate, onSignOut }) {
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState(profile || {})
  const [saving, setSaving]     = useState(false)
  const [syncing, setSyncing]   = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [error, setError]       = useState(null)
  const el = lang === 'el'
  const t = {
    el: {
      title:'Προφίλ', memberNo:'Αριθμός Μέλους', edit:'Επεξεργασία',
      save:'Αποθήκευση', cancel:'Ακύρωση', name:'Ονοματεπώνυμο',
      username:'Όνομα χρήστη', detector:'Μοντέλο ανιχνευτή',
      location:'Τοποθεσία', experience:'Εμπειρία', bio:'Σχετικά με εμένα',
      public:'Δημόσιο προφίλ', consent:'Επιτρέπω upload δεδομένων',
      syncNow:'☁️ Sync στο cloud', syncing:'Ανέβασμα...', syncDone:'✅ Ολοκληρώθηκε!',
      stats:'Στατιστικά', signout:'Αποσύνδεση',
      totalFinds:'Ευρήματα', totalSessions:'Συνεδρίες',
    },
    en: {
      title:'Profile', memberNo:'Member Number', edit:'Edit',
      save:'Save', cancel:'Cancel', name:'Full Name',
      username:'Username', detector:'Detector Model',
      location:'Location', experience:'Experience', bio:'About me',
      public:'Public profile', consent:'Allow data upload',
      syncNow:'☁️ Sync to cloud', syncing:'Uploading...', syncDone:'✅ Complete!',
      stats:'Statistics', signout:'Sign Out',
      totalFinds:'Finds', totalSessions:'Sessions',
    },
  }[lang] || {}

  const save = async () => {
    setSaving(true); setError(null)
    const { data, error } = await updateProfile(user.id, {
      full_name:      form.full_name,
      username:       form.username,
      detector_model: form.detector_model,
      location:       form.location,
      experience:     form.experience,
      bio:            form.bio,
      is_public:      form.is_public,
      upload_consent: form.upload_consent,
    })
    if (error) setError(error.message)
    else { onProfileUpdate(data); setEditing(false) }
    setSaving(false)
  }

  const syncData = async () => {
    if (!profile?.upload_consent) {
      setError(el?'Ενεργοποίησε πρώτα το upload consent':'Enable upload consent first')
      return
    }
    setSyncing(true); setSyncResult(null); setError(null)
    try {
      await uploadFinds(user.id, finds)
      await uploadSessions(user.id, sessions)
      setSyncResult({ finds: finds.length, sessions: sessions.length })
    } catch(e) { setError(e.message) }
    setSyncing(false)
  }

  const f = editing ? form : (profile || {})

  return (
    <div style={{padding:'16px 16px 100px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'20px'}}>
        <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'linear-gradient(135deg,#d4a853,#b8882f)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px',flexShrink:0}}>
          🕵️
        </div>
        <div style={{flex:1}}>
          <div style={{color:'#f8fafc',fontSize:'18px',fontWeight:'700',fontFamily:"'Playfair Display',serif"}}>{f.full_name || user.email}</div>
          <div style={{color:'#64748b',fontSize:'13px'}}>@{f.username || '—'}</div>
          {f.member_number && (
            <div style={{background:'rgba(212,168,83,0.1)',border:'1px solid #d4a853',borderRadius:'6px',padding:'2px 8px',display:'inline-block',marginTop:'4px'}}>
              <span style={{color:'#d4a853',fontSize:'11px',fontWeight:'700',fontFamily:'monospace'}}>🆔 {f.member_number}</span>
            </div>
          )}
        </div>
        <button onClick={()=>{ if(editing) save(); else setEditing(true) }}
          style={{background:editing?'#d4a853':'#1e293b',border:`1px solid ${editing?'#d4a853':'#334155'}`,color:editing?'#0f172a':'#94a3b8',borderRadius:'10px',padding:'8px 14px',cursor:'pointer',fontWeight:'600',fontSize:'13px'}}>
          {editing ? (saving?'...':t.save) : t.edit}
        </button>
      </div>

      {error && <div style={{background:'#ef444422',border:'1px solid #ef4444',borderRadius:'10px',padding:'10px 14px',marginBottom:'12px',color:'#fca5a5',fontSize:'13px'}}>⚠️ {error}</div>}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'16px'}}>
        {[[finds.length, t.totalFinds, '📍'],[sessions.length, t.totalSessions, '🗺️']].map(([v,lbl,ic])=>(
          <div key={lbl} style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'12px',padding:'14px',textAlign:'center'}}>
            <div style={{fontSize:'22px',marginBottom:'4px'}}>{ic}</div>
            <div style={{color:'#f8fafc',fontSize:'22px',fontWeight:'800'}}>{v}</div>
            <div style={{color:'#64748b',fontSize:'12px'}}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Edit form */}
      {editing ? (
        <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'14px',padding:'16px',marginBottom:'14px'}}>
          {[
            [t.name,        'full_name',      'text', 'John Smith'],
            [t.username,    'username',       'text', 'john_smith'],
            [t.detector,    'detector_model', 'text', 'Minelab Equinox 800'],
            [t.location,    'location',       'text', 'Tripoli, Greece'],
          ].map(([lbl,key,type,ph])=>(
            <div key={key} style={{marginBottom:'12px'}}>
              <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{lbl}</label>
              <input type={type} value={form[key]||''} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px 13px',color:'#f8fafc',fontSize:'14px',boxSizing:'border-box',outline:'none'}}/>
            </div>
          ))}

          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'7px'}}>{t.experience}</label>
            <div style={{display:'flex',gap:'8px'}}>
              {EXPERIENCE.map(ex=>(
                <button key={ex} onClick={()=>setForm(f=>({...f,experience:ex}))}
                  style={{flex:1,background:form.experience===ex?'#d4a853':'#1e293b',border:'none',color:form.experience===ex?'#0f172a':'#64748b',borderRadius:'8px',padding:'9px 4px',cursor:'pointer',fontSize:'12px',fontWeight:form.experience===ex?'700':'400'}}>
                  {EXP_LABELS[lang][ex]}
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{t.bio}</label>
            <textarea value={form.bio||''} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} rows={3} placeholder="..."
              style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'11px 13px',color:'#f8fafc',fontSize:'14px',boxSizing:'border-box',outline:'none',resize:'vertical'}}/>
          </div>

          {[['is_public',t.public,'👁️'],['upload_consent',t.consent,'☁️']].map(([key,lbl,ic])=>(
            <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid #1e293b'}}>
              <span style={{color:'#94a3b8',fontSize:'13px'}}>{ic} {lbl}</span>
              <button onClick={()=>setForm(f=>({...f,[key]:!f[key]}))}
                style={{width:'44px',height:'24px',borderRadius:'12px',border:'none',background:form[key]?'#d4a853':'#334155',cursor:'pointer',transition:'background 0.2s',position:'relative'}}>
                <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'white',position:'absolute',top:'3px',transition:'left 0.2s',left:form[key]?'23px':'3px'}}/>
              </button>
            </div>
          ))}

          <div style={{display:'flex',gap:'10px',marginTop:'14px'}}>
            <button onClick={()=>setEditing(false)} style={{flex:1,background:'#1e293b',border:'1px solid #334155',color:'#94a3b8',padding:'12px',borderRadius:'10px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>{t.cancel}</button>
            <button onClick={save} disabled={saving} style={{flex:2,background:'#d4a853',border:'none',color:'#0f172a',padding:'12px',borderRadius:'10px',cursor:'pointer',fontWeight:'700',fontSize:'14px'}}>{saving?'...' :t.save}</button>
          </div>
        </div>
      ) : (
        /* View mode */
        <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'14px',padding:'16px',marginBottom:'14px'}}>
          {f.detector_model && <Row ic="🔧" lbl={t.detector} v={f.detector_model}/>}
          {f.location       && <Row ic="📍" lbl={t.location} v={f.location}/>}
          {f.experience     && <Row ic="⭐" lbl={t.experience} v={EXP_LABELS[lang][f.experience]}/>}
          {f.bio            && <div style={{color:'#94a3b8',fontSize:'13px',lineHeight:'1.6',paddingTop:'10px',borderTop:'1px solid #1e293b',marginTop:'4px'}}>{f.bio}</div>}
          {!f.detector_model && !f.location && !f.experience && !f.bio && (
            <div style={{color:'#475569',fontSize:'13px',textAlign:'center',padding:'10px'}}>{el?'Πάτα Επεξεργασία για να συμπληρώσεις το προφίλ σου':'Tap Edit to fill in your profile'}</div>
          )}
        </div>
      )}

      {/* Cloud Sync */}
      <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:'14px',padding:'16px',marginBottom:'14px'}}>
        <div style={{color:'#94a3b8',fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'12px'}}>☁️ Cloud Sync</div>
        {!profile?.upload_consent && (
          <div style={{color:'#64748b',fontSize:'13px',marginBottom:'10px'}}>{el?'Ενεργοποίησε το "Επιτρέπω upload" για να κάνεις sync.':'Enable "Allow upload" to sync your data.'}</div>
        )}
        <button onClick={syncData} disabled={syncing||!profile?.upload_consent}
          style={{width:'100%',background:profile?.upload_consent?'linear-gradient(135deg,#1e3a5f,#0f2340)':'#1e293b',border:`1px solid ${profile?.upload_consent?'#3b82f6':'#334155'}`,color:profile?.upload_consent?'#60a5fa':'#475569',padding:'13px',borderRadius:'10px',cursor:profile?.upload_consent?'pointer':'not-allowed',fontWeight:'600',fontSize:'14px'}}>
          {syncing ? t.syncing : t.syncNow}
        </button>
        {syncResult && (
          <div style={{color:'#22c55e',fontSize:'12px',textAlign:'center',marginTop:'8px'}}>
            {t.syncDone} {syncResult.finds} {t.totalFinds} · {syncResult.sessions} {t.totalSessions}
          </div>
        )}
      </div>

      {/* Sign out */}
      <button onClick={onSignOut}
        style={{width:'100%',background:'#1e293b',border:'1px solid #ef4444',color:'#ef4444',padding:'13px',borderRadius:'12px',cursor:'pointer',fontWeight:'600',fontSize:'14px'}}>
        🚪 {t.signout}
      </button>
    </div>
  )
}

function Row({ ic, lbl, v }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #0f172a'}}>
      <span style={{color:'#64748b',fontSize:'13px'}}>{ic} {lbl}</span>
      <span style={{color:'#f8fafc',fontSize:'13px',fontWeight:'600'}}>{v}</span>
    </div>
  )
}
