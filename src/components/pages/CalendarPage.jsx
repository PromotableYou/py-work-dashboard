import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, AlertCircle } from 'lucide-react'
import { getEvents, addEvent, deleteEvent } from '../../lib/supabase'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const EVENT_COLORS = [
  'bg-warm-100 border-warm-300 text-warm-800',
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-emerald-100 border-emerald-300 text-emerald-800',
  'bg-pink-100 border-pink-300 text-pink-800',
]

export default function CalendarPage() {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', time: '', description: '', color: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function isoDate(d) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function eventsOn(d) {
    return events.filter(e => e.date === isoDate(d))
  }

  function isToday(d) {
    return isoDate(d) === today.toISOString().slice(0, 10)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim() || !selected) return
    try {
      const saved = await addEvent({ title: form.title, time: form.time, description: form.description, color: form.color, date: isoDate(selected) })
      setEvents(prev => [...prev, saved])
      setForm({ title: '', time: '', description: '', color: 0 })
      setShowAdd(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (e) { setError(e.message) }
  }

  // Upcoming events (today + future)
  const todayStr = today.toISOString().slice(0, 10)
  const upcoming = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 8)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-sand-900">Calendar</h1>
        <p className="text-sand-400 text-sm mt-0.5">Click a day to add an event</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-white border border-sand-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold text-sand-900">{MONTHS[month]} {year}</h2>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => <p key={d} className="text-center text-xs font-semibold text-sand-400 py-1">{d}</p>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
              const dayEvents = eventsOn(d)
              const today_ = isToday(d)
              const sel = selected === d
              return (
                <button
                  key={d}
                  onClick={() => { setSelected(d); setShowAdd(true) }}
                  className={`relative rounded-xl p-1 min-h-[52px] text-left transition-all hover:bg-warm-50 ${
                    today_ ? 'ring-2 ring-warm-400' : ''
                  } ${sel ? 'bg-warm-50' : ''}`}
                >
                  <span className={`text-xs font-semibold block mb-1 text-center ${
                    today_ ? 'text-warm-600' : 'text-sand-700'
                  }`}>{d}</span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div key={ev.id} className={`text-[9px] leading-tight px-1 py-0.5 rounded border ${EVENT_COLORS[ev.color || 0]} truncate`}>
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[9px] text-sand-400 text-center">+{dayEvents.length - 2}</div>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Add event form */}
          {showAdd && selected && (
            <div className="mt-5 pt-5 border-t border-sand-100">
              <h3 className="text-sm font-semibold text-sand-900 mb-3">
                Add event — {MONTHS[month]} {selected}
              </h3>
              <form onSubmit={handleAdd} className="space-y-2">
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title…"
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 focus:ring-2 focus:ring-warm-300"
                  />
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Notes…"
                    className="text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300"
                  />
                </div>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c, i) => (
                    <button
                      key={i} type="button"
                      onClick={() => setForm(f => ({ ...f, color: i }))}
                      className={`w-6 h-6 rounded-full border-2 ${c} ${form.color === i ? 'ring-2 ring-offset-1 ring-sand-400' : ''}`}
                    />
                  ))}
                  <div className="flex-1" />
                  <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-sand-400 hover:text-sand-600 px-2">Cancel</button>
                  <button type="submit" className="text-xs bg-warm-500 hover:bg-warm-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">Save</button>
                </div>
              </form>

              {/* Events on selected day */}
              {eventsOn(selected).length > 0 && (
                <div className="mt-3 space-y-1">
                  {eventsOn(selected).map(ev => (
                    <div key={ev.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${EVENT_COLORS[ev.color || 0]}`}>
                      <div>
                        <p className="text-sm font-medium">{ev.title}</p>
                        {ev.time && <p className="text-xs opacity-70">{ev.time}{ev.description ? ` · ${ev.description}` : ''}</p>}
                      </div>
                      <button onClick={() => handleDelete(ev.id)} className="hover:opacity-70 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <h2 className="font-semibold text-sand-900 mb-3">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-sand-400 text-center py-8">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(ev => {
                const d = new Date(ev.date + 'T00:00:00')
                const isToday_ = ev.date === todayStr
                return (
                  <div key={ev.id} className={`p-3 rounded-xl border ${EVENT_COLORS[ev.color || 0]}`}>
                    <p className="text-xs font-semibold mb-0.5 opacity-70">
                      {isToday_ ? 'Today' : d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {ev.time && ` · ${ev.time}`}
                    </p>
                    <p className="text-sm font-medium">{ev.title}</p>
                    {ev.description && <p className="text-xs opacity-70 mt-0.5">{ev.description}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
