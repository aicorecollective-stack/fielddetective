import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthModal({ lang, onClose, onAuth }) {
  const [mode, setMode]       = useState('login')  // login | register | forgot
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(null)
  const el = lang === 'el'

  const handle = async () => {
    setLoading(true); setError(null); setSuccess(null)
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) throw error
        setSuccess(el ? 'Ελέγξε το email σου για επιβεβαίωση!' : 'Check your email to confirm!')
      } else if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth(data.user, data.session)
        onClose()
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess(el ? 'Στάλθηκε email επαναφοράς!' : 'Password reset email sent!')
      }
    } catch(e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'#0f172a',border:'1px solid #334155',borderRadius:'20px',padding:'28px',maxWidth:'380px',width:'100%'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'20px'}}>
          <div style={{fontSize:'36px',marginBottom:'8px'}}>🕵️</div>
          <h2 style={{color:'#d4a853',fontSize:'20px',fontFamily:"'Playfair Display',serif",margin:'0 0 4px'}}>FieldDetective</h2>
          <div style={{color:'#64748b',fontSize:'13px'}}>
            {mode==='login' ? (el?'Σύνδεση':'Sign In') : mode==='register' ? (el?'Εγγραφή':'Create Account') : (el?'Επαναφορά κωδικού':'Reset Password')}
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          {['login','register'].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError(null);setSuccess(null)}}
              style={{flex:1,background:mode===m?'#d4a853':'#1e293b',border:'none',color:mode===m?'#0f172a':'#64748b',padding:'10px',borderRadius:'10px',cursor:'pointer',fontWeight:mode===m?'700':'400',fontSize:'14px'}}>
              {m==='login'?(el?'Σύνδεση':'Login'):(el?'Εγγραφή':'Register')}
            </button>
          ))}
        </div>

        {/* Fields */}
        {mode==='register' && (
          <div style={{marginBottom:'12px'}}>
            <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{el?'Ονοματεπώνυμο':'Full Name'}</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder={el?'Γιώργης Παπαδόπουλος':'John Smith'}
              style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'12px',color:'#f8fafc',fontSize:'15px',boxSizing:'border-box',outline:'none'}}/>
          </div>
        )}

        <div style={{marginBottom:'12px'}}>
          <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
            style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'12px',color:'#f8fafc',fontSize:'15px',boxSizing:'border-box',outline:'none'}}/>
        </div>

        {mode !== 'forgot' && (
          <div style={{marginBottom:'20px'}}>
            <label style={{display:'block',color:'#64748b',fontSize:'12px',marginBottom:'5px'}}>{el?'Κωδικός':'Password'}</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
              style={{width:'100%',background:'#1e293b',border:'1px solid #334155',borderRadius:'10px',padding:'12px',color:'#f8fafc',fontSize:'15px',boxSizing:'border-box',outline:'none'}}/>
          </div>
        )}

        {error   && <div style={{background:'#ef444422',border:'1px solid #ef4444',borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',color:'#fca5a5',fontSize:'13px'}}>⚠️ {error}</div>}
        {success && <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid #22c55e',borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',color:'#4ade80',fontSize:'13px'}}>✅ {success}</div>}

        <button onClick={handle} disabled={loading||!email||(mode!=='forgot'&&!password)}
          style={{width:'100%',background:loading?'#334155':'#d4a853',border:'none',color:loading?'#64748b':'#0f172a',padding:'14px',borderRadius:'12px',fontWeight:'700',fontSize:'16px',cursor:loading?'not-allowed':'pointer',marginBottom:'12px'}}>
          {loading ? '⏳...' : mode==='login'?(el?'Σύνδεση →':'Sign In →'):mode==='register'?(el?'Δημιουργία λογαριασμού':'Create Account'):(el?'Αποστολή email':'Send Email')}
        </button>

        <div style={{display:'flex',justifyContent:'space-between'}}>
          {mode==='login' && <button onClick={()=>setMode('forgot')} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:'12px'}}>{el?'Ξέχασες τον κωδικό;':'Forgot password?'}</button>}
          <button onClick={onClose} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'12px',marginLeft:'auto'}}>
            {el?'Παράλειψη (χωρίς λογαριασμό)':'Skip (use without account)'}
          </button>
        </div>
      </div>
    </div>
  )
}
