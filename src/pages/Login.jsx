import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login({ mode: initialMode }) {
  const [mode, setMode] = useState(initialMode || 'login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNote('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        setNote('Check your email to confirm your account, then log in.')
        setMode('login')
      } else if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (resetError) throw resetError
        setNote('Check your email for a link to reset your password.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        navigate('/app')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setNote('')
  }

  const titles = {
    login: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
  }
  const subs = {
    login: 'Log in to your journal.',
    signup: 'Free to start — no card required.',
    forgot: "Enter your email and we'll send you a reset link.",
  }

  return (
    <div className="splash-bg">
      <nav className="splash-nav">
        <Link className="splash-logo" to="/">Ledger <span>&</span> Light</Link>
      </nav>
      <div className="auth-wrap">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>{titles[mode]}</h2>
          <div className="sub">{subs[mode]}</div>

          {error && <div className="auth-error">{error}</div>}
          {note && <div className="auth-note">{note}</div>}

          <div className="auth-field">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          {mode !== 'forgot' && (
            <div className="auth-field">
              <label>Password</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 14 }}>
              <button type="button" onClick={() => switchMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--splash-muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>
                Forgot password?
              </button>
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Log in'}
          </button>

          <div className="auth-toggle">
            {mode === 'signup' && (
              <>Already have an account? <button type="button" onClick={() => switchMode('login')}>Log in</button></>
            )}
            {mode === 'login' && (
              <>New here? <button type="button" onClick={() => switchMode('signup')}>Create an account</button></>
            )}
            {mode === 'forgot' && (
              <>Remembered it? <button type="button" onClick={() => switchMode('login')}>Back to log in</button></>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}