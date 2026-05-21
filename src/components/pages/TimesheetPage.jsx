import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, Check } from 'lucide-react'
import { getTimelog, upsertTimelogRow } from '../../lib/supabase'

const STD_HOURS = 7.6

const DAY_TYPES = ['Normal', 'Annual Leave', 'Sick Leave', 'Personal Leave', 'Public Holiday', 'Unpaid Leave', 'RDO']

const TYPE_STYLE = {
  'Normal':         { card: 'bg-white border-sand-200',         badge: 'bg-sand-100 text-sand-600'          },
  'Annual Leave':   { card: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700'    },
  'Sick Leave':     { card: 'bg-blush-50 border-blush-200',     badge: 'bg-blush-100 text-blush-700'        },
  'Personal Leave': { card: 'bg-purple-50 border-purple-200',   badge: 'bg-purple-100 text-purple-700'      },
  'Public Holiday': { card: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-100 text-blue-700'          },
  'Unpaid Leave':   { card: 'bg-sand-100 border-sand-300',      badge: 'bg-sand-200 text-sand-700'          },
  'RDO':            { card: 'bg-amber-50 border-amber-200',     badge: 'bg-amber-100 text-amber-700'        },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMostRecentFortnight() {
  const today = new Date()
  const day = today.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const lastMon = new Date(today)
  lastMon.setDate(today.getDate() + diffToMon)
  lastMon.setHours(0, 0, 0, 0)
  return lastMon
}

function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}

function toISO(date) { return date.toISOString().slice(0, 10) }

function buildFortnight(startMon) {
  const days = []
  for (let week = 0; week < 2; week++)
    for (let d = 0; d < 5; d++) {
      const date = addDays(startMon, week * 7 + d)
      days.push({ date: toISO(date), dayName: date.toLocaleDateString('en-AU', { weekday: 'long' }), weekNum: week })
    }
  return days
}

// "worked" = clock_in field is non-empty (we store a sentinel)
function isWorked(row) { return !!(row.clock_in) }
function workedHours(row) {
  if (!isWorked(row)) return 0
  return STD_HOURS
}

// ─── Day card ─────────────────────────────────────────────────────────────────
function DayCard({ day, row, onChange, isToday }) {
  const worked  = isWorked(row)
  const type    = row.type || 'Normal'
  const styles  = TYPE_STYLE[type] || TYPE_STYLE['Normal']
  const isLeave = type !== 'Normal'

  function toggleWorked() {
    if (worked) {
      onChange({ clock_in: '', clock_out: '' })
    } else {
      onChange({ clock_in: '09:00', clock_out: '17:00', type: 'Normal' })
    }
  }

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 p-4 transition-all ${styles.card} ${
      isToday ? 'ring-2 ring-blush-400 ring-offset-1' : ''
    } ${worked || isLeave ? 'shadow-sm' : 'opacity-70'}`}>

      {/* Today pill */}
      {isToday && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-blush-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
          Today
        </span>
      )}

      {/* Day + date */}
      <p className="text-xs font-bold text-sand-700 text-center">{day.dayName.slice(0, 3).toUpperCase()}</p>
      <p className="text-[10px] text-sand-400 text-center mt-0.5">
        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
      </p>

      {/* Big tick */}
      <div className="flex justify-center my-3">
        <button
          onClick={toggleWorked}
          className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
            worked
              ? 'bg-blush-500 border-blush-500 shadow-md shadow-blush-200 scale-105'
              : isLeave
              ? 'bg-sand-100 border-sand-200 cursor-default'
              : 'border-sand-200 hover:border-blush-300 hover:bg-blush-50'
          }`}
        >
          {(worked || isLeave) && <Check className={`w-6 h-6 ${worked ? 'text-white' : 'text-sand-400'}`} />}
        </button>
      </div>

      {/* Type badge / selector */}
      <div className="flex justify-center">
        <select
          value={type}
          onChange={e => onChange({ type: e.target.value, clock_in: e.target.value === 'Normal' ? (worked ? '09:00' : '') : '09:00', clock_out: e.target.value === 'Normal' ? (worked ? '17:00' : '') : '17:00' })}
          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border-0 focus:ring-2 focus:ring-blush-300 focus:outline-none cursor-pointer text-center appearance-none ${styles.badge}`}
        >
          {DAY_TYPES.map(t => <option key={t} value={t}>{t === 'Normal' ? (worked ? 'Worked' : 'Not worked') : t}</option>)}
        </select>
      </div>

      {/* Notes */}
      <input
        value={row.notes || ''}
        onChange={e => onChange({ notes: e.target.value })}
        placeholder="Notes…"
        className="mt-2.5 w-full text-[11px] bg-white/60 border border-sand-200 rounded-lg px-2 py-1.5 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200"
      />
    </div>
  )
}

// ─── Week summary bar ─────────────────────────────────────────────────────────
function WeekBar({ label, days, rows }) {
  const worked  = days.filter(d => isWorked(rows[d.date] || {})).length
  const leave   = days.filter(d => { const r = rows[d.date]; return r && !isWorked(r) && r.type !== 'Normal' }).length
  const total   = worked + leave
  const hours   = days.reduce((s, d) => s + workedHours(rows[d.date] || {}), 0)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-sand-50 rounded-xl border border-sand-200 text-xs">
      <span className="font-bold text-sand-600 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-sand-500">{total}/5 days</span>
        <span className="font-semibold text-blush-600">{hours.toFixed(1)}h</span>
      </div>
    </div>
  )
}

// ─── Pay Summary ──────────────────────────────────────────────────────────────
function PaySummary({ fortnight, rows }) {
  const allRows = fortnight.map(d => ({ ...(rows[d.date] || { type: 'Normal' }), date: d.date }))
  const totalHours = allRows.reduce((s, r) => s + workedHours(r), 0)
  const workedDays = allRows.filter(r => isWorked(r)).length
  const leaveDays  = allRows.filter(r => !isWorked(r) && r.type !== 'Normal').length
  const offDays    = allRows.filter(r => !isWorked(r) && r.type === 'Normal').length

  const byType = DAY_TYPES.reduce((acc, t) => {
    const count = allRows.filter(r => r.type === t && (isWorked(r) || t !== 'Normal')).length
    if (count > 0) acc[t] = count
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Big hours stat */}
      <div className="bg-gradient-to-br from-blush-500 to-blush-400 rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">Total Hours</p>
        <p className="text-4xl font-bold mt-1">{totalHours.toFixed(1)}<span className="text-xl font-normal text-white/70">h</span></p>
        <p className="text-sm text-white/70 mt-1">of {STD_HOURS * 10}h standard</p>
        <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all"
            style={{ width: `${Math.min((totalHours / (STD_HOURS * 10)) * 100, 100)}%` }} />
        </div>
      </div>

      {/* Days breakdown */}
      <div className="bg-white border border-sand-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mb-3">Days This Fortnight</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-sand-600">Worked</span>
            <span className="font-bold text-sand-900">{workedDays}</span>
          </div>
          {leaveDays > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sand-600">Leave / Public holiday</span>
              <span className="font-bold text-emerald-600">{leaveDays}</span>
            </div>
          )}
          {offDays > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-sand-600">Not logged</span>
              <span className="font-bold text-sand-400">{offDays}</span>
            </div>
          )}
        </div>
      </div>

      {/* Type breakdown */}
      <div className="bg-white border border-sand-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mb-3">By Type</p>
        <div className="space-y-2">
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLE[type]?.badge || ''}`}>{type}</span>
              <span className="text-sm font-bold text-sand-700">{count}d</span>
            </div>
          ))}
          {Object.keys(byType).length === 0 && (
            <p className="text-xs text-sand-300">Nothing logged yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TimesheetPage() {
  const [cycleStart, setCycleStart] = useState(getMostRecentFortnight)
  const [rows, setRows]     = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  const fortnight = buildFortnight(cycleStart)
  const todayISO  = toISO(new Date())
  const week1     = fortnight.slice(0, 5)
  const week2     = fortnight.slice(5, 10)

  const cycleLabel = `${cycleStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} — ${addDays(cycleStart, 13).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

  useEffect(() => {
    getTimelog()
      .then(data => { const m = {}; data.forEach(r => { m[r.date] = r }); setRows(m) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function getRow(date) {
    return rows[date] || { date, type: 'Normal', clock_in: '', clock_out: '', notes: '' }
  }

  const handleChange = useCallback(async (date, updates) => {
    const updated = { ...getRow(date), ...updates }
    setRows(prev => ({ ...prev, [date]: updated }))
    try {
      const saved = await upsertTimelogRow(updated)
      setRows(prev => ({ ...prev, [date]: saved }))
    } catch (e) { setError(e.message) }
  }, [rows])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Time Log</h1>
          <p className="text-sand-400 text-sm mt-0.5">Shaniah — {cycleLabel}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-sand-200 rounded-xl p-1">
          <button onClick={() => setCycleStart(d => { const n = new Date(d); n.setDate(n.getDate() - 14); return n })}
            className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-sand-700 px-2 whitespace-nowrap">{cycleLabel}</span>
          <button onClick={() => setCycleStart(d => { const n = new Date(d); n.setDate(n.getDate() + 14); return n })}
            className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Week 1 */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-blush-500 uppercase tracking-widest">Week 1</p>
        <div className="grid grid-cols-5 gap-3">
          {week1.map(d => (
            <DayCard key={d.date} day={d} row={getRow(d.date)}
              onChange={u => handleChange(d.date, u)} isToday={d.date === todayISO} />
          ))}
        </div>
        <WeekBar label="Week 1" days={week1} rows={rows} />
      </div>

      {/* Week 2 */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold text-blush-500 uppercase tracking-widest">Week 2</p>
        <div className="grid grid-cols-5 gap-3">
          {week2.map(d => (
            <DayCard key={d.date} day={d} row={getRow(d.date)}
              onChange={u => handleChange(d.date, u)} isToday={d.date === todayISO} />
          ))}
        </div>
        <WeekBar label="Week 2" days={week2} rows={rows} />
      </div>

      {/* Pay summary */}
      <PaySummary fortnight={fortnight} rows={rows} />
    </div>
  )
}
