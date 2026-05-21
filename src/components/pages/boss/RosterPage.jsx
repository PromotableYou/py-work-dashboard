import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Printer, Copy, Users } from 'lucide-react'
import { getCoaches, getRoster, upsertRosterRow } from '../../../lib/supabase'

const DAY_KEYS  = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// ─── Editable session cell ────────────────────────────────────────────────────
function SessionCell({ coachName, dayKey, value, onChange }) {
  const [local, setLocal] = useState(value || '')
  const timer = useRef(null)

  useEffect(() => { setLocal(value || '') }, [value, coachName, dayKey])

  function handleChange(e) {
    setLocal(e.target.value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(coachName, dayKey, e.target.value), 600)
  }

  return (
    <td className="border border-sand-200 px-2 py-2 align-top min-w-[120px]">
      <textarea
        value={local}
        onChange={handleChange}
        rows={3}
        placeholder="—"
        className={`w-full text-sm bg-transparent outline-none resize-none leading-snug transition-colors placeholder-sand-200 print:text-xs ${
          local.trim() ? 'text-sand-800' : 'text-sand-300'
        }`}
      />
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RosterPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [coaches, setCoaches]       = useState([])
  const [rosterData, setRosterData] = useState([]) // rows from wd_roster
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [copying, setCopying]       = useState(false)

  const baseStart    = getWeekStart()
  const weekStart    = addDays(baseStart, weekOffset * 7)
  const weekStartISO = toISO(weekStart)
  const weekEnd      = addDays(weekStart, 4) // Friday

  const dayDates = DAY_KEYS.map((_, i) => addDays(weekStart, i))
  const TODAY    = toISO(new Date())

  const weekLabel = `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const weekShort =
    weekOffset === 0  ? 'This week'  :
    weekOffset === 1  ? 'Next week'  :
    weekOffset === -1 ? 'Last week'  : weekLabel

  // Load coaches once, reload roster when week changes
  useEffect(() => {
    getCoaches()
      .then(setCoaches)
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    setLoading(true)
    getRoster(weekStartISO)
      .then(setRosterData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [weekStartISO])

  // Lookup: coachName → roster row for this week
  const rowByCoach = {}
  rosterData.forEach(r => { rowByCoach[r.slot_label] = r })

  function getCell(coachName, dayKey) {
    return rowByCoach[coachName]?.[dayKey] || ''
  }

  const handleCellChange = useCallback(async (coachName, dayKey, value) => {
    try {
      const existing = rowByCoach[coachName]
      const row = existing
        ? { ...existing, [dayKey]: value }
        : { week_start: weekStartISO, slot_label: coachName, sort_order: coaches.findIndex(c => c.name === coachName), mon: '', tue: '', wed: '', thu: '', fri: '', [dayKey]: value }
      const saved = await upsertRosterRow(row)
      setRosterData(prev => {
        const idx = prev.findIndex(r => r.slot_label === coachName)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
    } catch (e) { setError(e.message) }
  }, [weekStartISO, rosterData, coaches])

  async function handleCopyLastWeek() {
    setCopying(true)
    try {
      const prevISO  = toISO(addDays(weekStart, -7))
      const prevRows = await getRoster(prevISO)
      if (!prevRows.length) { alert('No roster found for last week.'); return }
      const saved = []
      for (const r of prevRows) {
        const row = await upsertRosterRow({
          week_start: weekStartISO,
          slot_label: r.slot_label,
          sort_order: r.sort_order,
          mon: r.mon || '', tue: r.tue || '', wed: r.wed || '',
          thu: r.thu || '', fri: r.fri || '',
        })
        saved.push(row)
      }
      setRosterData(saved)
    } catch (e) { setError(e.message) }
    finally { setCopying(false) }
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Print styles */}
      <style>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          main { margin-left: 0 !important; }
          .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
          .print-header { display: block !important; margin-bottom: 12px; }
          textarea { resize: none; }
          @page { size: landscape; margin: 1.2cm; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Print-only header */}
      <div className="print-header">
        <h2 className="text-lg font-bold">Promotable You — Coach Roster</h2>
        <p className="text-sm text-gray-500">{weekLabel}</p>
      </div>

      {/* Screen header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Roster</h1>
          <p className="text-sand-400 text-sm mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Week navigator */}
          <div className="flex items-center gap-1 bg-white border border-sand-200 rounded-xl p-1">
            <button onClick={() => setWeekOffset(o => o - 1)} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-sand-700 px-2 whitespace-nowrap">{weekShort}</span>
            <button onClick={() => setWeekOffset(o => o + 1)} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCopyLastWeek}
            disabled={copying}
            className="flex items-center gap-1.5 text-sm border border-sand-200 bg-white hover:bg-sand-50 text-sand-600 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            {copying ? 'Copying…' : 'Copy last week'}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl no-print">{error}</div>
      )}

      {/* No coaches state */}
      {!loading && coaches.length === 0 && (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-2xl">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-medium">No coaches yet</p>
          <p className="text-sand-400 text-xs mt-1">Add coaches on the Coaches Calendar page first</p>
        </div>
      )}

      {/* Roster table */}
      {coaches.length > 0 && (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden print:border-0 print:rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sand-50 border-b-2 border-sand-200 print:bg-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-sand-500 uppercase tracking-wide w-36 border-r-2 border-sand-200 print:w-28">
                    Coach
                  </th>
                  {DAY_KEYS.map((key, i) => {
                    const date    = dayDates[i]
                    const isToday = toISO(date) === TODAY
                    return (
                      <th key={key} className={`px-3 py-3 text-center border-r border-sand-100 last:border-r-0 ${isToday ? 'bg-blush-50' : ''}`}>
                        <div className={`text-xs font-bold ${isToday ? 'text-blush-600' : 'text-sand-700'}`}>{DAY_SHORT[i]}</div>
                        <div className={`text-[10px] font-normal ${isToday ? 'text-blush-400' : 'text-sand-400'}`}>
                          {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10">
                      <div className="w-5 h-5 border-2 border-blush-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : (
                  coaches.map((coach, i) => (
                    <tr key={coach.id} className={`border-b border-sand-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/30'}`}>
                      {/* Coach name */}
                      <td className="px-4 py-3 border-r-2 border-sand-200 align-middle print:px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ backgroundColor: coach.color || '#e5a0a0' }}
                          >
                            {coach.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-sand-800 leading-tight">{coach.name}</span>
                        </div>
                      </td>

                      {/* Session cells */}
                      {DAY_KEYS.map(key => (
                        <SessionCell
                          key={key}
                          coachName={coach.name}
                          dayKey={key}
                          value={getCell(coach.name, key)}
                          onChange={handleCellChange}
                        />
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-sand-400 text-center no-print">
        Tip: click <strong>Print / PDF</strong> → set orientation to <strong>Landscape</strong> → Save as PDF
      </p>
    </div>
  )
}
