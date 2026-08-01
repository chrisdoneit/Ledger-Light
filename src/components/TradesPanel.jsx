import { useEffect, useMemo, useState, Fragment } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/useAuth'

function fmtMoney(n) {
  const sign = n < 0 ? '-' : ''
  return sign + '$' + Math.abs(n).toFixed(2)
}

function parseNum(raw) {
  if (raw === undefined || raw === null) return NaN
  let s = String(raw).trim()
  if (!s) return NaN
  let negative = false
  if (s.includes('(') && s.includes(')')) negative = true
  if (s.startsWith('-')) negative = true
  s = s.replace(/[^0-9.]/g, '')
  const n = parseFloat(s)
  if (isNaN(n)) return NaN
  return negative ? -Math.abs(n) : n
}

function normalizeDate(raw) {
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return String(raw).slice(0, 10)
}

const FIELD_DEFS = [
  { key: 'date', label: 'Date', required: true, kw: ['date', 'time', 'opened', 'closed'] },
  { key: 'symbol', label: 'Symbol', required: true, kw: ['symbol', 'ticker', 'instrument', 'pair', 'market'] },
  { key: 'direction', label: 'Direction (long/short)', required: false, kw: ['direction', 'side', 'type', 'action'] },
  { key: 'entry', label: 'Entry price', required: false, kw: ['entry', 'open price', 'buy price', 'avg price'] },
  { key: 'exit', label: 'Exit price', required: false, kw: ['exit', 'close price', 'sell price'] },
  { key: 'size', label: 'Size / Qty', required: false, kw: ['size', 'qty', 'quantity', 'contracts', 'shares', 'volume'] },
  { key: 'pnl', label: 'P&L (if already calculated)', required: false, kw: ['pnl', 'p&l', 'profit', 'net', 'realized'] },
  { key: 'notes', label: 'Notes', required: false, kw: ['note', 'comment', 'description'] },
]
function guessColumn(headers, kw) {
  const lower = headers.map(h => h.toLowerCase())
  for (const k of kw) {
    const idx = lower.findIndex(h => h.includes(k))
    if (idx > -1) return headers[idx]
  }
  return ''
}

