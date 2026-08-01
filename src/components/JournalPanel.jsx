import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'

function today() { return new Date().toISOString().slice(0, 10) }

export default function JournalPanel() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(today())
  const [entry, setEntry] = useState({ highlight: '', text: '' })
  const [goals, setGoals] = useState([])
  const [goalInput, setGoalInput] = useState('')
  const [pastEntries, setPastEntries] = useState([])
  const [savedNote, setSavedNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) loadAll() }, [user])
  useEffect(() => { if (user) loadDay(selectedDate) }, [selectedDate, user])

  async function loadAll() {
    setLoading(true)
    await loadPastList()
    await loadDay(selectedDate)
    setLoading(false)
  }

  async function loadDay(date) {
    const { data: entryRow } = await supabase.from('journal_entries').select('*').eq('date', date).maybeSingle()
    setEntry({ highlight: entryRow?.highlight || '', text: entryRow?.text || '' })
    const { data: goalRows } = await supabase.from('goals').select('*').eq('date', date).order('created_at', { ascending: true })
    setGoals(goalRows || [])
    setSavedNote(entryRow ? 'Saved' : 'Not saved yet')
  }

  async function loadPastList() {
    const { data: entries } = await supabase.from('journal_entries').select('*').order('date', { ascending: false }).limit(40)
    const { data: allGoals } = await supabase.from('goals').select('date, done')
    const grouped = (entries || []).map(e => {
      const dayGoals = (allGoals || []).filter(g => g.date === e.date)
      return { ...e, doneCount: dayGoals.filter(g => g.done).length, totalCount: dayGoals.length }
    })
    setPastEntries(grouped)
  }

  async function addGoal() {
    const text = goalInput.trim()
    if (!text) return
    const { data, error } = await supabase.from('goals').insert({ user_id: user.id, date: selectedDate, text, done: false }).select().single()
    if (!error) { setGoals([...goals, data]); setGoalInput('') }
  }

  async function toggleGoal(id) {
    const g = goals.find(x => x.id === id)
    await supabase.from('goals').update({ done: !g.done }).eq('id', id)
    setGoals(goals.map(x => x.id === id ? { ...x, done: !x.done } : x))
  }

  async function deleteGoal(id) {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(goals.filter(x => x.id !== id))
  }

  async function saveEntry() {
    const { error } = await supabase.from('journal_entries').upsert(
      { user_id: user.id, date: selectedDate, highlight: entry.highlight, text: entry.text },
      { onConflict: 'user_id,date' }
    )
    if (!error) { setSavedNote('Saved just now'); loadPastList() }
  }

  if (loading) return <div className="jl-empty" style={{ color: '#8a8368' }}>Loading…</div>

  return (
    <div>
      <div className="jl-row">
        <div className="jl-section-title" style={{ color: '#2a2620' }}>Today, in ink</div>
        <input type="date" className="jl-date-picker" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
      </div>
      <div className="jl-jrow">
        <div className="jl-jmain">
          <div className="jl-hl-box">
            <label>The one thing that matters most today</label>
            <input
              type="text"
              placeholder="What, if nothing else gets done, would make today a win?"
              value={entry.highlight}
              onChange={e => setEntry({ ...entry, highlight: e.target.value })}
            />
          </div>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a6a1f', fontWeight: 700, marginBottom: 8 }}>Today's goals</div>
          <div className="jl-goal-add">
            <input
              type="text"
              placeholder="Add something you want to get done…"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGoal()}
            />
            <button className="jl-btn small" onClick={addGoal}>Add</button>
          </div>
          <ul className="jl-goal-list">
            {goals.length === 0 && <div style={{ color: '#8a8368', fontSize: 12.5, padding: '6px 4px' }}>No goals added for this day yet.</div>}
            {goals.map(g => (
              <li className={`jl-goal-item ${g.done ? 'done' : ''}`} key={g.id}>
                <input type="checkbox" checked={g.done} onChange={() => toggleGoal(g.id)} />
                <span>{g.text}</span>
                <button onClick={() => deleteGoal(g.id)}>✕</button>
              </li>
            ))}
          </ul>

          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a6a1f', fontWeight: 700, marginBottom: 8 }}>Journal entry</div>
          <textarea
            className="jl-journal-text"
            placeholder="What happened today? How did it feel? Anything worth remembering…"
            value={entry.text}
            onChange={e => setEntry({ ...entry, text: e.target.value })}
          />
          <div className="jl-save-row">
            <span className="jl-saved-note">{savedNote}</span>
            <button className="jl-btn" onClick={saveEntry}>Save entry</button>
          </div>
        </div>

        <div className="jl-jside">
          <div className="jl-past-title">Past entries</div>
          {pastEntries.filter(e => e.date !== selectedDate).length === 0 && (
            <div className="jl-empty" style={{ color: '#8a8368' }}>Nothing here yet.</div>
          )}
          {pastEntries.filter(e => e.date !== selectedDate).map(e => (
            <div className="jl-past-entry" key={e.date} onClick={() => setSelectedDate(e.date)}>
              <div className="jl-past-date">{e.date}</div>
              {e.highlight && <div className="jl-past-hl">"{e.highlight}"</div>}
              <div className="jl-past-goals">{e.totalCount ? `${e.doneCount}/${e.totalCount} goals done` : 'No goals logged'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
