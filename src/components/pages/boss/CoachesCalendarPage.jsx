import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Calendar, ExternalLink, RefreshCw, FileText, AlertCircle, Users } from 'lucide-react'
import { getCoaches, addCoach, deleteCoach, getNotes, addNote, updateNote, deleteNote } from '../../../lib/supabase'

const CAL_MODES = [
  { label: 'Day',    value: 'DAY'    },
  { label: 'Week',   value: 'WEEK'   },
  { label: 'Month',  value: 'MONTH'  },
  { label: 'Agenda', value: 'AGENDA' },
]

const COACH_COLORS = [
  '#e5a0a0', '#f5c27a', '#a0c4e5', '#a0e5b0', '#c4a0e5',
  '#e5c4a0', '#a0e5e5', '#e5a0c4', '#b0d4a0', '#d4a0d4',
]

// Pull calendar ID out of a pasted <iframe> embed code or raw URL/ID
function parseEmbedCode(input) {
  const trimmed = input.trim()
  const iframeSrc = trimmed.match(/src="(https:\/\/calendar\.google\.com[^"]+)"/)
  const url = iframeSrc ? iframeSrc[1] : trimmed
  const srcParam = url.match(/[?&]src=([^&]+)/)
  if (srcParam) return decodeURIComponent(srcParam[1])
  return trimmed || null
}

function buildEmbedUrl(coaches, mode) {
  const withCal = coaches.filter(c => c.google_calendar_id)
  if (!withCal.length) return null
  const srcs = withCal.map(c => `src=${encodeURIComponent(c.google_calendar_id)}`).join('&')
  return `https://calendar.google.com/calendar/embed?${srcs}&ctz=Australia%2FBrisbane&showTitle=0&showNav=1&showPrint=0&showTabs=1&showCalendars=1&showTz=0&mode=${mode}`
}

