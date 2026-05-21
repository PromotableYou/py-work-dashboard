import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Printer, Copy } from 'lucide-react'
import { getRoster, upsertRosterRow, deleteRosterRow } from '../../../lib/supabase'

const DAY_KEYS   = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // shift so Mon = 0
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// ─── Editable cell ────────────────────────────────────────────────────────────
function RosterCell({ row, dayKey, onChange }) {
  const [value, setValue] = useState(row[dayKey] || '')
  const timer = useRef(null)

  useEffect(() => { setValue(row[dayKey] || '') }, [row.id, row[dayKey]])

  function handleChange(e) {
    setValue(e.target.value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(row, dayKey, e.target.value), 600)
  }

  const hasValue = value.trim().length > 0

  return (
    <td className={`border border-sand-200 px-2 py-1.5 print:px-1 print:py-1 ${dayKey === 'sat' || dayKey === 'sun' ? 'bg-sand-50/60' : ''}`}>
      <input
        value={value}
        onChange={handleChange}
        className={`w-full text-center text-sm bg-transparent outline-none transition-colors print:text-xs ${
          hasValue ? 'text-sand-900 font-medium' : 'text-sand-300 placeholder-sand-200'
        }`}
        placeholder="–"
      />
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RosterPage() {
  const [weekOffset, setWeekOffset]     = useState(0)
  const [rows, setRows]                 = useState([])
  const [loading, setLoading]           = useState(true)
  const [newSlot, setNewSlot]           = useState('')
  const [showAddSlot, setShowAddSlot]   = useState(false)
  const [error, setError]               = useState(null)
  const [copying, setCopying]           = useState(false)

  const baseStart    = getWeekStart()
  const weekStart    = addDays(baseStart, weekOffset * 7)
  const weekStartISO = toISO(weekStart)
  const weekEnd      = addDays(weekStart, 6)

  // Dates for each column header
  const dayDates = DAY_KEYS.map((_, i) => addDays(weekStart, i))

  const TODAY = toISO(new Date())

  const weekLabel = `${weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
  const weekShortLabel =
    weekOffset === 0 ? 'This week' :
    weekOffset === 1 ? 'Next week' :
    weekOffset === -1 ? 'Last week' :
    weekLabel

  useEffect(() => {
    setLoading(true)
    getRoster(weekStartISO)
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [weekStartISO])

  const handleCellChange = useCallback(async (row, dayKey, value) => {
    try {
      const saved = await upsertRosterRow({ ...row, [dayKey]: value })
      setRows(prev => prev.map(r => r.id === row.id ? saved : r))
    } catch (e) { setError(e.message) }
  }, [])

  async function handleAddSlot(e) {
    e.preventDefault()
    if (!newSlot.trim()) return
    try {
      const saved = await upsertRosterRow({
        week_start: weekStartISO,
        slot_label: newSlot.trim(),
        sort_order: rows.length,
        mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '',
      })
      setRows(prev => [...prev, saved])
      setNewSlot('')
      setShowAddSlot(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteRow(id) {
    try {
      await deleteRosterRow(id)
      setRows(prev => prev.filter(r => r.id !== id))
    } catch (e) { setError(e.message) }
  }

  // Copy slot labels from previous week (no values)
  async function handleCopySlots() {
    setCopying(true)
    try {
      const prevISO = toISO(addDays(weekStart, -7))
      const prevRows = await getRoster(prevISO)
      if (!prevRows.length) { alert('No slots found in previous week.'); return }
      const saved = []
      for (const r of prevRows) {
        const row = await upsertRosterRow({
          week_start: weekStartISO,
          slot_label: r.slot_label,
          sort_order: r.sort_order,
          mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '',
        })
        saved.push(row)
      }
      setRows(saved)
    } catch (e) { setError(e.message) }
    finally { setCopying(false) }
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Print-specific styles */}
      <style>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          main { margin-left: 0 !important; }
          .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
          .print-header { display: block !important; margin-bottom: 12px; }
          @page { size: landscape; margin: 1.2cm; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Print-only header */}
      <div className="print-header">
        <h2 className="text-lg font-bold text-gray-900">Promotable You — Coach Roster</h2>
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
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-sand-700 px-2 whitespace-nowrap">{weekShortLabel}</span>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Copy slots from last week */}
          {rows.length === 0 && !loading && (
            <button
              onClick={handleCopySlots}
              disabled={copying}
              className="flex items-center gap-1.5 text-sm border border-sand-200 bg-white hover:bg-sand-50 text-sand-600 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              {copying ? 'Copying…' : 'Copy last week\'s slots'}
            </button>
          )}

          {/* Print */}
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

      {/* Roster table */}
      <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden print:border-0 print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-sand-50 border-b-2 border-sand-200 print:bg-gray-100">
                {/* Slot label column */}
                <th className="text-left px-4 py-3 text-xs font-bold text-sand-500 uppercase tracking-wide w-36 border-r-2 border-sand-200 print:w-28">
                  Time / Session
                </th>
                {DAY_KEYS.map((key, i) => {
                  const date = dayDates[i]
                  const iso  = toISO(date)
                  const isToday   = iso === TODAY
                  const isWeekend = key === 'sat' || key === 'sun'
                  return (
                    <th key={key} className={`px-2 py-3 text-center border-r border-sand-100 last:border-r-0 ${isWeekend ? 'bg-sand-100/60' : ''} ${isToday ? 'bg-blush-50' : ''}`}>
                      <div className={`text-xs font-bold ${isToday ? 'text-blush-600' : 'text-sand-700'}`}>
                        {DAY_SHORT[i]}
                      </div>
                      <div className={`text-[10px] font-normal ${isToday ? 'text-blush-400' : 'text-sand-400'}`}>
                        {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                    </th>
                  )
                })}
                <th className="w-8 no-print" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <div className="w-5 h-5 border-2 border-blush-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sand-400 text-sm no-print">
                    <p className="font-medium">No time slots yet</p>
                    <p className="text-xs mt-1">Add a slot below, or copy from last week</p>
                  </td>
                </tr>
              )}

              {rows.map((row, i) => (
                <tr key={row.id} className={`border-b border-sand-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/30'}`}>
                  {/* Slot label */}
                  <td className="px-4 py-2 border-r-2 border-sand-200 print:px-2 print:py-1">
                    <span className="text-sm font-semibold text-sand-800 whitespace-nowrap">{row.slot_label}</span>
                  </td>

                  {/* Day cells */}
                  {DAY_KEYS.map(key => (
                    <RosterCell key={key} row={row} dayKey={key} onChange={handleCellChange} />
                  ))}

                  {/* Delete row */}
                  <td className="px-2 py-2 no-print">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-sand-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Empty print rows */}
              {[...Array(Math.max(0, 8 - rows.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="hidden print:table-row border-b border-sand-100">
                  <td className="px-4 py-3 border-r-2 border-sand-200">&nbsp;</td>
                  {DAY_KEYS.map(key => (
                    <td key={key} className="border border-sand-200 px-2 py-3">&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add slot row */}
        {showAddSlot ? (
          <form onSubmit={handleAddSlot} className="flex items-center gap-2 px-4 py-3 border-t border-sand-200 bg-sand-50 no-print">
            <input
              value={newSlot}
              onChange={e => setNewSlot(e.target.value)}
              placeholder="e.g. 9:00 AM, Morning Class, Session 1…"
              autoFocus
              className="flex-1 text-sm bg-white border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
            <button type="button" onClick={() => setShowAddSlot(false)} className="text-sm text-sand-400 px-3 py-2">Cancel</button>
            <button type="submit" className="text-sm bg-blush-500 hover:bg-blush-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">Add</button>
          </form>
        ) : (
          <button
            onClick={() => setShowAddSlot(true)}
            className="flex items-center gap-2 w-full px-4 py-3 border-t border-sand-200 text-sand-400 hover:text-sand-700 hover:bg-sand-50 transition-colors text-sm no-print"
          >
            <Plus className="w-4 h-4" /> Add time slot
          </button>
        )}
      </div>

      {/* Print tip */}
      <p className="text-xs text-sand-400 text-center no-print">
        Tip: Click <strong>Print / PDF</strong> → in your print dialog, choose "Save as PDF" and set orientation to <strong>Landscape</strong>
      </p>
    </div>
  )
}
