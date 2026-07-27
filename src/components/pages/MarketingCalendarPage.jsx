import { useState, useEffect, useMemo } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, X, AlertCircle,
  List, LayoutGrid, Trash2, Edit2, Check, Clock,
} from 'lucide-react'
import { getMarketingEvents, addMarketingEvent, updateMarketingEvent, deleteMarketingEvent } from '../../lib/supabase'

const TYPES = {
  social:   { label: 'Social Media',  color: '#8B5CF6' },
  email:    { label: 'Email',         color: '#3B82F6' },
  content:  { label: 'Content/Blog',  color: '#10B981' },
  campaign: { label: 'Campaign',      color: '#F0457A' },
  event:    { label: 'Event',         color: '#F97316' },
  webinar:  { label: 'Webinar',       color: '#EAB308' },
  ads:      { label: 'Paid Ads',      color: '#EC4899' },
  other:    { label: 'Other',         color: '#94A3B8' },
}

const STATUSES = {
  idea:      { label: 'Idea',       cls: 'bg-sand-100 text-sand-500 border-sand-200'     },
  planned:   { label: 'Planned',    cls: 'bg-blue-50 text-blue-600 border-blue-200'      },
  in_review: { label: 'In Review',  cls: 'bg-amber-50 text-amber-700 border-amber-200'   },
  approved:  { label: 'Approved',   cls: 'bg-violet-50 text-violet-700 border-violet-200'},
  live:      { label: 'Live',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  done:      { label: 'Done',       cls: 'bg-sand-50 text-sand-400 border-sand-200'      },
}

const PLATFORMS = ['Instagram', 'LinkedIn', 'Facebook', 'Email', 'Website', 'YouTube', 'TikTok', 'All Channels', 'Other']
const OWNERS    = ['Shaniah', 'Stacey', 'Em', 'William', 'External']
const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getCalendarDays(year, month) {
  const first   = new Date(year, month, 1)
  const last    = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7  // Mon = 0
  const days = []
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), current: false })
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: new Date(year, month, d), current: true })
  }
  const rem = 7 - (days.length % 7)
  if (rem < 7) {
    for (let d = 1; d <= rem; d++) days.push({ date: new Date(year, month + 1, d), current: false })
  }
  return days
}

// ─── Event form ───────────────────────────────────────────────────────────────
function EventForm({ initial = {}, onSave, onClose, title = 'Add Item' }) {
  const [form, setForm] = useState({
    title:       initial.title       || '',
    date:        initial.date        || '',
    end_date:    initial.end_date    || '',
    type:        initial.type        || 'social',
    platform:    initial.platform    || '',
    status:      initial.status      || 'planned',
    owner:       initial.owner       || '',
    description: initial.description || '',
  })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return
    onSave({ ...form, title: form.title.trim() })
  }

  return (
    <div className="bg-white border-2 border-blush-200 rounded-2xl p-5 space-y-3 mb-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sand-900 text-sm">{title}</h3>
        <button onClick={onClose} className="text-sand-300 hover:text-sand-500"><X className="w-4 h-4"/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="Title…" autoFocus required
          className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest block mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} required
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none"/>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest block mb-1">End Date</label>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest block mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none">
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest block mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none">
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest block mb-1">Platform</label>
            <select value={form.platform} onChange={e => set('platform', e.target.value)}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none">
              <option value="">Select…</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest block mb-1">Owner</label>
            <select value={form.owner} onChange={e => set('owner', e.target.value)}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none">
              <option value="">Unassigned</option>
              {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <textarea
          value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Description, links, notes… (optional)" rows={2}
          className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-700 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none resize-none"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm text-sand-500 py-2 rounded-xl border border-sand-200 hover:bg-sand-50 transition-colors">Cancel</button>
          <button type="submit"
            className="flex-1 text-sm bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-xl font-semibold transition-colors">Save</button>
        </div>
      </form>
    </div>
  )
}

