import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const handleLogin = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false }
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', padding:'32px 24px' }}>
      <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
        <div style={{ fontSize:36, fontWeight:700, color:'var(--accent-light)', marginBottom:8 }}>₹</div>
        <h1 style={{ fontSize:20, fontWeight:600, color:'var(--text-primary)' }}>Expense Tracker</h1>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>Sign in with your email to continue</p>

        {sent ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center' }}>
            <i className="ti ti-mail-check" style={{ fontSize:40, color:'var(--text-secondary)' }} />
            <p style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
              Magic link sent to <strong style={{ color:'var(--text-primary)' }}>{email}</strong>
            </p>
          </div>
        ) : (
          <>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="email"
              style={{
                width:'100%', background:'var(--bg-surface)',
                border:'0.5px solid var(--border-default)', borderRadius:'var(--radius-md)',
                padding:'14px 16px', fontSize:14, color:'var(--text-primary)', outline:'none',
              }}
            />
            {error && <p style={{ fontSize:12, color:'var(--danger)', alignSelf:'flex-start' }}>{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || !email.trim()}
              style={{
                width:'100%', background:'var(--accent-light)', color:'var(--bg-base)',
                borderRadius:'var(--radius-md)', padding:'14px', fontSize:14, fontWeight:600,
                opacity: (loading || !email.trim()) ? 0.4 : 1,
              }}
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}