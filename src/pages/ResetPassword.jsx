import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNote('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setNote('Password updated. Taking you to your journal…')
      setTimeout(() => navigate('/app'), 1500)
    } catch (err) {
      setError(err.message || 'Something went wrong. The reset link may have expired — request a new one.')
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
          <h2>Set a new password</h2>
          <div className="sub">Choose a new password for your account.</div>

          {error && <div className="auth-error">{error}</div>}
          {note && <div className="auth-note">{note}</div>}

          <div className="auth-field">
            <label>New password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div className="auth-field">
            <label>Confirm password</label>
            <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your new password" />
          </div>

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>

          <div className="auth-toggle">
            <Link to="/login">Back to log in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}