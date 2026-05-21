import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Printer, Plus, X, Pencil, Check } from 'lucide-react'
import {
  getCoaches,
  getRosterBlocks, addRosterBlock, deleteRosterBlock,
  getSessionTypes, addSessionType, deleteSessionType,
} from '../../../lib/supabase'

const DAY_KEYS  = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const PALETTE_COLORS = [
  '#f9a8d4','#fca5a5','#fdba74','#fcd34d','#86efac',
  '#6ee7b7','#7dd3fc','#a5b4fc','#d8b4fe','#f0abfc',
]

const DEFAULT_TYPES = [
  { name: 'Resume Review',   color: '#7dd3fc' },
  { name: 'Career Coaching', color: '#86efac' },
  { name: 'Interview Prep',  color: '#fcd34d' },
  { name: 'TLC QA',          color: '#d8b4fe' },
  { name: 'Group Session',   color: '#f9a8d4' },
  { name: '1:1 Check-in',    color: '#fdba74' },
]

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0,0,0,0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }

// Readable text colour (black or white) based on background
function textColor(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return (r*299 + g*587 + b*114) / 1000 > 128 ? '#1a1a1a' : '#ffffff'
}

// ─── Session block (in a cell) ───────────────────────────────────────────────
function SessionBlock({ block, onDelete }) {
  return (
    <div
      className="group flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 mb-1 last:mb-0 text-xs font-semibold shadow-sm"
      style={{ backgroundColor: block.color, color: textColor(block.color) }}
    >
      <span className="truncate leading-tight">{block.session_name}</span>
      <button
        onClick={() => onDelete(block.id)}
        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 shrink-0 transition-opacity"
        style={{ color: textColor(block.color) }}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Drop cell ───────────────────────────────────────────────────────────────
function DropCell({ coachName, dayKey, blocks, onDrop, onDelete, isToday }) {
  const [over, setOver] = useState(false)

  function handleDragOver(e) { e.preventDefault(); setOver(true) }
  function handleDragLeave()  { setOver(false) }
  function handleDrop(e) {
    e.preventDefault()
    setOver(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      onDrop(coachName, dayKey, data)
    } catch {}
  }

  return (
    <td
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-sand-200 px-2 py-2 align-top min-w-[120px] transition-colors ${
        over    ? 'bg-blush-50 border-blush-300'  :
        isToday ? 'bg-blush-50/40' : ''
      }`}
    >
      {blocks.map(b => (
        <SessionBlock key={b.id} block={b} onDelete={onDelete} />
      ))}
      {over && blocks.length === 0 && (
        <div className="border-2 border-dashed border-blush-300 rounded-lg h-8 flex items-center justify-center">
          <span className="text-[10px] text-blush-400">Drop here</span>
        </div>
      )}
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RosterPage() {
  const [weekOffset, setWeekOffset]     = useState(0)
  const [coaches, setCoaches]           = useState([])
  const [blocks, setBlocks]             = useState([])
  const [sessionTypes, setSessionTypes] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  // New session type form
  const [showAddType, setShowAddType]   = useState(false)
  const [newTypeName, setNewTypeName]   = useState('')
  const [newTypeColor, setNewTypeColor] = useState(PALETTE_COLORS[0])

  const baseStart    = getWeekStart()
  const weekStart    = addDays(baseStart, weekOffset * 7)
  const weekStartISO = toISO(weekStart)
  const dayDates     = DAY_KEYS.map((_, i) => addDays(weekStart, i))
  const TODAY        = toISO(new Date())

  const weekLabel = `${weekStart.toLocaleDateString('en-AU',{day:'numeric',month:'long'})} – ${addDays(weekStart,4).toLocaleDateString('en-AU',{day:'numeric',month:'long',year:'numeric'})}`
  const weekShort = weekOffset===0?'This week':weekOffset===1?'Next week':weekOffset===-1?'Last week':weekLabel

  // Initial load
  useEffect(() => {
    Promise.all([getCoaches(), getSessionTypes()])
      .then(([c, st]) => {
        setCoaches(c)
        setSessionTypes(st.length ? st : [])
        // Seed defaults if empty
        if (!st.length) seedDefaults()
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function seedDefaults() {
    try {
      const saved = []
      for (let i = 0; i < DEFAULT_TYPES.length; i++) {
        const s = await addSessionType({ name: DEFAULT_TYPES[i].name, color: DEFAULT_TYPES[i].color, sort_order: i })
        saved.push(s)
      }
      setSessionTypes(saved)
    } catch {}
  }

  // Reload blocks when week changes
  useEffect(() => {
    setLoading(true)
    getRosterBlocks(weekStartISO)
      .then(setBlocks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [weekStartISO])

  // Block lookup: coachName + dayKey → array of blocks
  function getBlocks(coachName, dayKey) {
    return blocks.filter(b => b.coach_name === coachName && b.day_key === dayKey)
  }

  async function handleDrop(coachName, dayKey, { name, color }) {
    try {
      const existing = getBlocks(coachName, dayKey)
      const saved = await addRosterBlock({
        week_start: weekStartISO,
        coach_name: coachName,
        day_key: dayKey,
        session_name: name,
        color,
        sort_order: existing.length,
      })
      setBlocks(prev => [...prev, saved])
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteBlock(id) {
    try {
      await deleteRosterBlock(id)
      setBlocks(prev => prev.filter(b => b.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleAddSessionType(e) {
    e.preventDefault()
    if (!newTypeName.trim()) return
    try {
      const saved = await addSessionType({ name: newTypeName.trim(), color: newTypeColor, sort_order: sessionTypes.length })
      setSessionTypes(prev => [...prev, saved])
      setNewTypeName('')
      setNewTypeColor(PALETTE_COLORS[0])
      setShowAddType(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteSessionType(id) {
    try {
      await deleteSessionType(id)
      setSessionTypes(prev => prev.filter(s => s.id !== id))
    } catch (e) { setError(e.message) }
  }

  // Copy all blocks from last week to this week
  async function handleCopyLastWeek() {
    try {
      const prevISO   = toISO(addDays(weekStart, -7))
      const prevBlocks = await getRosterBlocks(prevISO)
      if (!prevBlocks.length) { alert('No roster found for last week.'); return }
      const saved = []
      for (const b of prevBlocks) {
        const s = await addRosterBlock({ ...b, id: undefined, week_start: weekStartISO, created_at: undefined })
        saved.push(s)
      }
      setBlocks(prev => [...prev, ...saved])
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-4 pb-6">
      <style>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          main { margin-left: 0 !important; }
          .max-w-6xl { max-width: 100% !important; padding: 0 !important; }
          .print-header { display: block !important; margin-bottom: 10px; }
          @page { size: landscape; margin: 1cm; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Print header */}
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
          <div className="flex items-center gap-1 bg-white border border-sand-200 rounded-xl p-1">
            <button onClick={() => setWeekOffset(o => o-1)} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-sand-700 px-2 whitespace-nowrap">{weekShort}</span>
            <button onClick={() => setWeekOffset(o => o+1)} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={handleCopyLastWeek} className="text-sm border border-sand-200 bg-white hover:bg-sand-50 text-sand-600 px-3 py-2 rounded-xl transition-colors">
            Copy last week
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl no-print">{error}</div>}

      {/* ── Session type palette ─────────────────────────────────────────── */}
      <div className="bg-white border border-sand-200 rounded-2xl p-4 no-print">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-bold text-sand-500 uppercase tracking-widest">Session Types</p>
          <p className="text-[10px] text-sand-400">— drag onto the roster below</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {sessionTypes.map(st => (
            <div key={st.id} className="group relative">
              <div
                draggable
                onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify({ name: st.name, color: st.color }))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold cursor-grab active:cursor-grabbing shadow-sm select-none transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: st.color, color: textColor(st.color) }}
              >
                {st.name}
              </div>
              <button
                onClick={() => handleDeleteSessionType(st.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full items-center justify-center shadow-sm transition-colors hidden group-hover:flex"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}

          {/* Add new type */}
          {showAddType ? (
            <form onSubmit={handleAddSessionType} className="flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-xl px-3 py-1.5">
              <input
                value={newTypeName}
                onChange={e => setNewTypeName(e.target.value)}
                placeholder="Session name…"
                autoFocus
                className="text-sm bg-transparent outline-none w-36 text-sand-800 placeholder-sand-400"
              />
              <div className="flex gap-1">
                {PALETTE_COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setNewTypeColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${newTypeColor === c ? 'scale-125 border-sand-600' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button type="button" onClick={() => setShowAddType(false)} className="text-sand-400 hover:text-sand-600"><X className="w-3.5 h-3.5" /></button>
              <button type="submit" className="text-blush-500 hover:text-blush-600"><Check className="w-3.5 h-3.5" /></button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddType(true)}
              className="flex items-center gap-1 text-xs text-sand-400 hover:text-sand-700 border border-dashed border-sand-300 hover:border-sand-400 rounded-xl px-3 py-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add type
            </button>
          )}
        </div>
      </div>

      {/* ── Roster grid ─────────────────────────────────────────────────── */}
      {coaches.length === 0 ? (
        <div className="text-center py-16 bg-white border border-sand-200 rounded-2xl">
          <p className="text-sand-500 font-medium">No coaches yet</p>
          <p className="text-sand-400 text-xs mt-1">Add coaches on the Coaches Calendar page first</p>
        </div>
      ) : (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden print:border-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-sand-50 border-b-2 border-sand-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-sand-500 uppercase tracking-wide w-36 border-r-2 border-sand-200">
                    Coach
                  </th>
                  {DAY_KEYS.map((key, i) => {
                    const isToday = toISO(dayDates[i]) === TODAY
                    return (
                      <th key={key} className={`px-3 py-3 text-center border-r border-sand-100 last:border-r-0 ${isToday ? 'bg-blush-50' : ''}`}>
                        <div className={`text-xs font-bold ${isToday ? 'text-blush-600' : 'text-sand-700'}`}>{DAY_SHORT[i]}</div>
                        <div className={`text-[10px] font-normal ${isToday ? 'text-blush-400' : 'text-sand-400'}`}>
                          {dayDates[i].toLocaleDateString('en-AU',{day:'numeric',month:'short'})}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {coaches.map((coach, i) => (
                  <tr key={coach.id} className={`border-b border-sand-100 last:border-0 ${i%2===0?'':'bg-sand-50/20'}`}>
                    {/* Coach */}
                    <td className="px-4 py-3 border-r-2 border-sand-200 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: coach.color || '#e5a0a0' }}>
                          {coach.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-sand-800 leading-tight">{coach.name}</span>
                      </div>
                    </td>

                    {/* Day cells */}
                    {DAY_KEYS.map((key, di) => (
                      <DropCell
                        key={key}
                        coachName={coach.name}
                        dayKey={key}
                        blocks={getBlocks(coach.name, key)}
                        onDrop={handleDrop}
                        onDelete={handleDeleteBlock}
                        isToday={toISO(dayDates[di]) === TODAY}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-sand-400 text-center no-print">
        Drag session types onto the grid · hover a block to remove it · Print / PDF exports landscape
      </p>
    </div>
  )
}
