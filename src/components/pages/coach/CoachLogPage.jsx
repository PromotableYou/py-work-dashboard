import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle } from 'lucide-react'
import { getSessionTypes, getCoachLogs, addCoachLog, updateCoachLog, getRosterBlocks } from '../../../lib/supabase'
import { coachBySlug } from '../../../lib/coaches'

const DAY_KEYS   = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' }
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
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function formatWeek(monday) {
  const fri = addDays(monday, 4)
  return `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${fri.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
function emptyDay() {
  return { hours: '', sessions: [], clients: [], notes: '' }
}

export default function CoachLogPage() {
  const { coachName } = useParams()
  const coach = coachBySlug(coachName || '')
  const displayName = coach?.name || null

  const [sessionTypes, setSessionTypes]   = useState([])
  const [recentLogs, setRecentLogs]       = useState([])
  const [loading, setLoading]             = useState(true)
  const [submitting, setSubmitting]       = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [error, setError]                 = useState(null)
  const [openPicker, setOpenPicker]       = useState(null) // which day's session picker is open

  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart   = addDays(getWeekStart(), weekOffset * 7)
  const weekISO     = localISO(weekStart)
  const isThisWeek  = weekOffset === 0

  const dayISO = (day) => localISO(addDays(weekStart, DAY_OFFSET[day]))

  // Per-day state: { mon: { hours, sessions[], clients[] }, ... }
  const [dayData, setDayData] = useState(() =>
    Object.fromEntries(DAY_KEYS.map(d => [d, emptyDay()]))
  )

  // Load session types + all logs on mount
  useEffect(() => {
    if (!displayName) { setLoading(false); return }
    Promise.all([getSessionTypes(), getCoachLogs(displayName)])
      .then(([st, logs]) => { setSessionTypes(st); setRecentLogs(logs) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [displayName])

  // When week changes: pre-fill from existing logs, then overlay roster for unlogged days
  useEffect(() => {
    if (!displayName || loading) return

    const newData = Object.fromEntries(DAY_KEYS.map(d => [d, emptyDay()]))

    // Fill in any already-saved logs for this week
    const weekEnd = localISO(addDays(weekStart, 4))
    const weekLogs = recentLogs.filter(l => l.date >= weekISO && l.date <= weekEnd)
    weekLogs.forEach(log => {
      const day = DAY_KEYS.find(d => dayISO(d) === log.date)
      if (day) {
        newData[day] = {
          hours: String(log.hours || ''),
          sessions: log.sessions || [],
          clients: log.private_sessions?.length ? log.private_sessions : [],
          notes: log.notes || '',
        }
      }
    })

    // Fetch roster and fill unlogged days from it
    getRosterBlocks(weekISO).then(blocks => {
      const mine = blocks.filter(b => b.coach_name === displayName)
      mine.forEach(block => {
        if (!block.day || !block.session_type) return
        const day = block.day
        // Only pre-fill if this day hasn't been logged yet
        const alreadyLogged = weekLogs.some(l => l.date === dayISO(day))
        if (!alreadyLogged && newData[day]) {
          newData[day].sessions = [...new Set([...newData[day].sessions, block.session_type])]
        }
      })
      setDayData({ ...newData })
    }).catch(() => setDayData({ ...newData }))
  }, [weekISO, recentLogs, loading])

  // ─── Day data helpers ───────────────────────────────────────────────────────
  function setField(day, field, value) {
    setDayData(p => ({ ...p, [day]: { ...p[day], [field]: value } }))
  }
  function addSession(day, name) {
    setDayData(p => ({ ...p, [day]: { ...p[day], sessions: [...p[day].sessions, name] } }))
    setOpenPicker(null)
  }
  function removeSession(day, name) {
    setDayData(p => ({ ...p, [day]: { ...p[day], sessions: p[day].sessions.filter(s => s !== name) } }))
  }
  function addClient(day) {
    setDayData(p => ({ ...p, [day]: { ...p[day], clients: [...p[day].clients, { client: '', duration: '' }] } }))
  }
  function updateClient(day, idx, field, val) {
    setDayData(p => ({
      ...p,
      [day]: { ...p[day], clients: p[day].clients.map((c, i) => i === idx ? { ...c, [field]: val } : c) },
    }))
  }
  function removeClient(day, idx) {
    setDayData(p => ({ ...p, [day]: { ...p[day], clients: p[day].clients.filter((_, i) => i !== idx) } }))
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      for (const day of DAY_KEYS) {
        const d = dayData[day]
        const hasAnything = d.hours || d.sessions.length > 0 || d.clients.some(c => c.client.trim()) || d.notes.trim()
        if (!hasAnything) continue
        const iso = dayISO(day)
        const payload = {
          coach_name: displayName,
          date: iso,
          hours: parseFloat(d.hours) || 0,
          sessions: d.sessions,
          private_sessions: d.clients.filter(c => c.client.trim()),
          notes: d.notes.trim(),
        }
        // Update if a log already exists for this day, otherwise insert
        const existing = recentLogs.find(l => l.date === iso && l.coach_name === displayName)
        if (existing) {
          await updateCoachLog(existing.id, payload)
        } else {
          await addCoachLog(payload)
        }
      }
      setSubmitted(true)
      const logs = await getCoachLogs(displayName)
      setRecentLogs(logs)
      setTimeout(() => setSubmitted(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const weekEnd = localISO(addDays(weekStart, 4))
  const loggedDays = new Set(
    recentLogs.filter(l => l.date >= weekISO && l.date <= weekEnd).map(l => l.date)
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sand-50">
      <div className="w-5 h-5 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!displayName) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center">
      <div className="text-center"><p className="text-2xl mb-2">🤔</p><p className="text-sand-500">This link doesn't exist.</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand-50" onClick={() => setOpenPicker(null)}>

      {/* Top bar */}
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
          <button type="button" onClick={() => setWeekOffset(o => o - 1)} className="p-1 rounded hover:bg-sand-200 text-sand-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[220px]">
            <p className="text-sm font-semibold text-sand-900">{formatWeek(weekStart)}</p>
            <p className="text-xs text-sand-400">
              {isThisWeek ? 'Current week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
              {loggedDays.size > 0 && <span className="text-emerald-500 font-medium"> · {loggedDays.size} day{loggedDays.size !== 1 ? 's' : ''} logged</span>}
            </p>
          </div>
          <button type="button" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={isThisWeek} className="p-1 rounded hover:bg-sand-200 text-sand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
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
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blush-500 hover:bg-blush-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
          >
            {submitting ? 'Saving…' : 'Save Week'}
          </button>
        </div>
      </div>

      {/* Day columns */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-5 gap-4">
          {DAY_KEYS.map(day => {
            const iso = dayISO(day)
            const date = new Date(iso + 'T12:00:00')
            const isToday = iso === localISO(new Date())
            const isLogged = loggedDays.has(iso)
            const d = dayData[day]
            const availableSessions = sessionTypes.filter(st => !d.sessions.includes(st.name))

            return (
              <div key={day} className={`bg-white border rounded-2xl flex flex-col overflow-hidden ${isToday ? 'border-blush-300 ring-2 ring-blush-100' : 'border-sand-200'}`}>

                {/* Day header */}
                <div className={`px-4 py-3 border-b ${isToday ? 'bg-blush-50 border-blush-100' : 'bg-sand-50 border-sand-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-bold ${isToday ? 'text-blush-600' : 'text-sand-800'}`}>{DAY_SHORT[day]}</p>
                      <p className="text-xs text-sand-400">{date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    {isLogged && <span className="text-emerald-500 text-xs font-semibold">✓ saved</span>}
                  </div>
                </div>

                <div className="p-3 flex flex-col gap-3 flex-1">

                  {/* Sessions */}
                  <div>
                    <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide mb-1.5">Sessions</p>
                    <div className="flex flex-wrap gap-1 min-h-[28px]">
                      {d.sessions.length === 0 && (
                        <p className="text-xs text-sand-400 italic">None yet</p>
                      )}
                      {d.sessions.map(name => {
                        const st = sessionTypes.find(s => s.name === name)
                        return (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg leading-none border border-black/10"
                            style={{ backgroundColor: st?.color || '#e5e7eb', color: '#1a1a1a' }}
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => removeSession(day, name)}
                              className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        )
                      })}
                    </div>

                    {/* Add session picker */}
                    {availableSessions.length > 0 && (
                      <div className="relative mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenPicker(openPicker === day ? null : day)}
                          className="flex items-center gap-1 text-xs text-blush-600 hover:text-blush-700 font-semibold border border-blush-200 bg-blush-50 hover:bg-blush-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add session
                        </button>
                        {openPicker === day && (
                          <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-sand-300 rounded-xl shadow-lg py-1 min-w-[190px] max-h-52 overflow-y-auto">
                            {availableSessions.map(st => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => addSession(day, st.name)}
                                className="w-full text-left text-xs px-3 py-2 hover:bg-sand-50 transition-colors flex items-center gap-2 text-sand-800 font-medium"
                              >
                                <span className="w-3 h-3 rounded shrink-0 border border-black/10" style={{ backgroundColor: st.color || '#e5e7eb' }} />
                                {st.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1:1 clients */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide">1:1 Clients</p>
                      <button type="button" onClick={() => addClient(day)} className="text-xs text-blush-600 hover:text-blush-700 font-semibold flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {d.clients.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => addClient(day)}
                        className="text-xs text-sand-500 hover:text-blush-600 font-medium border border-dashed border-sand-300 hover:border-blush-300 rounded-lg px-2 py-1.5 w-full text-center transition-colors"
                      >
                        + Add client
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {d.clients.map((c, idx) => (
                          <div key={idx} className="flex gap-1 items-center">
                            <input
                              type="text"
                              value={c.client}
                              onChange={e => updateClient(day, idx, 'client', e.target.value)}
                              placeholder="Client name"
                              className="flex-1 text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none min-w-0"
                            />
                            <input
                              type="text"
                              value={c.duration}
                              onChange={e => updateClient(day, idx, 'duration', e.target.value)}
                              placeholder="1hr"
                              className="w-12 text-xs bg-white border border-sand-300 rounded-lg px-1.5 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none"
                            />
                            <button type="button" onClick={() => removeClient(day, idx)} className="text-sand-400 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Other work / notes */}
                  <div>
                    <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide mb-1.5">Other work</p>
                    <textarea
                      value={d.notes}
                      onChange={e => setField(day, 'notes', e.target.value)}
                      placeholder="What else did you work on?"
                      rows={2}
                      className="w-full text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Hours */}
                  <div className="mt-auto pt-2.5 border-t border-sand-200">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-sand-600 uppercase tracking-wide whitespace-nowrap">Hours worked</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        value={d.hours}
                        onChange={e => setField(day, 'hours', e.target.value)}
                        placeholder="0"
                        className="w-16 text-sm font-bold text-sand-900 bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-center placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none"
                      />
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>

        {/* Weekly total */}
        {DAY_KEYS.some(d => dayData[d].hours) && (
          <div className="mt-4 flex justify-end">
            <div className="bg-white border border-sand-200 rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-xs text-sand-400 font-semibold uppercase tracking-wide">Week total</span>
              <span className="text-lg font-bold text-blush-500">
                {DAY_KEYS.reduce((s, d) => s + (parseFloat(dayData[d].hours) || 0), 0).toFixed(1)}h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
