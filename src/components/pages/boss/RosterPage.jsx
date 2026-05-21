import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Printer, Plus, X, Check, Pencil } from 'lucide-react'
import {
  getCoaches,
  getRosterBlocks, addRosterBlock, updateRosterBlock, deleteRosterBlock,
  getSessionTypes, addSessionType, updateSessionType, deleteSessionType,
} from '../../../lib/supabase'

const DAY_KEYS  = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const PALETTE_COLORS = [
  '#f9a8d4','#fca5a5','#fdba74','#fcd34d','#86efac',
  '#6ee7b7','#7dd3fc','#a5b4fc','#d8b4fe','#f0abfc','#94a3b8',
]

// All 11 fixed types + 1 custom slot
const DEFAULT_TYPES = [
  { name: 'Evening Q&A',               color: '#a5b4fc', is_custom: false },
  { name: 'Confidence & Clarity',      color: '#f9a8d4', is_custom: false },
  { name: 'TLC Hour of Power',         color: '#d8b4fe', is_custom: false, has_topic: true },
  { name: 'Game Plan & Orientation',   color: '#86efac', is_custom: false },
  { name: 'Q&A Breakout Room',         color: '#7dd3fc', is_custom: false },
  { name: 'New & Fast Start Breakout', color: '#6ee7b7', is_custom: false },
  { name: 'Senior Exec Breakout',      color: '#475569', is_custom: false },
  { name: 'Early Access Breakout',     color: '#fdba74', is_custom: false },
  { name: 'TLC Q&A',                   color: '#c4b5fd', is_custom: false },
  { name: 'Resume & Interviews',       color: '#93c5fd', is_custom: false },
  { name: 'Custom',                    color: '#94a3b8', is_custom: true  },
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

function textColor(hex) {
  if (!hex || hex.length < 7) return '#1a1a1a'
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return (r*299 + g*587 + b*114) / 1000 > 128 ? '#1a1a1a' : '#ffffff'
}

// ─── Palette chip (draggable, editable if custom) ────────────────────────────
function PaletteChip({ st, onDelete, onRename }) {
  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(st.name)
  const inputRef              = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  function commitRename() {
    setEditing(false)
    if (name.trim() && name.trim() !== st.name) onRename(st.id, name.trim())
    else setName(st.name)
  }

  const fg = textColor(st.color)

  return (
    <div className="group relative">
      {editing ? (
        <div className="flex items-center gap-1 rounded-xl px-2 py-1.5 border-2 border-blush-300 bg-white">
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setName(st.name) } }}
            className="text-sm outline-none w-36 text-sand-800"
          />
          <button onMouseDown={commitRename} className="text-blush-500"><Check className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <div
          draggable
          onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify({ name: st.name, color: st.color, has_topic: !!st.has_topic }))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold cursor-grab active:cursor-grabbing shadow-sm select-none transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: st.color, color: fg }}
        >
          {st.name}
          {st.is_custom && (
            <button
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setEditing(true) }}
              className="opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: fg }}
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => onDelete(st.id)}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full items-center justify-center shadow-sm transition-colors hidden group-hover:flex"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  )
}

