import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CheckCircle, Plus, X } from 'lucide-react'
import { getCoachLogs, addCoachLog, updateCoachLog } from '../../../lib/supabase'
import { coachBySlug } from '../../../lib/coaches'

const DAY_KEYS   = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_SHORT  = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' }
const DAY_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 }

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function localISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function formatWeek(monday) {
  const fri = addDays(monday, 4)
  return `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${fri.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
function calcHours(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, mins / 60)
}
function fmtH(n) {
  if (!n) return '0h'
  const s = parseFloat(n.toFixed(2))
  return `${s}h`
}
// Session type presets — label, duration (mins), unit
const SESSION_PRESETS = [
  { label: 'Clarity Call',   duration: '30', unit: 'min' },
  { label: '1:1 Coaching',   duration: '45', unit: 'min' },
  { label: 'Resume Review',  duration: '45', unit: 'min' },
  { label: 'Other',          duration: '',   unit: 'min' },
]

function emptyDay() {
  return { startTime: '', endTime: '', groupCoaching: false, groupSession: '', clients: [] }
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group select-none" onClick={onChange}>
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
        checked ? 'bg-blush-500 border-blush-500' : 'border-sand-300 group-hover:border-blush-300'
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-xs text-sand-600 font-medium">{label}</span>
    </label>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SimpleCoachLogPage() {
  const params   = useParams()
  const location = useLocation()
  // Works for both /log/:coachName (wildcard) and exact routes like /log/tanya
  const slugFromPath = location.pathname.split('/').pop()
  const slug     = params.coachName || slugFromPath
  const coach    = coachBySlug(slug || '')
  const displayName = coach?.name || null

  const [weekOffset, setWeekOffset] = useState(0)
  const [dayData,    setDayData]    = useState(() => Object.fromEntries(DAY_KEYS.map(d => [d, emptyDay()])))
  const [recentLogs, setRecentLogs] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState(null)

  const weekStart  = addDays(getWeekStart(), weekOffset * 7)
  const weekISO    = localISO(weekStart)
  const isThisWeek = weekOffset === 0
  const dayISO     = (day) => localISO(addDays(weekStart, DAY_OFFSET[day]))

  // ─── Load logs ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!displayName) { setLoading(false); return }
    getCoachLogs(displayName)
      .then(logs => setRecentLogs(logs))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [displayName])

  // ─── Pre-fill from saved logs ────────────────────────────────────────────────
  useEffect(() => {
    if (!displayName || loading) return
    const weekEnd  = localISO(addDays(weekStart, 4))
    const weekLogs = recentLogs.filter(l => l.date >= weekISO && l.date <= weekEnd)
    const newData  = Object.fromEntries(DAY_KEYS.map(d => [d, emptyDay()]))

    weekLogs.forEach(log => {
      const day = DAY_KEYS.find(d => dayISO(d) === log.date)
      if (!day) return

      // Restore start/end times from notes (stored as "09:00-17:00")
      let startTime = '', endTime = ''
      const m = log.notes && log.notes.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/)
      if (m) { startTime = m[1]; endTime = m[2] }

      // Group coaching from sessions array
      const gcSession = (log.sessions || []).find(s =>
        (typeof s === 'string' ? s : s?.name) === 'Group Coaching'
      )
      const groupCoaching = !!gcSession
      const groupSession  = (gcSession && typeof gcSession === 'object' && gcSession.notes) || ''

      // 1:1 clients
      const clients = (log.private_sessions || []).map(c => ({
        type:     c.type     || '',
        name:     c.client   || '',
        duration: String(c.duration || ''),
        unit:     c.unit     || 'min',
      }))

      newData[day] = { startTime, endTime, groupCoaching, groupSession, clients }
    })

    setDayData(newData)
  }, [weekISO, recentLogs, loading])

  // ─── State helpers ────────────────────────────────────────────────────────────
  function updateDay(day, field, val) {
    setDayData(p => ({ ...p, [day]: { ...p[day], [field]: val } }))
  }
  function addClient(day) {
    setDayData(p => ({ ...p, [day]: { ...p[day], clients: [...p[day].clients, { type: '', name: '', duration: '', unit: 'min' }] } }))
  }
  function updateClient(day, idx, field, val) {
    setDayData(p => ({ ...p, [day]: { ...p[day], clients: p[day].clients.map((c, i) => i === idx ? { ...c, [field]: val } : c) } }))
  }
  function applyPreset(day, idx, label) {
    const preset = SESSION_PRESETS.find(p => p.label === label)
    setDayData(p => ({
      ...p, [day]: {
        ...p[day], clients: p[day].clients.map((c, i) =>
          i === idx ? { ...c, type: label, duration: preset?.duration || '', unit: preset?.unit || 'min' } : c
        )
      }
    }))
  }
  function removeClient(day, idx) {
    setDayData(p => ({ ...p, [day]: { ...p[day], clients: p[day].clients.filter((_, i) => i !== idx) } }))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      for (const day of DAY_KEYS) {
        const d            = dayData[day]
        const hours        = calcHours(d.startTime, d.endTime)
        const validClients = d.clients.filter(c => c.name.trim())
        const hasAnything  = hours > 0 || validClients.length > 0 || d.groupCoaching
        if (!hasAnything) continue

        const iso     = dayISO(day)
        const payload = {
          coach_name:       displayName,
          date:             iso,
          hours,
          coaching_hours:   hours,
          admin_hours:      0,
          sessions:         d.groupCoaching
            ? [{ name: 'Group Coaching', duration: '1', unit: 'hr', hours: 1, notes: d.groupSession || '' }]
            : [],
          private_sessions: validClients.map(c => {
            const dur = parseFloat(c.duration) || 0
            const hrs = c.unit === 'min' ? dur / 60 : dur
            return { client: c.name, type: c.type || '1:1', duration: c.duration, unit: c.unit, hours: hrs }
          }),
          admin_sessions: [],
          // Store times in notes so we can restore them on reload
          notes: d.startTime && d.endTime ? `${d.startTime}-${d.endTime}` : '',
        }

        const existing = recentLogs.find(l => l.date === iso)
        if (existing) await updateCoachLog(existing.id, payload)
        else          await addCoachLog(payload)
      }
      setSubmitted(true)
      const logs = await getCoachLogs(displayName)
      setRecentLogs(logs)
      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const weekEnd    = localISO(addDays(weekStart, 4))
  const loggedDays = new Set(recentLogs.filter(l => l.date >= weekISO && l.date <= weekEnd).map(l => l.date))
  const todayISO   = localISO(new Date())
  const weekTotal  = DAY_KEYS.reduce((s, d) => s + calcHours(dayData[d].startTime, dayData[d].endTime), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sand-50">
      <div className="w-5 h-5 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!displayName) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl mb-2">🤔</p>
        <p className="text-sand-500">This link doesn't exist.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-sand-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blush-400 flex items-center justify-center text-white font-bold text-sm">
            {displayName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sand-900 leading-none">{displayName}</p>
            <p className="text-xs text-sand-400 mt-0.5">Promotable You · Weekly Hours</p>
          </div>
        </div>

        {/* Week picker */}
        <div className="flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-xl px-3 py-2">
          <button type="button" onClick={() => setWeekOffset(o => o - 1)}
            className="p-1 rounded hover:bg-sand-200 text-sand-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[220px]">
            <p className="text-sm font-semibold text-sand-900">{formatWeek(weekStart)}</p>
            <p className="text-xs text-sand-400">
              {isThisWeek ? 'Current week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
              {loggedDays.size > 0 && (
                <span className="text-emerald-500 font-medium">
                  {' '}· {loggedDays.size} day{loggedDays.size !== 1 ? 's' : ''} logged
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={isThisWeek}
            className="p-1 rounded hover:bg-sand-200 text-sand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {submitted && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Saved!
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleSubmit} disabled={submitting}
            className="bg-blush-500 hover:bg-blush-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm">
            {submitting ? 'Saving…' : 'Save Week'}
          </button>
        </div>
      </div>

      {/* ── Day columns ── */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-5 gap-4">
          {DAY_KEYS.map(day => {
            const iso     = dayISO(day)
            const date    = new Date(iso + 'T12:00:00')
            const isToday = iso === todayISO
            const d       = dayData[day]
            const hours   = calcHours(d.startTime, d.endTime)
            const log     = recentLogs.find(l => l.date === iso)

            return (
              <div key={day} className={`bg-white border rounded-2xl flex flex-col overflow-hidden ${
                isToday ? 'border-blush-300 ring-2 ring-blush-100' : 'border-sand-200'
              }`}>

                {/* Day header */}
                <div className={`px-4 py-3 border-b ${isToday ? 'bg-blush-50 border-blush-100' : 'bg-sand-50 border-sand-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-bold ${isToday ? 'text-blush-600' : 'text-sand-800'}`}>
                        {DAY_SHORT[day]}
                      </p>
                      <p className="text-xs text-sand-400">
                        {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hours > 0 && (
                        <span className="text-xs font-bold text-sand-700">{fmtH(hours)}</span>
                      )}
                      {log && (log.approved
                        ? <span className="text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">✓</span>
                        : <span className="text-amber-500 text-xs font-semibold">saved</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 flex flex-col gap-4 flex-1">

                  {/* ── Time range ── */}
                  <div>
                    <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wide mb-2">Hours worked</p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        value={d.startTime}
                        onChange={e => updateDay(day, 'startTime', e.target.value)}
                        className="flex-1 min-w-0 text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none"
                      />
                      <span className="text-sand-300 text-xs shrink-0">–</span>
                      <input
                        type="time"
                        value={d.endTime}
                        onChange={e => updateDay(day, 'endTime', e.target.value)}
                        className="flex-1 min-w-0 text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none"
                      />
                    </div>
                    {hours > 0 && (
                      <p className="text-[11px] text-blush-500 font-semibold mt-1.5 text-right">= {fmtH(hours)}</p>
                    )}
                  </div>

                  {/* ── 1:1s ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wide">1:1s</p>
                      <button type="button" onClick={() => addClient(day)}
                        className="text-xs text-blush-600 hover:text-blush-700 font-semibold flex items-center gap-0.5 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {d.clients.length === 0 ? (
                      <button type="button" onClick={() => addClient(day)}
                        className="text-xs text-sand-400 hover:text-blush-600 border border-dashed border-sand-200 hover:border-blush-300 rounded-lg px-2 py-1.5 w-full text-center transition-colors">
                        + Add client
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {d.clients.map((c, idx) => (
                          <div key={idx} className="space-y-1">
                            {/* Type + remove */}
                            <div className="flex items-center gap-1">
                              <select
                                value={c.type}
                                onChange={e => applyPreset(day, idx, e.target.value)}
                                className="flex-1 min-w-0 text-xs bg-blush-50 border border-blush-200 rounded-lg px-2 py-1.5 text-blush-700 font-semibold focus:ring-1 focus:ring-blush-400 focus:outline-none cursor-pointer"
                              >
                                <option value="">Session type…</option>
                                {SESSION_PRESETS.map(p => (
                                  <option key={p.label} value={p.label}>{p.label}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => removeClient(day, idx)}
                                className="text-sand-400 hover:text-red-500 transition-colors shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {/* Name + duration */}
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={c.name}
                                onChange={e => updateClient(day, idx, 'name', e.target.value)}
                                placeholder="Client name"
                                className="flex-1 min-w-0 text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:outline-none"
                              />
                              <div className="flex rounded-lg overflow-hidden border border-sand-300 focus-within:ring-1 focus-within:ring-blush-400 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  value={c.duration}
                                  onChange={e => updateClient(day, idx, 'duration', e.target.value)}
                                  placeholder="0"
                                  className="w-9 text-xs text-sand-900 placeholder-sand-400 bg-white px-1.5 py-1.5 text-center focus:outline-none"
                                />
                                <select
                                  value={c.unit}
                                  onChange={e => updateClient(day, idx, 'unit', e.target.value)}
                                  className="text-[10px] font-semibold bg-sand-50 text-sand-600 border-l border-sand-300 px-1 focus:outline-none cursor-pointer"
                                >
                                  <option value="min">min</option>
                                  <option value="hr">hr</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Group coaching ── */}
                  <div className="mt-auto pt-3 border-t border-sand-100 space-y-2">
                    <Checkbox
                      checked={d.groupCoaching}
                      onChange={() => updateDay(day, 'groupCoaching', !d.groupCoaching)}
                      label="Group coaching today"
                    />
                    {d.groupCoaching && (
                      <input
                        type="text"
                        value={d.groupSession}
                        onChange={e => updateDay(day, 'groupSession', e.target.value)}
                        placeholder="What was the session?"
                        className="w-full text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none"
                      />
                    )}
                  </div>

                </div>
              </div>
            )
          })}
        </div>

        {/* ── Weekly total ── */}
        {weekTotal > 0 && (
          <div className="mt-4 flex justify-end">
            <div className="bg-white border border-sand-200 rounded-xl px-5 py-3 text-center">
              <p className="text-[10px] font-bold text-sand-400 uppercase tracking-wide">Week Total</p>
              <p className="text-lg font-bold text-sand-900">{fmtH(weekTotal)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
