import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login({ mode: initialMode }) {
  const [mode, setMode] = useState(initialMode || 'login')
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

  return (
    <div className="splash-bg">
      <nav className="splash-nav">
        <Link className="splash-logo" to="/">Ledger <span>&</span> Light</Link>
      </nav>
      <div className="auth-wrap">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
          <div className="sub">
            {mode === 'signup' ? 'Free to start — no card required.' : 'Log in to your journal.'}
          </div>

          {error && <div className="auth-error">{error}</div>}
          {note && <div className="auth-note">{note}</div>}

          <div className="auth-field">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>

          <div className="auth-toggle">
            {mode === 'signup' ? (
              <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); setNote('') }}>Log in</button></>
            ) : (
              <>New here? <button type="button" onClick={() => { setMode('signup'); setError(''); setNote('') }}>Create an account</button></>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
