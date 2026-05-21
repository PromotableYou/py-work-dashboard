import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Users, ChevronLeft, ChevronRight, AlertCircle, Calendar, ExternalLink, RefreshCw } from 'lucide-react'
import { getCoaches, addCoach, deleteCoach, updateCoach, getCoachHours, upsertCoachHourRow } from '../../../lib/supabase'

const CAL_MODES = [
  { label: 'Day',    value: 'DAY'    },
  { label: 'Week',   value: 'WEEK'   },
  { label: 'Month',  value: 'MONTH'  },
  { label: 'Agenda', value: 'AGENDA' },
]

// Pull the calendar ID out of a pasted embed code or raw URL
function parseEmbedCode(input) {
  const trimmed = input.trim()
  // Full iframe embed code — extract the src="..." attribute
  const iframeSrc = trimmed.match(/src="(https:\/\/calendar\.google\.com[^"]+)"/)
  const url = iframeSrc ? iframeSrc[1] : trimmed
  // Extract the src= query param (the actual calendar ID)
  const srcParam = url.match(/[?&]src=([^&]+)/)
  if (srcParam) return decodeURIComponent(srcParam[1])
  // Fallback — treat the whole thing as the calendar ID
  return trimmed || null
}

function buildEmbedUrl(coaches, mode) {
  const withCal = coaches.filter(c => c.google_calendar_id)
  if (!withCal.length) return null
  const srcs = withCal.map(c => `src=${encodeURIComponent(c.google_calendar_id)}`).join('&')
  return `https://calendar.google.com/calendar/embed?${srcs}&ctz=Australia%2FBrisbane&showTitle=0&showNav=1&showPrint=0&showTabs=1&showCalendars=1&showTz=0&mode=${mode}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getPayPeriodStart(date = new Date(), anchor = new Date('2025-01-06')) {
  const diff = Math.floor((date - anchor) / (1000 * 60 * 60 * 24 * 14))
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + diff * 14)
  return start
}

function getFortnightDays(start) {
  const days = []
  let current = new Date(start)
  while (days.length < 10) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(current))
    current = addDays(current, 1)
  }
  return days
}

const COACH_COLORS = [
  '#e5a0a0', '#f5c27a', '#a0c4e5', '#a0e5b0', '#c4a0e5',
  '#e5c4a0', '#a0e5e5', '#e5a0c4', '#b0d4a0', '#d4a0d4',
]

const TODAY = localISO()

// ─── Hour input cell ──────────────────────────────────────────────────────────
function HourCell({ coachName, dateISO, value, onChange }) {
  const [local, setLocal] = useState(value === 0 ? '' : String(value))
  const timerRef = useRef(null)
  const isToday = dateISO === TODAY

  // Keep in sync if parent value changes (e.g. period switch)
  useEffect(() => {
    setLocal(value === 0 ? '' : String(value))
  }, [value, dateISO])

  function handleChange(e) {
    const raw = e.target.value
    if (raw === '' || /^\d*\.?\d?$/.test(raw)) setLocal(raw)
  }

  function handleBlur() {
    const num = parseFloat(local) || 0
    setLocal(num === 0 ? '' : String(num))
    if (num !== value) onChange(coachName, dateISO, num)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') e.target.blur()
  }

  return (
    <td className={`px-1 py-1.5 text-center ${isToday ? 'bg-blush-50' : ''}`}>
      <input
        type="text"
        inputMode="decimal"
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="–"
        className={`w-11 text-center text-sm rounded-lg border py-1 focus:outline-none focus:ring-2 focus:ring-blush-300 transition-colors ${
          parseFloat(local) > 0
            ? 'bg-blush-50 border-blush-200 text-blush-700 font-semibold'
            : 'bg-white border-sand-200 text-sand-300 placeholder-sand-200'
        } ${isToday ? 'ring-1 ring-warm-300' : ''}`}
      />
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoachesCalendarPage() {
  const [coaches, setCoaches] = useState([])
  const [hoursData, setHoursData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmbed, setNewEmbed] = useState('')
  const [calMode, setCalMode] = useState('WEEK')
  const [embedKey, setEmbedKey] = useState(0)
  const [periodOffset, setPeriodOffset] = useState(0)

  const baseStart = getPayPeriodStart(new Date())
  const periodStart = addDays(baseStart, periodOffset * 14)
  const periodEnd = addDays(periodStart, 13)
  const days = getFortnightDays(periodStart)
  const week1 = days.slice(0, 5)
  const week2 = days.slice(5, 10)

  const periodStartISO = localISO(periodStart)
  const periodEndISO = localISO(periodEnd)

  useEffect(() => {
    Promise.all([getCoaches(), getCoachHours()])
      .then(([c, h]) => { setCoaches(c); setHoursData(h) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Lookup: "coachName|date" → hours value
  const hoursLookup = {}
  hoursData.forEach(r => { hoursLookup[`${r.coach_name}|${r.date}`] = parseFloat(r.hours) || 0 })

  const getHours = (coachName, dateISO) => hoursLookup[`${coachName}|${dateISO}`] || 0

  const handleCellChange = useCallback(async (coachName, dateISO, hours) => {
    try {
      const saved = await upsertCoachHourRow({ coach_name: coachName, date: dateISO, hours })
      setHoursData(prev => {
        const idx = prev.findIndex(r => r.coach_name === coachName && r.date === dateISO)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
    } catch (e) { setError(e.message) }
  }, [])

  async function handleAddCoach(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const color = COACH_COLORS[coaches.length % COACH_COLORS.length]
      const calId = newEmbed.trim() ? parseEmbedCode(newEmbed) : null
      const saved = await addCoach({ name: newName.trim(), color, google_calendar_id: calId })
      setCoaches(prev => [...prev, saved])
      setNewName('')
      setNewEmbed('')
      setShowAddCoach(false)
      if (calId) setEmbedKey(k => k + 1)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteCoach(id) {
    if (!window.confirm('Remove this coach? Their hours history will remain.')) return
    try {
      await deleteCoach(id)
      setCoaches(prev => prev.filter(c => c.id !== id))
      setEmbedKey(k => k + 1)
    }
    catch (e) { setError(e.message) }
  }

  const embedUrl = buildEmbedUrl(coaches, calMode)
  const calCoaches = coaches.filter(c => c.google_calendar_id)

  // Totals
  function coachTotal(coachName) {
    return days.reduce((sum, d) => sum + getHours(coachName, localISO(d)), 0)
  }
  function coachWeekTotal(coachName, weekDays) {
    return weekDays.reduce((sum, d) => sum + getHours(coachName, localISO(d)), 0)
  }
  function dayTotal(dayISO) {
    return coaches.reduce((sum, c) => sum + getHours(c.name, dayISO), 0)
  }
  function grandTotal() {
    return coaches.reduce((sum, c) => sum + coachTotal(c.name), 0)
  }

  const fmt = (n) => n === 0 ? '–' : n % 1 === 0 ? String(n) : n.toFixed(1)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Coach Hours</h1>
          <p className="text-sand-400 text-sm mt-0.5">{coaches.length} coach{coaches.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddCoach(!showAddCoach)}
          className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Coach
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add coach */}
      {showAddCoach && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <h2 className="font-semibold text-sand-900 mb-3">Add a Coach</h2>
          <form onSubmit={handleAddCoach} className="space-y-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Coach name…"
              autoFocus
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
            />
            <div>
              <label className="block text-xs text-sand-500 mb-1">
                Google Calendar embed code <span className="text-sand-400">(optional — paste the &lt;iframe&gt; code from Google Calendar settings)</span>
              </label>
              <textarea
                value={newEmbed}
                onChange={e => setNewEmbed(e.target.value)}
                placeholder='Paste embed code here, e.g. <iframe src="https://calendar.google.com/calendar/embed?src=..." ...></iframe>'
                rows={3}
                className="w-full text-xs bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-700 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none resize-none font-mono"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAddCoach(false); setNewEmbed('') }} className="text-sm text-sand-500 px-3 py-2">Cancel</button>
              <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Add Coach</button>
            </div>
          </form>
        </div>
      )}

      {/* Combined calendar embed */}
      {calCoaches.length > 0 && (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-sand-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warm-400" />
              <span className="font-semibold text-sand-900 text-sm">Coaches Calendars</span>
              <div className="flex gap-1 ml-2">
                {calCoaches.map(c => (
                  <span key={c.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: c.color || '#e5a0a0' }}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-sand-50 border border-sand-200 rounded-lg p-0.5 gap-0.5">
                {CAL_MODES.map(m => (
                  <button key={m.value} onClick={() => setCalMode(m.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${calMode === m.value ? 'bg-white shadow-sm text-sand-900' : 'text-sand-400 hover:text-sand-700'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setEmbedKey(k => k + 1)} title="Refresh" className="p-1.5 rounded-lg text-sand-400 hover:text-sand-700 hover:bg-sand-100 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-sand-400 hover:text-blush-500 hover:bg-blush-50 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <iframe
            key={`${embedKey}-${calMode}`}
            src={embedUrl}
            style={{ border: 0 }}
            width="100%"
            height="650"
            frameBorder="0"
            scrolling="no"
            title="Coaches Calendars"
          />
        </div>
      )}

      {/* Pay period navigator */}
      <div className="bg-white border border-sand-200 rounded-2xl px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => setPeriodOffset(o => o - 1)}
          className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors text-sand-400 hover:text-sand-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-sand-800">
            {periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-sand-400">
            {periodOffset === 0 ? 'Current pay period' : periodOffset === -1 ? 'Previous pay period' : `${Math.abs(periodOffset)} periods ago`}
          </p>
        </div>
        <button
          onClick={() => setPeriodOffset(o => Math.min(o + 1, 0))}
          disabled={periodOffset === 0}
          className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors text-sand-400 hover:text-sand-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {coaches.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm font-medium">No coaches added yet</p>
          <p className="text-sand-400 text-xs mt-1">Add a coach above to start tracking their hours</p>
        </div>
      ) : (
        <>
          {/* Grid — scrollable on mobile */}
          {[{ label: 'Week 1', weekDays: week1 }, { label: 'Week 2', weekDays: week2 }].map(({ label, weekDays }) => (
            <div key={label} className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-sand-100 flex items-center justify-between">
                <p className="text-xs font-bold text-blush-500 uppercase tracking-widest">{label}</p>
                <p className="text-xs text-sand-400">
                  {weekDays[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {weekDays[4].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sand-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-sand-500 w-36">Coach</th>
                      {weekDays.map(d => {
                        const iso = localISO(d)
                        const isToday = iso === TODAY
                        return (
                          <th key={iso} className={`px-1 py-2.5 text-center text-xs font-semibold w-16 ${isToday ? 'text-blush-500' : 'text-sand-500'}`}>
                            <div>{d.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                            <div className={`text-[10px] font-normal ${isToday ? 'text-blush-400' : 'text-sand-400'}`}>
                              {d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                            </div>
                          </th>
                        )
                      })}
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-sand-500 w-16">Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coaches.map((coach, i) => {
                      const weekTotal = coachWeekTotal(coach.name, weekDays)
                      return (
                        <tr key={coach.id} className={`border-b border-sand-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/50'}`}>
                          {/* Coach name */}
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2 group">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: coach.color || '#e5a0a0' }}
                              >
                                {coach.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-sand-800 truncate max-w-[80px]">{coach.name}</span>
                              <button
                                onClick={() => handleDeleteCoach(coach.id)}
                                className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all ml-auto"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* Hour cells */}
                          {weekDays.map(d => {
                            const iso = localISO(d)
                            return (
                              <HourCell
                                key={iso}
                                coachName={coach.name}
                                dateISO={iso}
                                value={getHours(coach.name, iso)}
                                onChange={handleCellChange}
                              />
                            )
                          })}

                          {/* Week total */}
                          <td className="px-3 py-2 text-center">
                            <span className={`text-sm font-bold ${weekTotal > 0 ? 'text-blush-600' : 'text-sand-300'}`}>
                              {fmt(weekTotal)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}

                    {/* Day totals row */}
                    <tr className="bg-sand-50 border-t-2 border-sand-200">
                      <td className="px-4 py-2 text-xs font-bold text-sand-500 uppercase tracking-wide">Total</td>
                      {weekDays.map(d => {
                        const iso = localISO(d)
                        const total = dayTotal(iso)
                        return (
                          <td key={iso} className="px-1 py-2 text-center">
                            <span className={`text-xs font-bold ${total > 0 ? 'text-sand-700' : 'text-sand-300'}`}>
                              {fmt(total)}
                            </span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs font-bold text-sand-700">
                          {fmt(weekDays.reduce((s, d) => s + dayTotal(localISO(d)), 0))}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Pay period summary */}
          <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Pay Period Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Total Hours</p>
                <p className="text-2xl font-bold">{fmt(grandTotal())}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Coaches</p>
                <p className="text-2xl font-bold">{coaches.length}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Week 1</p>
                <p className="text-2xl font-bold">{fmt(coaches.reduce((s, c) => s + coachWeekTotal(c.name, week1), 0))}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Week 2</p>
                <p className="text-2xl font-bold">{fmt(coaches.reduce((s, c) => s + coachWeekTotal(c.name, week2), 0))}</p>
              </div>
            </div>

            {/* Per-coach breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {coaches.map(coach => {
                const total = coachTotal(coach.name)
                return (
                  <div key={coach.id} className="bg-white/15 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ backgroundColor: coach.color || '#e5a0a0', filter: 'brightness(1.3)' }}>
                      {coach.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs flex-1 truncate opacity-90">{coach.name}</span>
                    <span className="text-sm font-bold">{fmt(total)}<span className="text-[10px] font-normal opacity-70 ml-0.5">h</span></span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
