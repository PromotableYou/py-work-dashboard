import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react'
import { getCalendars, addCalendar, deleteCalendar } from '../../../lib/supabase'

const MODES = [
  { label: 'Day',    value: 'DAY'    },
  { label: 'Week',   value: 'WEEK'   },
  { label: 'Month',  value: 'MONTH'  },
  { label: 'Agenda', value: 'AGENDA' },
]

// Google Calendar colour options (preset palette)
const COLORS = [
  { label: 'Flamingo',  hex: '#E67C73' },
  { label: 'Tangerine', hex: '#F6BF26' },
  { label: 'Sage',      hex: '#33B679' },
  { label: 'Peacock',   hex: '#039BE5' },
  { label: 'Blueberry', hex: '#3F51B5' },
  { label: 'Lavender',  hex: '#7986CB' },
  { label: 'Grape',     hex: '#8E24AA' },
  { label: 'Graphite',  hex: '#616161' },
]

function buildEmbedUrl(calendars, mode) {
  if (calendars.length === 0) return null
  const params = new URLSearchParams({
    ctz: 'Australia/Brisbane',
    showTitle: '0',
    showNav: '1',
    showPrint: '0',
    showTabs: '1',
    showCalendars: '1',
    showTz: '0',
    mode,
  })
  const base = 'https://calendar.google.com/calendar/embed?'
  // Multiple src + color params
  const srcs = calendars.map(c => `src=${encodeURIComponent(c.google_calendar_id)}`).join('&')
  const colors = calendars.map(c => `color=${encodeURIComponent(c.color || '#E67C73')}`).join('&')
  return `${base}${srcs}&${colors}&${params.toString()}`
}

export default function CoachesCalendarPage() {
  const [calendars, setCalendars] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState('WEEK')
  const [embedKey, setEmbedKey] = useState(0)
  const [form, setForm] = useState({ name: '', google_calendar_id: '', color: '#E67C73' })

  useEffect(() => {
    getCalendars()
      .then(setCalendars)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.google_calendar_id.trim()) return
    try {
      const saved = await addCalendar({
        name: form.name.trim(),
        google_calendar_id: form.google_calendar_id.trim(),
        color: form.color,
      })
      setCalendars(prev => [...prev, saved])
      setForm({ name: '', google_calendar_id: '', color: '#E67C73' })
      setShowForm(false)
      setEmbedKey(k => k + 1) // force iframe reload
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deleteCalendar(id)
      setCalendars(prev => prev.filter(c => c.id !== id))
      setEmbedKey(k => k + 1)
    } catch (e) { setError(e.message) }
  }

  const embedUrl = buildEmbedUrl(calendars, mode)

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
          <h1 className="text-xl font-bold text-sand-900">Coaches Calendars</h1>
          <p className="text-sand-400 text-sm mt-0.5">{calendars.length} calendar{calendars.length !== 1 ? 's' : ''} connected</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Calendar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <h2 className="font-semibold text-sand-900 mb-1">Connect a Calendar</h2>
          <p className="text-xs text-sand-400 mb-4">
            You need the coach's Google Calendar ID — they can find it in Google Calendar → Settings → their calendar → "Calendar ID" (looks like name@gmail.com or a long string ending in @group.calendar.google.com).
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-sand-500 mb-1">Coach Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sarah Coach"
                  autoFocus
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-sand-500 mb-1">Google Calendar ID</label>
                <input
                  value={form.google_calendar_id}
                  onChange={e => setForm(f => ({ ...f, google_calendar_id: e.target.value }))}
                  placeholder="e.g. coach@gmail.com"
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Colour picker */}
            <div>
              <label className="block text-xs text-sand-500 mb-2">Calendar Colour</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c.hex }))}
                    title={c.label}
                    className={`w-7 h-7 rounded-full transition-transform ${form.color === c.hex ? 'ring-2 ring-offset-2 ring-sand-500 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-sand-500 hover:text-sand-700 px-3 py-2">Cancel</button>
              <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Add Calendar</button>
            </div>
          </form>
        </div>
      )}

      {/* Connected calendars */}
      {calendars.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {calendars.map(cal => (
            <div
              key={cal.id}
              className="flex items-center gap-2 bg-white border border-sand-200 rounded-full px-3 py-1.5 group"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cal.color || '#E67C73' }} />
              <span className="text-sm font-medium text-sand-700">{cal.name}</span>
              <button
                onClick={() => handleDelete(cal.id)}
                className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Calendar embed */}
      {calendars.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm font-medium">No calendars connected yet</p>
          <p className="text-sand-400 text-xs mt-1">Add a coach's calendar above to see their schedule here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex bg-white border border-sand-200 rounded-xl p-1 gap-1">
              {MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    mode === m.value
                      ? 'bg-blush-500 text-white shadow-sm'
                      : 'text-sand-500 hover:text-sand-700 hover:bg-sand-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEmbedKey(k => k + 1)}
                className="flex items-center gap-1.5 text-xs font-medium text-sand-500 hover:text-sand-700 bg-white border border-sand-200 px-3 py-2 rounded-xl transition-colors"
                title="Refresh calendars"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-blush-500 hover:text-blush-600 bg-white border border-sand-200 px-3 py-2 rounded-xl transition-colors"
              >
                Open in Google <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden shadow-sm">
            <iframe
              key={`${embedKey}-${mode}`}
              src={`${embedUrl}&mode=${mode}`}
              style={{ border: 0 }}
              width="100%"
              height="700"
              frameBorder="0"
              scrolling="no"
              title="Coaches Calendars"
            />
          </div>
        </div>
      )}
    </div>
  )
}
