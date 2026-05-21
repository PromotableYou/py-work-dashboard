import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, Clock } from 'lucide-react'
import { getTimelog, upsertTimelogRow } from '../../lib/supabase'

const STD_HOURS = 7.6
const SHORT_THRESHOLD = 0.25 // 15 mins in hours

const DAY_TYPES = ['Normal', 'Annual Leave', 'Sick Leave', 'Personal Leave', 'Public Holiday', 'Unpaid Leave', 'RDO']

const TYPE_STYLE = {
  'Normal':         'bg-white',
  'Annual Leave':   'bg-emerald-50',
  'Sick Leave':     'bg-blush-50',
  'Personal Leave': 'bg-purple-50',
  'Public Holiday': 'bg-blue-50',
  'Unpaid Leave':   'bg-sand-100',
  'RDO':            'bg-amber-50',
}

const TYPE_BADGE = {
  'Normal':         'bg-sand-100 text-sand-600',
  'Annual Leave':   'bg-emerald-100 text-emerald-700',
  'Sick Leave':     'bg-blush-100 text-blush-700',
  'Personal Leave': 'bg-purple-100 text-purple-700',
  'Public Holiday': 'bg-blue-100 text-blue-700',
  'Unpaid Leave':   'bg-sand-200 text-sand-700',
  'RDO':            'bg-amber-100 text-amber-700',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMostRecentFortnight() {
  // Find the most recent Monday that falls on a fortnightly cycle
  // For simplicity: find last Monday
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day
  const lastMon = new Date(today)
  lastMon.setDate(today.getDate() + diffToMon)
  lastMon.setHours(0, 0, 0, 0)
  return lastMon
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function parseTime(t) {
  // "09:00" → decimal hours
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function calcHours(clockIn, clockOut, type) {
  if (type !== 'Normal') return STD_HOURS
  const inH = parseTime(clockIn)
  const outH = parseTime(clockOut)
  if (inH === null || outH === null) return null
  return Math.max(0, outH - inH)
}

function fmtHours(h) {
  if (h === null || h === undefined) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  if (mins === 0) return `${hrs}h`
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

function isShort(workedHours) {
  if (workedHours === null || workedHours === undefined) return false
  return workedHours < STD_HOURS - SHORT_THRESHOLD
}

// Build the 10 working-day grid for a fortnight starting on `startMon`
function buildFortnight(startMon) {
  const days = []
  for (let week = 0; week < 2; week++) {
    for (let d = 0; d < 5; d++) {
      const date = addDays(startMon, week * 7 + d)
      days.push({
        date: toISO(date),
        dayName: date.toLocaleDateString('en-AU', { weekday: 'long' }),
        weekNum: week,
      })
    }
  }
  return days
}

// ─── Row component ────────────────────────────────────────────────────────────
function DayRow({ day, row, onChange, isToday }) {
  const workedHours = calcHours(row.clock_in, row.clock_out, row.type)
  const short = row.type === 'Normal' && isShort(workedHours)
  const underAmt = short ? (STD_HOURS - workedHours) : null
  const isNormal = row.type === 'Normal'

  const rowBg = short
    ? 'bg-blush-50 border-blush-200'
    : TYPE_STYLE[row.type] || 'bg-white'

  return (
    <tr className={`border-b border-sand-100 transition-colors ${rowBg} ${isToday ? 'ring-2 ring-inset ring-blush-300' : ''}`}>
      {/* Day */}
      <td className="px-3 py-2.5 text-xs text-sand-500 whitespace-nowrap">
        <div className="font-medium text-sand-700">{day.dayName.slice(0, 3)}</div>
        <div className="text-[10px] text-sand-400">{new Date(day.date + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
      </td>

      {/* Std Hrs */}
      <td className="px-3 py-2.5 text-xs text-center text-sand-500">{STD_HOURS}</td>

      {/* Type */}
      <td className="px-3 py-2.5">
        <select
          value={row.type}
          onChange={e => onChange({ type: e.target.value })}
          className={`text-xs rounded-lg px-2 py-1 border border-sand-200 focus:ring-2 focus:ring-blush-300 focus:outline-none cursor-pointer ${TYPE_BADGE[row.type] || ''}`}
        >
          {DAY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>

      {/* Clock In */}
      <td className="px-3 py-2.5">
        {isNormal ? (
          <input
            type="time"
            value={row.clock_in || ''}
            onChange={e => onChange({ clock_in: e.target.value })}
            className="text-xs bg-white border border-sand-200 rounded-lg px-2 py-1 text-sand-800 focus:ring-2 focus:ring-blush-300 focus:outline-none w-24"
          />
        ) : <span className="text-xs text-sand-300 px-2">—</span>}
      </td>

      {/* Clock Out */}
      <td className="px-3 py-2.5">
        {isNormal ? (
          <input
            type="time"
            value={row.clock_out || ''}
            onChange={e => onChange({ clock_out: e.target.value })}
            className="text-xs bg-white border border-sand-200 rounded-lg px-2 py-1 text-sand-800 focus:ring-2 focus:ring-blush-300 focus:outline-none w-24"
          />
        ) : <span className="text-xs text-sand-300 px-2">—</span>}
      </td>

      {/* Hours Worked */}
      <td className={`px-3 py-2.5 text-xs text-center font-semibold ${
        short ? 'text-blush-600' : 'text-sand-700'
      }`}>
        {fmtHours(workedHours)}
      </td>

      {/* Under Std */}
      <td className={`px-3 py-2.5 text-xs text-center ${short ? 'text-blush-600 font-semibold' : 'text-sand-300'}`}>
        {short ? `-${fmtHours(underAmt)}` : '—'}
      </td>

      {/* Notes */}
      <td className="px-3 py-2.5 min-w-[140px]">
        <input
          value={row.notes || ''}
          onChange={e => onChange({ notes: e.target.value })}
          placeholder="Coaching, 1:1s…"
          className="w-full text-xs bg-transparent border-b border-sand-200 py-1 text-sand-700 placeholder-sand-300 focus:outline-none focus:border-blush-400"
        />
      </td>
    </tr>
  )
}

// ─── Totals row ───────────────────────────────────────────────────────────────
function TotalsRow({ label, rows, colSpan = false }) {
  const total = rows.reduce((sum, r) => {
    const h = calcHours(r.clock_in, r.clock_out, r.type)
    return sum + (h || STD_HOURS)
  }, 0)
  return (
    <tr className="bg-sand-100 border-b-2 border-sand-300">
      <td className="px-3 py-2 text-xs font-bold text-sand-700 uppercase tracking-wide" colSpan={3}>{label}</td>
      <td className="px-3 py-2 text-xs text-sand-400 text-center">{STD_HOURS * rows.length}</td>
      <td />
      <td className="px-3 py-2 text-xs font-bold text-sand-800 text-center">{fmtHours(total)}</td>
      <td className="px-3 py-2 text-xs font-bold text-blush-600 text-center">
        {total < STD_HOURS * rows.length - 0.1 ? `-${fmtHours(STD_HOURS * rows.length - total)}` : '—'}
      </td>
      <td />
    </tr>
  )
}

// ─── Pay Summary ──────────────────────────────────────────────────────────────
function PaySummary({ allRows }) {
  const byType = DAY_TYPES.reduce((acc, t) => {
    const typeRows = allRows.filter(r => r.type === t)
    const hours = typeRows.reduce((s, r) => {
      const h = calcHours(r.clock_in, r.clock_out, r.type)
      return s + (h !== null ? h : STD_HOURS)
    }, 0)
    if (hours > 0) acc[t] = hours
    return acc
  }, {})

  const totalWorked = allRows.reduce((s, r) => {
    const h = calcHours(r.clock_in, r.clock_out, r.type)
    return s + (h !== null ? h : STD_HOURS)
  }, 0)

  const underDays = allRows.filter(r => isShort(calcHours(r.clock_in, r.clock_out, r.type)))
  const totalUnder = underDays.reduce((s, r) => {
    const h = calcHours(r.clock_in, r.clock_out, r.type)
    return s + (STD_HOURS - (h || 0))
  }, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
      {/* Hours breakdown */}
      <div className="bg-white border border-sand-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-sand-500 uppercase tracking-wide mb-3">Pay Summary — This Fortnight</p>
        <div className="space-y-2">
          {Object.entries(byType).map(([type, hours]) => (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[type]}`}>{type}</span>
              </div>
              <span className="text-sm font-semibold text-sand-800">{fmtHours(hours)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-sand-100 flex items-center justify-between">
            <span className="text-sm font-bold text-sand-900">Total Hours</span>
            <span className="text-sm font-bold text-blush-600">{fmtHours(totalWorked)}</span>
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="bg-white border border-sand-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-sand-500 uppercase tracking-wide mb-3">Flags / Exceptions</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-sand-600">Days under standard</span>
            <span className={`text-sm font-bold ${underDays.length > 0 ? 'text-blush-600' : 'text-sand-400'}`}>{underDays.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-sand-600">Total under standard</span>
            <span className={`text-sm font-bold ${totalUnder > 0 ? 'text-blush-600' : 'text-sand-400'}`}>
              {totalUnder > 0.05 ? `-${fmtHours(totalUnder)}` : '—'}
            </span>
          </div>
          {underDays.length > 0 && (
            <div className="pt-2 border-t border-sand-100">
              <p className="text-xs text-sand-400 mb-1">Short days:</p>
              {underDays.map(r => (
                <div key={r.date} className="flex items-center justify-between text-xs">
                  <span className="text-sand-600">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="text-blush-600 font-medium">
                    -{fmtHours(STD_HOURS - (calcHours(r.clock_in, r.clock_out, r.type) || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimesheetPage() {
  const [cycleStart, setCycleStart] = useState(getMostRecentFortnight)
  const [rows, setRows] = useState({}) // keyed by date string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [error, setError] = useState(null)

  const fortnight = buildFortnight(cycleStart)
  const todayISO = toISO(new Date())

  useEffect(() => {
    getTimelog()
      .then(data => {
        const map = {}
        data.forEach(r => { map[r.date] = r })
        setRows(map)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function getRow(date) {
    return rows[date] || { date, type: 'Normal', clock_in: '', clock_out: '', notes: '' }
  }

  const handleChange = useCallback(async (date, updates) => {
    const current = getRow(date)
    const updated = { ...current, ...updates }
    setRows(prev => ({ ...prev, [date]: updated }))
    setSaving(prev => ({ ...prev, [date]: true }))
    try {
      const saved = await upsertTimelogRow(updated)
      setRows(prev => ({ ...prev, [date]: saved }))
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(prev => ({ ...prev, [date]: false }))
    }
  }, [rows])

  function prevCycle() {
    setCycleStart(d => { const n = new Date(d); n.setDate(n.getDate() - 14); return n })
  }
  function nextCycle() {
    setCycleStart(d => { const n = new Date(d); n.setDate(n.getDate() + 14); return n })
  }

  const week1 = fortnight.slice(0, 5)
  const week2 = fortnight.slice(5, 10)
  const allRowData = fortnight.map(d => getRow(d.date))

  const cycleLabel = `${cycleStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} — ${addDays(cycleStart, 13).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Time Log</h1>
          <p className="text-sand-400 text-sm mt-0.5">Shaniah — {cycleLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-sand-200 rounded-xl p-1">
            <button onClick={prevCycle} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-sand-700 px-2 whitespace-nowrap">{cycleLabel}</span>
            <button onClick={nextCycle} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-sand-400">Type colours:</span>
        {Object.entries(TYPE_BADGE).filter(([t]) => t !== 'Normal').map(([type, cls]) => (
          <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{type}</span>
        ))}
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blush-100 text-blush-700">Short day (pink row)</span>
      </div>

      {/* Timesheet table */}
      <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-sand-100 bg-sand-50">
          <h2 className="text-sm font-semibold text-sand-700">Pay Cycle — {cycleLabel}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sand-200 bg-sand-50">
                {['Day / Date', 'Std Hrs', 'Type', 'Clock In', 'Clock Out', 'Hours Worked', 'Under Std', 'Notes'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-sand-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Week 1 */}
              <tr className="bg-blush-50/50">
                <td colSpan={8} className="px-3 py-1.5 text-[10px] font-bold text-blush-500 uppercase tracking-widest">Week 1</td>
              </tr>
              {week1.map(d => (
                <DayRow
                  key={d.date}
                  day={d}
                  row={getRow(d.date)}
                  onChange={updates => handleChange(d.date, updates)}
                  isToday={d.date === todayISO}
                />
              ))}
              <TotalsRow label="Week 1 Total" rows={week1.map(d => getRow(d.date))} />

              {/* Week 2 */}
              <tr className="bg-blush-50/50">
                <td colSpan={8} className="px-3 py-1.5 text-[10px] font-bold text-blush-500 uppercase tracking-widest">Week 2</td>
              </tr>
              {week2.map(d => (
                <DayRow
                  key={d.date}
                  day={d}
                  row={getRow(d.date)}
                  onChange={updates => handleChange(d.date, updates)}
                  isToday={d.date === todayISO}
                />
              ))}
              <TotalsRow label="Week 2 Total" rows={week2.map(d => getRow(d.date))} />

              {/* Pay cycle total */}
              <tr className="bg-blush-100 border-t-2 border-blush-300">
                <td className="px-3 py-2.5 text-xs font-bold text-blush-800 uppercase tracking-wide" colSpan={3}>Pay Cycle Total</td>
                <td className="px-3 py-2.5 text-xs text-blush-600 text-center font-semibold">{STD_HOURS * 10}</td>
                <td />
                <td className="px-3 py-2.5 text-xs font-bold text-blush-800 text-center">
                  {fmtHours(allRowData.reduce((s, r) => s + (calcHours(r.clock_in, r.clock_out, r.type) ?? STD_HOURS), 0))}
                </td>
                <td className="px-3 py-2.5 text-xs font-bold text-blush-700 text-center">
                  {(() => {
                    const total = allRowData.reduce((s, r) => s + (calcHours(r.clock_in, r.clock_out, r.type) ?? STD_HOURS), 0)
                    const diff = STD_HOURS * 10 - total
                    return diff > 0.1 ? `-${fmtHours(diff)}` : '—'
                  })()}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Summary + Flags */}
      <PaySummary allRows={allRowData} />

      {/* Auto-save note */}
      <p className="text-xs text-sand-400 text-center">
        <Clock className="w-3 h-3 inline mr-1" />
        Changes save automatically as you type
      </p>
    </div>
  )
}