// ─── Coach Notes ──────────────────────────────────────────────────────────────
function CoachNotes() {
  const [notes, setNotes]       = useState([])
  const [expanded, setExpanded] = useState(false)
  const [newText, setNewText]   = useState('')
  const saveTimers              = useRef({})

  useEffect(() => { getNotes('coaches').then(setNotes).catch(() => {}) }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newText.trim()) return
    const saved = await addNote({ title: '', content: newText.trim(), workspace: 'coaches', color: 'yellow', pinned: false })
    setNotes(prev => [saved, ...prev])
    setNewText('')
  }

  function handleEdit(id, content) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n))
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => updateNote(id, { content }), 700)
  }

  async function handleDelete(id) {
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-sand-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sand-900 text-sm">Notes</span>
          {notes.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{notes.length}</span>
          )}
        </div>
        <span className="text-sand-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 space-y-3 border-t border-sand-100">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-amber-200 focus:outline-none"
            />
            <button type="submit" className="bg-amber-400 hover:bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              Add
            </button>
          </form>
          {notes.length === 0 ? (
            <p className="text-xs text-sand-300 text-center py-2">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="group flex gap-2 items-start bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                  <textarea
                    value={note.content}
                    onChange={e => handleEdit(note.id, e.target.value)}
                    rows={2}
                    className="flex-1 text-sm text-sand-800 bg-transparent border-0 outline-none resize-none"
                  />
                  <button onClick={() => handleDelete(note.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoachesCalendarPage() {
  const [coaches, setCoaches]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [newName, setNewName]           = useState('')
  const [newEmbed, setNewEmbed]         = useState('')
  const [calMode, setCalMode]           = useState('WEEK')
  const [embedKey, setEmbedKey]         = useState(0)
  const [hiddenIds, setHiddenIds]       = useState(new Set()) // coach IDs toggled off

  useEffect(() => {
    getCoaches()
      .then(setCoaches)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function toggleCoach(id) {
    setHiddenIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setEmbedKey(k => k + 1)
  }

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
    if (!window.confirm('Remove this coach?')) return
    try {
      await deleteCoach(id)
      setCoaches(prev => prev.filter(c => c.id !== id))
      setHiddenIds(prev => { const n = new Set(prev); n.delete(id); return n })
      setEmbedKey(k => k + 1)
    } catch (e) { setError(e.message) }
  }

  const calCoaches   = coaches.filter(c => c.google_calendar_id)
  const noCalCoaches = coaches.filter(c => !c.google_calendar_id)
  const visibleCoaches = calCoaches.filter(c => !hiddenIds.has(c.id))
  const embedUrl     = buildEmbedUrl(visibleCoaches, calMode)

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
          <h1 className="text-xl font-bold text-sand-900">Coaches Calendar</h1>
          <p className="text-sand-400 text-sm mt-0.5">{calCoaches.length} calendar{calCoaches.length !== 1 ? 's' : ''} connected</p>
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

      {/* Add coach form */}
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
                Google Calendar embed code <span className="text-sand-400">(paste the &lt;iframe&gt; from Google Calendar settings)</span>
              </label>
              <textarea
                value={newEmbed}
                onChange={e => setNewEmbed(e.target.value)}
                placeholder='<iframe src="https://calendar.google.com/calendar/embed?src=..." ...></iframe>'
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

      {/* No coaches at all */}
      {coaches.length === 0 && (
        <div className="text-center py-20">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-medium">No coaches added yet</p>
          <p className="text-sand-400 text-xs mt-1">Add a coach with their Google Calendar embed code to get started</p>
        </div>
      )}

      {/* Coaches without calendars */}
      {noCalCoaches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">Missing calendar link</p>
          <div className="flex flex-wrap gap-2">
            {noCalCoaches.map(c => (
              <div key={c.id} className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-sand-700">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.color || '#e5a0a0' }} />
                {c.name}
                <button onClick={() => handleDeleteCoach(c.id)} className="text-sand-300 hover:text-red-400 ml-1 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">Delete and re-add these coaches with their Google Calendar embed code.</p>
        </div>
      )}

      {/* Combined Google Calendar embed */}
      {embedUrl ? (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-sand-100 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4 text-warm-400 shrink-0" />
              {calCoaches.map(c => {
                const isOn = !hiddenIds.has(c.id)
                return (
                  <div key={c.id} className="flex items-center gap-0.5 group">
                    <button
                      onClick={() => toggleCoach(c.id)}
                      title={isOn ? `Hide ${c.name}` : `Show ${c.name}`}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all ${
                        isOn
                          ? 'text-white shadow-sm'
                          : 'text-sand-400 bg-sand-100 line-through'
                      }`}
                      style={isOn ? { backgroundColor: c.color || '#e5a0a0' } : {}}
                    >
                      {c.name}
                    </button>
                    <button
                      onClick={() => handleDeleteCoach(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Mode switcher */}
              <div className="flex bg-sand-50 border border-sand-200 rounded-lg p-0.5 gap-0.5">
                {CAL_MODES.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setCalMode(m.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${calMode === m.value ? 'bg-white shadow-sm text-sand-900' : 'text-sand-400 hover:text-sand-700'}`}
                  >
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

          {/* The calendar itself */}
          <iframe
            key={`${embedKey}-${calMode}`}
            src={embedUrl}
            style={{ border: 0 }}
            width="100%"
            height="700"
            frameBorder="0"
            scrolling="no"
            title="Coaches Calendars"
          />
        </div>
      ) : (
        coaches.length > 0 && (
          <div className="bg-sand-50 border border-sand-200 rounded-2xl p-8 text-center">
            <Calendar className="w-8 h-8 text-sand-300 mx-auto mb-3" />
            {calCoaches.length === 0 ? (
              <>
                <p className="text-sand-500 font-medium text-sm">No calendars connected yet</p>
                <p className="text-sand-400 text-xs mt-1">Add Google Calendar embed codes to see them here</p>
              </>
            ) : (
              <>
                <p className="text-sand-500 font-medium text-sm">All calendars hidden</p>
                <p className="text-sand-400 text-xs mt-1">Click a name above to show their calendar</p>
              </>
            )}
          </div>
        )
      )}

      {/* Notes */}
      <CoachNotes />
    </div>
  )
}