export default function TradesPanel() {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [startingBalance, setStartingBalance] = useState(0)
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [showAddModal, setShowAddModal] = useState(false)
  const [csvHeaders, setCsvHeaders] = useState(null)
  const [csvRows, setCsvRows] = useState([])
  const [csvMap, setCsvMap] = useState({})
  const [importNote, setImportNote] = useState('')
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => { if (user) init() }, [user])

  async function init() {
    setLoading(true)
    const { data: profile } = await supabase.from('profiles').select('starting_balance').eq('id', user.id).maybeSingle()
    if (!profile) {
      await supabase.from('profiles').insert({ id: user.id, starting_balance: 0 })
      setStartingBalance(0)
    } else {
      setStartingBalance(Number(profile.starting_balance) || 0)
    }
    await loadTrades()
    setLoading(false)
  }

  async function loadTrades() {
    const { data, error } = await supabase.from('trades').select('*').order('date', { ascending: false })
    if (!error) setTrades(data || [])
  }

  async function updateStartingBalance(val) {
    const num = parseFloat(val) || 0
    setStartingBalance(num)
    await supabase.from('profiles').update({ starting_balance: num }).eq('id', user.id)
  }

  const stats = useMemo(() => {
    const total = trades.length
    const wins = trades.filter(t => t.pnl > 0)
    const losses = trades.filter(t => t.pnl < 0)
    const totalPnl = trades.reduce((a, t) => a + Number(t.pnl), 0)
    const winRate = total ? (wins.length / total * 100) : 0
    const avgWin = wins.length ? wins.reduce((a, t) => a + Number(t.pnl), 0) / wins.length : 0
    const avgLoss = losses.length ? losses.reduce((a, t) => a + Number(t.pnl), 0) / losses.length : 0
    const grossWin = wins.reduce((a, t) => a + Number(t.pnl), 0)
    const grossLoss = Math.abs(losses.reduce((a, t) => a + Number(t.pnl), 0))
    const profitFactor = grossLoss ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0)
    return { total, wins: wins.length, losses: losses.length, totalPnl, winRate, avgWin, avgLoss, profitFactor }
  }, [trades])

  function cumulativeBalanceAsOf(dateStr) {
    let sum = startingBalance
    trades.forEach(t => { if (t.date <= dateStr) sum += Number(t.pnl) })
    return sum
  }

  async function deleteTrade(id) {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(trades.filter(t => t.id !== id))
  }

  async function uploadPhoto(file) {
    const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('screenshots').upload(path, file)
    if (error) { console.error(error); return null }
    const { data } = supabase.storage.from('screenshots').getPublicUrl(path)
    return data.publicUrl
  }

  async function addTrade(form) {
    const pnl = (form.exit - form.entry) * form.size * (form.direction === 'long' ? 1 : -1)
    let photo_url = null
    if (form.photoFile) photo_url = await uploadPhoto(form.photoFile)
    const { data, error } = await supabase.from('trades').insert({
      user_id: user.id, date: form.date, symbol: form.symbol.toUpperCase(),
      direction: form.direction, size: form.size, entry: form.entry, exit: form.exit,
      pnl, photo_url, notes: form.notes,
    }).select().single()
    if (!error) setTrades([data, ...trades])
    setShowAddModal(false)
  }

  async function attachPhoto(tradeId, file) {
    const url = await uploadPhoto(file)
    if (!url) return
    await supabase.from('trades').update({ photo_url: url }).eq('id', tradeId)
    setTrades(trades.map(t => t.id === tradeId ? { ...t, photo_url: url } : t))
  }

  function handleCsvFile(e) {
    const file = e.target.files[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        setCsvRows(results.data)
        const headers = results.meta.fields || []
        setCsvHeaders(headers)
        const guessed = {}
        FIELD_DEFS.forEach(f => { guessed[f.key] = guessColumn(headers, f.kw) })
        setCsvMap(guessed)
      },
    })
    e.target.value = ''
  }

  async function confirmCsvImport() {
    if (!csvMap.date || !csvMap.symbol) { alert('Please map at least Date and Symbol.'); return }
    let imported = 0, skipped = 0
    const rowsToInsert = []
    csvRows.forEach(row => {
      const rawDate = (row[csvMap.date] || '').trim()
      const symbol = (row[csvMap.symbol] || '').trim().toUpperCase()
      if (!rawDate || !symbol) { skipped++; return }
      const date = normalizeDate(rawDate)
      let direction = (csvMap.direction ? (row[csvMap.direction] || '') : '').toLowerCase()
      direction = direction.includes('short') || direction.includes('sell') ? 'short' : 'long'
      const entry = csvMap.entry ? parseNum(row[csvMap.entry]) : NaN
      const exit = csvMap.exit ? parseNum(row[csvMap.exit]) : NaN
      const size = csvMap.size ? parseNum(row[csvMap.size]) : NaN
      let pnl = csvMap.pnl ? parseNum(row[csvMap.pnl]) : NaN
      if (isNaN(pnl)) {
        if (!isNaN(entry) && !isNaN(exit) && !isNaN(size)) {
          pnl = (exit - entry) * size * (direction === 'long' ? 1 : -1)
        } else { skipped++; return }
      }
      const notes = csvMap.notes ? (row[csvMap.notes] || '').trim() : ''
      rowsToInsert.push({
        user_id: user.id, date, symbol, direction,
        size: isNaN(size) ? null : size, entry: isNaN(entry) ? null : entry, exit: isNaN(exit) ? null : exit,
        pnl, notes,
      })
      imported++
    })
    if (rowsToInsert.length) {
      const { data, error } = await supabase.from('trades').insert(rowsToInsert).select()
      if (!error) setTrades([...(data || []), ...trades])
    }
    setImportNote(`Imported ${imported} trade${imported === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} row${skipped === 1 ? '' : 's'} (missing data)` : ''}.`)
    setCsvHeaders(null)
    setCsvRows([])
  }

  // ---- calendar heatmap build ----
  const y = calMonth.getFullYear(), m = calMonth.getMonth()
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const dayTotals = {}
  trades.forEach(t => {
    if (t.date.slice(0, 4) === String(y) && Number(t.date.slice(5, 7)) - 1 === m) {
      dayTotals[t.date] = (dayTotals[t.date] || 0) + Number(t.pnl)
    }
  })
  let maxAbs = 1
  Object.values(dayTotals).forEach(v => { if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v) })
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let w = 0; w < cells.length / 7; w++) weeks.push(cells.slice(w * 7, w * 7 + 7))

  if (loading) return <div className="jl-empty">Loading…</div>

  return (
    <div>
      <div className="jl-stats">
        <div className="jl-stat"><div className="jl-stat-label">Total P&amp;L</div><div className="jl-stat-value" style={{ color: stats.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>{fmtMoney(stats.totalPnl)}</div></div>
        <div className="jl-stat"><div className="jl-stat-label">Win Rate</div><div className="jl-stat-value">{stats.winRate.toFixed(1)}%</div></div>
        <div className="jl-stat"><div className="jl-stat-label">Avg Win</div><div className="jl-stat-value" style={{ color: 'var(--profit)' }}>{fmtMoney(stats.avgWin)}</div></div>
        <div className="jl-stat"><div className="jl-stat-label">Avg Loss</div><div className="jl-stat-value" style={{ color: 'var(--loss)' }}>{fmtMoney(stats.avgLoss)}</div></div>
        <div className="jl-stat"><div className="jl-stat-label">Profit Factor</div><div className="jl-stat-value">{isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '—'}</div></div>
      </div>

      <div className="jl-row">
        <div className="jl-section-title">Monthly performance</div>
        <div className="jl-cal-nav">
          <button onClick={() => setCalMonth(new Date(y, m - 1, 1))}>‹</button>
          <span>{calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCalMonth(new Date(y, m + 1, 1))}>›</button>
        </div>
      </div>
      <div className="jl-bal-input">
        <span>STARTING BALANCE</span>
        <input type="number" step="any" value={startingBalance} onChange={e => updateStartingBalance(e.target.value)} />
      </div>
      <div className="jl-heatmap">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div className="jl-hm-label" key={i}>{d}</div>)}
        <div className="jl-hm-label bal">Balance</div>
        {weeks.map((week, wi) => {
          let lastDate = null
          const dayCells = week.map((day, di) => {
            if (day === null) return <div className="jl-hm-cell empty" key={di} />
            const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            lastDate = key
            const val = dayTotals[key]
            let bg = 'var(--panel-2)', color = 'var(--text-dim)'
            if (val !== undefined) {
              const intensity = Math.min(Math.abs(val) / maxAbs, 1)
              if (val > 0) { bg = `rgba(63,167,150,${0.18 + intensity * 0.55})`; color = '#eafaf6' }
              else if (val < 0) { bg = `rgba(193,85,77,${0.18 + intensity * 0.55})`; color = '#fdeceb' }
            }
            return (
              <div className="jl-hm-cell" key={di} style={{ background: bg, color }}>
                <span className="d">{day}</span>
                <span className="p">{val !== undefined ? fmtMoney(val) : ''}</span>
              </div>
            )
          })
          const bal = lastDate ? cumulativeBalanceAsOf(lastDate) : null
          return (
            <Fragment key={wi}>
              {dayCells}
              <div className="jl-hm-bal">
                {bal !== null && <><span className="l">EOW</span><span className="v" style={{ color: bal >= startingBalance ? 'var(--profit)' : 'var(--loss)' }}>{fmtMoney(bal)}</span></>}
              </div>
            </Fragment>
          )
        })}
      </div>

      <div className="jl-row">
        <div className="jl-section-title">Trade log</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="jl-btn secondary" style={{ margin: 0 }}>
            ⇪ Import CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFile} />
          </label>
          <button className="jl-btn" onClick={() => setShowAddModal(true)}>+ Add trade</button>
        </div>
      </div>
      {importNote && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{importNote}</div>}

      <div className="jl-table-wrap">
        {trades.length === 0 ? (
          <div className="jl-empty">No trades logged yet — add your first one above.</div>
        ) : (
          <table className="jl-table">
            <thead><tr><th>Date</th><th>Symbol</th><th>Dir</th><th>Entry</th><th>Exit</th><th>Size</th><th>P&amp;L</th><th>Photo</th><th></th></tr></thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>{t.symbol}</td>
                  <td className={`jl-dir-${t.direction}`}>{t.direction.toUpperCase()}</td>
                  <td>{t.entry}</td>
                  <td>{t.exit}</td>
                  <td>{t.size}</td>
                  <td className={t.pnl >= 0 ? 'jl-pnl-pos' : 'jl-pnl-neg'}>{fmtMoney(Number(t.pnl))}</td>
                  <td>
                    {t.photo_url ? (
                      <img className="jl-photo-thumb" src={t.photo_url} onClick={() => setLightbox(t.photo_url)} />
                    ) : (
                      <label className="jl-photo-add">
                        +
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && attachPhoto(t.id, e.target.files[0])} />
                      </label>
                    )}
                  </td>
                  <td><button className="jl-del" onClick={() => deleteTrade(t.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {lightbox && (
        <div className="jl-lightbox-bg" onClick={() => setLightbox(null)}>
          <img src={lightbox} />
        </div>
      )}

      {showAddModal && <AddTradeModal onClose={() => setShowAddModal(false)} onSave={addTrade} />}
      {csvHeaders && (
        <CsvMapModal
          headers={csvHeaders}
          rowCount={csvRows.length}
          map={csvMap}
          setMap={setCsvMap}
          onClose={() => { setCsvHeaders(null); setCsvRows([]) }}
          onConfirm={confirmCsvImport}
        />
      )}
    </div>
  )
}

function AddTradeModal({ onClose, onSave }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState('long')
  const [size, setSize] = useState('')
  const [entry, setEntry] = useState('')
  const [exit, setExit] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const pnl = (parseFloat(entry) && parseFloat(exit) && parseFloat(size))
    ? (parseFloat(exit) - parseFloat(entry)) * parseFloat(size) * (direction === 'long' ? 1 : -1)
    : null

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!date || !symbol || !size || !entry || !exit) { alert('Please fill in date, symbol, size, entry and exit price.'); return }
    setSaving(true)
    await onSave({ date, symbol, direction, size: parseFloat(size), entry: parseFloat(entry), exit: parseFloat(exit), notes, photoFile })
    setSaving(false)
  }

  return (
    <div className="jl-modal-bg">
      <div className="jl-modal">
        <h3>Add trade</h3>
        <div className="jl-field-grid">
          <div className="jl-field"><label>Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="jl-field"><label>Symbol</label><input type="text" placeholder="EURUSD" value={symbol} onChange={e => setSymbol(e.target.value)} /></div>
        </div>
        <div className="jl-field-grid">
          <div className="jl-field"><label>Direction</label>
            <select value={direction} onChange={e => setDirection(e.target.value)}>
              <option value="long">Long</option><option value="short">Short</option>
            </select>
          </div>
          <div className="jl-field"><label>Size / Qty</label><input type="number" step="any" value={size} onChange={e => setSize(e.target.value)} /></div>
        </div>
        <div className="jl-field-grid">
          <div className="jl-field"><label>Entry price</label><input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} /></div>
          <div className="jl-field"><label>Exit price</label><input type="number" step="any" value={exit} onChange={e => setExit(e.target.value)} /></div>
        </div>
        <div className="jl-pnl-preview">P&amp;L: {pnl !== null ? <span style={{ color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700 }}>{fmtMoney(pnl)}</span> : '—'}</div>
        <div className="jl-field">
          <label>Screenshot</label>
          <input type="file" accept="image/*" onChange={handlePhoto} />
          {photoPreview && <img src={photoPreview} style={{ maxWidth: '100%', borderRadius: 6, marginTop: 8, border: '1px solid var(--border)' }} />}
        </div>
        <div className="jl-field"><label>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was the setup? What did you learn?" /></div>
        <div className="jl-modal-actions">
          <button className="jl-btn secondary" onClick={onClose}>Cancel</button>
          <button className="jl-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save trade'}</button>
        </div>
      </div>
    </div>
  )
}

function CsvMapModal({ headers, rowCount, map, setMap, onClose, onConfirm }) {
  return (
    <div className="jl-modal-bg">
      <div className="jl-modal" style={{ width: 460 }}>
        <h3>Match your columns</h3>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Found {rowCount} rows. Match each field to a column from your file.
        </div>
        {FIELD_DEFS.map(f => (
          <div className="jl-field" key={f.key}>
            <label>{f.label}{f.required ? ' *' : ''}</label>
            <select value={map[f.key] || ''} onChange={e => setMap({ ...map, [f.key]: e.target.value })}>
              <option value="">— skip —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 4px 0' }}>
          * Date and Symbol are required. If P&amp;L isn't mapped, it's calculated from entry, exit, size and direction. Values in parentheses, like (123.45) or $(123.45), are read as losses.
        </div>
        <div className="jl-modal-actions">
          <button className="jl-btn secondary" onClick={onClose}>Cancel</button>
          <button className="jl-btn" onClick={onConfirm}>Import trades</button>
        </div>
      </div>
    </div>
  )
}