// ─── Placed session block (with inline time + topic editing) ─────────────────
function SessionBlock({ block, onDelete, onUpdate, readOnly }) {
  const [editingTime,  setEditingTime]  = useState(false)
  const [editingTopic, setEditingTopic] = useState(false)
  const [time,  setTime]  = useState(block.time  || '')
  const [topic, setTopic] = useState(block.topic || '')
  const timeRef  = useRef(null)
  const topicRef = useRef(null)

  useEffect(() => { if (editingTime)  timeRef.current?.select()  }, [editingTime])
  useEffect(() => { if (editingTopic) topicRef.current?.select() }, [editingTopic])

  const fg = textColor(block.color)

  function saveTime() {
    setEditingTime(false)
    onUpdate(block.id, { time: time.trim() })
  }
  function saveTopic() {
    setEditingTopic(false)
    onUpdate(block.id, { topic: topic.trim() })
  }

  return (
    <div
      className="group relative rounded-lg px-2 py-1.5 mb-1 last:mb-0 shadow-sm"
      style={{ backgroundColor: block.color, color: fg }}
    >
      {/* Delete button — hidden in read-only */}
      {!readOnly && (
        <button
          onClick={() => onDelete(block.id)}
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden group-hover:flex"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Time row */}
      <div className="flex items-center gap-1 mb-0.5">
        {!readOnly && editingTime ? (
          <input
            ref={timeRef}
            value={time}
            onChange={e => setTime(e.target.value)}
            onBlur={saveTime}
            onKeyDown={e => { if (e.key === 'Enter') saveTime(); if (e.key === 'Escape') setEditingTime(false) }}
            placeholder="e.g. 7:00 PM"
            className="text-[10px] font-bold bg-white/30 rounded px-1 outline-none w-24 placeholder-current/50"
            style={{ color: fg }}
          />
        ) : (
          <span
            onClick={!readOnly ? () => setEditingTime(true) : undefined}
            className={`text-[10px] font-bold opacity-80 ${!readOnly ? 'hover:opacity-100 cursor-pointer' : ''} transition-opacity`}
            style={{ color: fg }}
          >
            {time || (!readOnly && <span className="opacity-40">+ time</span>)}
          </span>
        )}
      </div>

      {/* Session name */}
      <p className="text-xs font-semibold leading-tight">{block.session_name}</p>

      {/* Topic row */}
      {!readOnly && editingTopic ? (
        <input
          ref={topicRef}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onBlur={saveTopic}
          onKeyDown={e => { if (e.key === 'Enter') saveTopic(); if (e.key === 'Escape') setEditingTopic(false) }}
          placeholder="Topic…"
          className="mt-0.5 text-[10px] bg-white/30 rounded px-1 outline-none w-full placeholder-current/50"
          style={{ color: fg }}
        />
      ) : (
        <span
          onClick={!readOnly ? () => setEditingTopic(true) : undefined}
          className={`mt-0.5 text-[10px] opacity-70 ${!readOnly ? 'hover:opacity-100 cursor-pointer' : ''} transition-opacity block`}
          style={{ color: fg }}
        >
          {topic || (!readOnly && <span className="opacity-40">+ topic</span>)}
        </span>
      )}
    </div>
  )
}

// ─── Drop cell ───────────────────────────────────────────────────────────────
function DropCell({ coachName, dayKey, blocks, onDrop, onDelete, onUpdate, isToday, readOnly }) {
  const [over, setOver] = useState(false)

  function handleDragOver(e) { if (readOnly) return; e.preventDefault(); setOver(true) }
  function handleDragLeave()  { setOver(false) }
  function handleDrop(e) {
    if (readOnly) return
    e.preventDefault(); setOver(false)
    try { onDrop(coachName, dayKey, JSON.parse(e.dataTransfer.getData('application/json'))) } catch {}
  }

  return (
    <td
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-sand-200 px-2 py-2 align-top min-w-[140px] transition-colors ${
        over ? 'bg-blush-50 border-blush-300' : isToday ? 'bg-blush-50/30' : ''
      }`}
    >
      {blocks.map(b => (
        <SessionBlock key={b.id} block={b} onDelete={onDelete} onUpdate={onUpdate} readOnly={readOnly} />
      ))}
      {!readOnly && over && (
        <div className="border-2 border-dashed border-blush-300 rounded-lg h-8 flex items-center justify-center mt-1">
          <span className="text-[10px] text-blush-400">Drop here</span>
        </div>
      )}
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RosterPage({ readOnly = false }) {
  const [weekOffset, setWeekOffset]     = useState(0)
  const [coaches, setCoaches]           = useState([])
  const [blocks, setBlocks]             = useState([])
  const [sessionTypes, setSessionTypes] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
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

  useEffect(() => {
    Promise.all([getCoaches(), getSessionTypes()])
      .then(([c, st]) => {
        setCoaches(c)
        if (st.length) { setSessionTypes(st) }
        else { seedDefaults() }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function seedDefaults() {
    try {
      const saved = []
      for (let i = 0; i < DEFAULT_TYPES.length; i++) {
        const s = await addSessionType({ ...DEFAULT_TYPES[i], sort_order: i })
        saved.push(s)
      }
      setSessionTypes(saved)
    } catch {}
  }

  useEffect(() => {
    setLoading(true)
    getRosterBlocks(weekStartISO)
      .then(setBlocks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [weekStartISO])

  function getBlocks(coachName, dayKey) {
    return blocks.filter(b => b.coach_name === coachName && b.day_key === dayKey)
  }

  const handleDrop = useCallback(async (coachName, dayKey, { name, color, has_topic }) => {
    try {
      const saved = await addRosterBlock({
        week_start: weekStartISO, coach_name: coachName, day_key: dayKey,
        session_name: name, color, time: '', topic: '',
        sort_order: getBlocks(coachName, dayKey).length,
      })
      setBlocks(prev => [...prev, saved])
    } catch (e) { setError(e.message) }
  }, [weekStartISO, blocks])

  const handleUpdateBlock = useCallback(async (id, updates) => {
    try {
      const saved = await updateRosterBlock(id, updates)
      setBlocks(prev => prev.map(b => b.id === id ? saved : b))
    } catch (e) { setError(e.message) }
  }, [])

  const handleDeleteBlock = useCallback(async (id) => {
    try {
      await deleteRosterBlock(id)
      setBlocks(prev => prev.filter(b => b.id !== id))
    } catch (e) { setError(e.message) }
  }, [])

  async function handleAddSessionType(e) {
    e.preventDefault()
    if (!newTypeName.trim()) return
    try {
      const saved = await addSessionType({ name: newTypeName.trim(), color: newTypeColor, sort_order: sessionTypes.length, is_custom: false })
      setSessionTypes(prev => [...prev, saved])
      setNewTypeName(''); setNewTypeColor(PALETTE_COLORS[0]); setShowAddType(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteSessionType(id) {
    try {
      await deleteSessionType(id)
      setSessionTypes(prev => prev.filter(s => s.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleRenameSessionType(id, name) {
    try {
      const saved = await updateSessionType(id, { name })
      setSessionTypes(prev => prev.map(s => s.id === id ? saved : s))
      // Also update any placed blocks that used the old name
      setBlocks(prev => prev.map(b => {
        const old = sessionTypes.find(s => s.id === id)
        return (old && b.session_name === old.name) ? { ...b, session_name: name } : b
      }))
    } catch (e) { setError(e.message) }
  }

  async function handleCopyLastWeek() {
    try {
      const prevISO    = toISO(addDays(weekStart, -7))
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

      <div className="print-header">
        <h2 className="text-lg font-bold">Promotable You — Coach Roster</h2>
        <p className="text-sm text-gray-500">{weekLabel}</p>
      </div>

      {/* Header */}
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
          {!readOnly && (
            <button onClick={handleCopyLastWeek} className="text-sm border border-sand-200 bg-white hover:bg-sand-50 text-sand-600 px-3 py-2 rounded-xl transition-colors">
              Copy last week
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Printer className="w-4 h-4" /> Print / PDF
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl no-print">{error}</div>}

      {/* Session type palette — hidden for read-only view */}
      {!readOnly && <div className="bg-white border border-sand-200 rounded-2xl p-4 no-print">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-bold text-sand-500 uppercase tracking-widest">Session Types</p>
          <p className="text-[10px] text-sand-400">— drag onto the roster · click time/topic on a block to edit</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {sessionTypes.map(st => (
            <PaletteChip
              key={st.id}
              st={st}
              onDelete={handleDeleteSessionType}
              onRename={handleRenameSessionType}
            />
          ))}

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
                  <button key={c} type="button" onClick={() => setNewTypeColor(c)}
                    className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${newTypeColor===c?'scale-125 border-sand-600':'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button type="button" onClick={() => setShowAddType(false)} className="text-sand-400"><X className="w-3.5 h-3.5" /></button>
              <button type="submit" className="text-blush-500"><Check className="w-3.5 h-3.5" /></button>
            </form>
          ) : (
            <button onClick={() => setShowAddType(true)}
              className="flex items-center gap-1 text-xs text-sand-400 hover:text-sand-700 border border-dashed border-sand-300 hover:border-sand-400 rounded-xl px-3 py-1.5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add type
            </button>
          )}
        </div>
      </div>}

      {/* Roster grid */}
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
                  <th className="text-left px-4 py-3 text-xs font-bold text-sand-500 uppercase tracking-wide w-36 border-r-2 border-sand-200">Coach</th>
                  {DAY_KEYS.map((key, i) => {
                    const isToday = toISO(dayDates[i]) === TODAY
                    return (
                      <th key={key} className={`px-3 py-3 text-center border-r border-sand-100 last:border-r-0 ${isToday?'bg-blush-50':''}`}>
                        <div className={`text-xs font-bold ${isToday?'text-blush-600':'text-sand-700'}`}>{DAY_SHORT[i]}</div>
                        <div className={`text-[10px] font-normal ${isToday?'text-blush-400':'text-sand-400'}`}>
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
                    <td className="px-4 py-3 border-r-2 border-sand-200 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: coach.color||'#e5a0a0' }}>
                          {coach.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-sand-800">{coach.name}</span>
                      </div>
                    </td>
                    {DAY_KEYS.map((key, di) => (
                      <DropCell
                        key={key}
                        coachName={coach.name}
                        dayKey={key}
                        blocks={getBlocks(coach.name, key)}
                        onDrop={handleDrop}
                        onDelete={handleDeleteBlock}
                        onUpdate={handleUpdateBlock}
                        isToday={toISO(dayDates[di])===TODAY}
                        readOnly={readOnly}
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
        Drag session types onto the grid · click time or topic on a block to edit · hover to delete
      </p>
    </div>
  )
}
