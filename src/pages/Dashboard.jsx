import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'
import '../app.css'
import TradesPanel from '../components/TradesPanel.jsx'
import JournalPanel from '../components/JournalPanel.jsx'

export default function Dashboard() {
  const [tab, setTab] = useState('trades')
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="jl-root">
      <div className="jl-header">
        <div>
          <div className="jl-title">Ledger <span>&amp;</span> Light</div>
          <div className="jl-subtitle">{user?.email}</div>
        </div>
        <button className="jl-btn secondary" onClick={handleLogout}>Log out</button>
      </div>

      <div className="jl-tabs">
        <div className={`jl-tab trades ${tab === 'trades' ? 'active' : ''}`} onClick={() => setTab('trades')}>
          <span className="jl-tab-dot" /> Trades
        </div>
        <div className={`jl-tab journal ${tab === 'journal' ? 'active' : ''}`} onClick={() => setTab('journal')}>
          <span className="jl-tab-dot" /> Journal
        </div>
      </div>

      {tab === 'trades' ? (
        <div className="jl-panel"><TradesPanel /></div>
      ) : (
        <div className="jl-panel journal-mode"><JournalPanel /></div>
      )}
    </div>
  )
}