// ─── Event detail popover ─────────────────────────────────────────────────────
function EventDetail({ event, onEdit, onDelete, onClose }) {
  const type   = TYPES[event.type]   || TYPES.other
  const status = STATUSES[event.status] || STATUSES.planned
  return (
    <div className="absolute z-50 bg-white border border-sand-200 rounded-2xl shadow-lg p-4 w-72"
      style={{ top: '110%', left: 0 }}>
      <div className="flex items-start gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5" style={{ background: type.color }}/>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sand-900 leading-snug">{event.title}</p>
          <p className="text-[11px] text-sand-400 mt-0.5">{type.label}{event.platform ? ` · ${event.platform}` : ''}</p>
        </div>
        <button onClick={onClose} className="text-sand-300 hover:text-sand-500 shrink-0"><X className="w-4 h-4"/></button>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}>{status.label}</span>
          {event.owner && <span className="text-[10px] text-sand-500 font-medium">{event.owner}</span>}
        </div>
        <p className="text-xs text-sand-500 flex items-center gap-1">
          <Clock className="w-3 h-3"/>
          {event.date}{event.end_date && event.end_date !== event.date ? ` → ${event.end_date}` : ''}
        </p>
        {event.description && <p className="text-xs text-sand-600 leading-relaxed">{event.description}</p>}
      </div>
      <div className="flex gap-2 border-t border-sand-100 pt-3">
        <button onClick={() => onEdit(event)}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-sand-600 hover:text-sand-800 font-medium py-1.5 rounded-lg border border-sand-200 hover:bg-sand-50 transition-colors">
          <Edit2 className="w-3 h-3"/> Edit
        </button>
        <button onClick={() => onDelete(event.id)}
          className="flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3 h-3"/> Delete
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MarketingCalendarPage() {
  const now = new Date()
  const [year,  setYear]   = useState(now.getFullYear())
  const [month, setMonth]  = useState(now.getMonth())
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState(null)
  const [view, setView]           = useState('calendar') // calendar | list
  const [showAdd, setShowAdd]     = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [activeEvent, setActiveEvent] = useState(null)  // for detail popover
  const [filterType, setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    getMarketingEvents()
      .then(setEvents)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  const days = useMemo(() => getCalendarDays(year, month), [year, month])

  const filteredEvents = events.filter(e =>
    (!filterType   || e.type === filterType) &&
    (!filterStatus || e.status === filterStatus)
  )

  function eventsForDay(iso) {
    return filteredEvents.filter(e => {
      if (!e.end_date || e.end_date === e.date) return e.date === iso
      return iso >= e.date && iso <= e.end_date
    })
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  async function handleSave(fields) {
    try {
      const saved = await addMarketingEvent(fields)
      setEvents(p => [...p, saved].sort((a, b) => a.date.localeCompare(b.date)))
      setShowAdd(false)
    } catch(e) { setErr(e.message) }
  }

  async function handleUpdate(fields) {
    try {
      await updateMarketingEvent(editEvent.id, fields)
      setEvents(p => p.map(e => e.id === editEvent.id ? { ...e, ...fields } : e))
      setEditEvent(null)
      setActiveEvent(null)
    } catch(e) { setErr(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deleteMarketingEvent(id)
      setEvents(p => p.filter(e => e.id !== id))
      setActiveEvent(null)
    } catch(e) { setErr(e.message) }
  }

  async function handleStatusCycle(event) {
    const order = Object.keys(STATUSES)
    const idx  = order.indexOf(event.status)
    const next = order[(idx + 1) % order.length]
    try {
      await updateMarketingEvent(event.id, { status: next })
      setEvents(p => p.map(e => e.id === event.id ? { ...e, status: next } : e))
    } catch(e) { setErr(e.message) }
  }

  // List view: group by month
  const listByMonth = useMemo(() => {
    const groups = {}
    for (const e of filteredEvents) {
      const key = e.date.slice(0, 7)
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    }
    return Object.entries(groups).sort(([a],[b]) => a.localeCompare(b))
  }, [filteredEvents])

  const todayISO = toISO(new Date())

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Marketing Calendar</h1>
          <p className="text-sand-400 text-sm mt-0.5">{filteredEvents.length} item{filteredEvents.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter: type */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-xs bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-700 focus:ring-2 focus:ring-blush-200 focus:outline-none">
            <option value="">All types</option>
            {Object.entries(TYPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {/* Filter: status */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-700 focus:ring-2 focus:ring-blush-200 focus:outline-none">
            <option value="">All statuses</option>
            {Object.entries(STATUSES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {/* View toggle */}
          <div className="flex items-center bg-sand-100 rounded-xl p-1">
            <button onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'calendar' ? 'bg-white text-sand-800 shadow-sm' : 'text-sand-400 hover:text-sand-600'}`}>
              <LayoutGrid className="w-3.5 h-3.5"/> Calendar
            </button>
            <button onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'list' ? 'bg-white text-sand-800 shadow-sm' : 'text-sand-400 hover:text-sand-600'}`}>
              <List className="w-3.5 h-3.5"/> List
            </button>
          </div>
          <button onClick={() => { setShowAdd(true); setEditEvent(null) }}
            className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4"/> Add Item
          </button>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 shrink-0"/>{err}
          <button onClick={() => setErr(null)} className="ml-auto"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      {/* Add / edit form */}
      {showAdd && (
        <EventForm onSave={handleSave} onClose={() => setShowAdd(false)} title="Add Marketing Item"/>
      )}
      {editEvent && !showAdd && (
        <EventForm initial={editEvent} onSave={handleUpdate} onClose={() => setEditEvent(null)} title="Edit Item"/>
      )}

      {/* Type legend */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {Object.entries(TYPES).map(([k, v]) => (
          <button key={k} onClick={() => setFilterType(filterType === k ? '' : k)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
              filterType === k
                ? 'bg-sand-800 text-white border-sand-800'
                : 'bg-white border-sand-200 text-sand-600 hover:border-sand-300'
            }`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }}/>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
            <button onClick={prevMonth} className="w-8 h-8 rounded-xl hover:bg-sand-100 flex items-center justify-center text-sand-500 transition-colors">
              <ChevronLeft className="w-4 h-4"/>
            </button>
            <h2 className="text-base font-bold text-sand-900">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 rounded-xl hover:bg-sand-100 flex items-center justify-center text-sand-500 transition-colors">
              <ChevronRight className="w-4 h-4"/>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-sand-100">
            {DAYS_SHORT.map(d => (
              <div key={d} className="px-2 py-2 text-center text-[10px] font-bold text-sand-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map(({ date, current }, i) => {
              const iso     = toISO(date)
              const dayEvts = eventsForDay(iso)
              const isToday = iso === todayISO
              const isWeekend = date.getDay() === 0 || date.getDay() === 6

              return (
                <div
                  key={i}
                  className={`min-h-[90px] p-1.5 border-b border-r border-sand-100 last:border-r-0 relative transition-colors
                    ${current ? '' : 'bg-sand-50/50'}
                    ${isWeekend && current ? 'bg-sand-50/70' : ''}`}
                  style={{ borderColor: '#f1ede8' }}
                >
                  {/* Day number */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 mx-auto
                    ${isToday ? 'bg-blush-500 text-white' : current ? 'text-sand-700' : 'text-sand-300'}`}>
                    {date.getDate()}
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5">
                    {dayEvts.slice(0, 3).map(evt => {
                      const type = TYPES[evt.type] || TYPES.other
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setActiveEvent(activeEvent?.id === evt.id ? null : evt)}
                          className="relative"
                        >
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity truncate"
                            style={{ background: type.color + '22', color: type.color, borderLeft: `2px solid ${type.color}` }}
                          >
                            <span className="truncate">{evt.title}</span>
                          </div>
                          {activeEvent?.id === evt.id && (
                            <EventDetail
                              event={evt}
                              onEdit={e => { setEditEvent(e); setActiveEvent(null) }}
                              onDelete={handleDelete}
                              onClose={() => setActiveEvent(null)}
                            />
                          )}
                        </div>
                      )
                    })}
                    {dayEvts.length > 3 && (
                      <p className="text-[9px] text-sand-400 font-semibold pl-1">+{dayEvts.length - 3} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-6">
          {listByMonth.length === 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl px-5 py-16 text-center">
              <p className="text-sand-400 text-sm">No items yet{filterType || filterStatus ? ' matching this filter' : ''}</p>
              {!filterType && !filterStatus && (
                <button onClick={() => setShowAdd(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
                  Add your first item →
                </button>
              )}
            </div>
          )}
          {listByMonth.map(([key, evts]) => {
            const [y, m] = key.split('-')
            const label  = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
            return (
              <div key={key}>
                <h3 className="text-xs font-bold text-sand-500 uppercase tracking-widest mb-3">{label}</h3>
                <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
                  {evts.map((evt, idx) => {
                    const type   = TYPES[evt.type]   || TYPES.other
                    const status = STATUSES[evt.status] || STATUSES.planned
                    return (
                      <div key={evt.id} className={`group flex items-start gap-4 px-5 py-4 hover:bg-sand-50 transition-colors ${idx > 0 ? 'border-t border-sand-100' : ''}`}>
                        {/* Type dot */}
                        <div className="flex flex-col items-center shrink-0 pt-0.5">
                          <span className="w-3 h-3 rounded-full" style={{ background: type.color }}/>
                        </div>
                        {/* Date */}
                        <div className="shrink-0 w-[56px]">
                          <p className="text-xs font-bold text-sand-700">
                            {new Date(evt.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                          {evt.end_date && evt.end_date !== evt.date && (
                            <p className="text-[10px] text-sand-400">
                              → {new Date(evt.end_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-sand-900">{evt.title}</p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.cls}`}>{status.label}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-semibold text-sand-500" style={{ color: type.color }}>{type.label}</span>
                            {evt.platform && <span className="text-[10px] text-sand-400">{evt.platform}</span>}
                            {evt.owner && <span className="text-[10px] text-sand-400">· {evt.owner}</span>}
                          </div>
                          {evt.description && (
                            <p className="text-xs text-sand-500 mt-1 leading-relaxed line-clamp-2">{evt.description}</p>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <button onClick={() => handleStatusCycle(evt)}
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border hover:opacity-80 transition-opacity"
                            style={{ borderColor: '#e2ddd8', color: '#94a3b8' }}
                            title="Cycle status">
                            {status.label}
                          </button>
                          <button onClick={() => setEditEvent(evt)}
                            className="text-sand-300 hover:text-sand-600 transition-colors">
                            <Edit2 className="w-3.5 h-3.5"/>
                          </button>
                          <button onClick={() => handleDelete(evt.id)}
                            className="text-sand-300 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
