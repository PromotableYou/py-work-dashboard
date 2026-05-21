import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, CalendarDays, Clock, Users, ChevronDown, ChevronUp, Check, AlertCircle, FileText } from 'lucide-react'
import { getMeetings, addMeeting, updateMeeting, deleteMeeting, getMeetingTasks, addMeetingTask, updateMeetingTask, deleteMeetingTask } from '../../../lib/supabase'

function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const TODAY = localISO()

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  if (dateStr === TODAY) return 'Today'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === localISO(tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Follow-up task list ──────────────────────────────────────────────────────
function FollowUpTasks({ meetingId }) {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMeetingTasks(meetingId)
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [meetingId])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newTask.trim()) return
    const saved = await addMeetingTask(meetingId, newTask.trim())
    setTasks(prev => [...prev, saved])
    setNewTask('')
  }

  async function toggleTask(task) {
    const updated = await updateMeetingTask(task.id, { completed: !task.completed })
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  async function handleDelete(id) {
    await deleteMeetingTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (loading) return <div className="h-8 flex items-center"><div className="w-3 h-3 border border-sand-300 border-t-transparent rounded-full animate-spin" /></div>

  const done = tasks.filter(t => t.completed).length

  return (
    <div className="mt-4 border-t border-sand-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-sand-400 uppercase tracking-widest">
          Follow-up Tasks {tasks.length > 0 && <span className="normal-case font-normal">({done}/{tasks.length})</span>}
        </p>
      </div>

      {tasks.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {tasks.map(task => (
            <li key={task.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleTask(task)}
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                  task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-sand-300 hover:border-blush-400'
                }`}
              >
                {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className={`text-sm flex-1 ${task.completed ? 'line-through text-sand-400' : 'text-sand-700'}`}>
                {task.text}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all p-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          placeholder="Add a follow-up task…"
          className="flex-1 text-xs bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newTask.trim()}
          className="text-xs bg-blush-500 hover:bg-blush-600 disabled:bg-sand-200 disabled:text-sand-400 text-white px-3 py-2 rounded-lg font-medium transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  )
}

// ─── Single meeting card ──────────────────────────────────────────────────────
function MeetingCard({ meeting, onDelete }) {
  const [expanded, setExpanded] = useState(meeting.date === TODAY)
  const [agenda, setAgenda] = useState(meeting.agenda || '')
  const [notes, setNotes] = useState(meeting.notes || '')
  const agendaTimer = useRef(null)
  const notesTimer = useRef(null)

  function handleAgendaChange(val) {
    setAgenda(val)
    clearTimeout(agendaTimer.current)
    agendaTimer.current = setTimeout(() => updateMeeting(meeting.id, { agenda: val }), 800)
  }

  function handleNotesChange(val) {
    setNotes(val)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => updateMeeting(meeting.id, { notes: val }), 800)
  }

  const isPast = meeting.date && meeting.date < TODAY

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      meeting.date === TODAY ? 'border-blush-300 shadow-sm' : 'border-sand-200'
    }`}>
      {/* Header */}
      <div
        className="flex items-start gap-3 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Date badge */}
        <div className={`shrink-0 w-10 text-center rounded-xl py-1.5 ${
          meeting.date === TODAY ? 'bg-blush-50 border border-blush-200' : isPast ? 'bg-sand-50' : 'bg-warm-50'
        }`}>
          {meeting.date ? (
            <>
              <p className="text-[8px] font-bold uppercase text-sand-400">
                {new Date(meeting.date + 'T12:00:00').toLocaleDateString('en-AU', { month: 'short' })}
              </p>
              <p className={`text-lg font-bold leading-tight ${meeting.date === TODAY ? 'text-blush-500' : 'text-sand-700'}`}>
                {new Date(meeting.date + 'T12:00:00').getDate()}
              </p>
            </>
          ) : (
            <p className="text-[10px] text-sand-400">–</p>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sand-900">{meeting.title}</h3>
            {meeting.date === TODAY && (
              <span className="text-[10px] bg-blush-100 text-blush-600 font-semibold px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {meeting.time && (
              <span className="flex items-center gap-1 text-xs text-sand-400">
                <Clock className="w-3 h-3" />{meeting.time}
              </span>
            )}
            {meeting.attendees && (
              <span className="flex items-center gap-1 text-xs text-sand-400">
                <Users className="w-3 h-3" />{meeting.attendees}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onDelete(meeting.id) }}
            className="text-sand-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-sand-300" /> : <ChevronDown className="w-4 h-4 text-sand-300" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-sand-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Agenda */}
            <div>
              <label className="block text-[11px] font-semibold text-sand-400 uppercase tracking-widest mb-1.5">
                Agenda
              </label>
              <textarea
                value={agenda}
                onChange={e => handleAgendaChange(e.target.value)}
                placeholder="What's on the agenda for this meeting?"
                rows={5}
                className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-sand-400 uppercase tracking-widest mb-1.5">
                Meeting Notes
              </label>
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Notes from the meeting…"
                rows={5}
                className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          <FollowUpTasks meetingId={meeting.id} />
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MeetingsPage({ workspace = 'stacey' }) {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('upcoming')
  const [form, setForm] = useState({ title: '', date: TODAY, time: '', attendees: '' })

  useEffect(() => {
    getMeetings(workspace)
      .then(setMeetings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [workspace])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      const saved = await addMeeting({
        title: form.title.trim(),
        date: form.date || null,
        time: form.time || null,
        attendees: form.attendees || null,
        agenda: '',
        notes: '',
        workspace,
      })
      setMeetings(prev => [saved, ...prev].sort((a, b) => (a.date || '').localeCompare(b.date || '')))
      setForm({ title: '', date: TODAY, time: '', attendees: '' })
      setShowForm(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    try { await deleteMeeting(id); setMeetings(prev => prev.filter(m => m.id !== id)) }
    catch (e) { setError(e.message) }
  }

  const upcoming = meetings.filter(m => !m.date || m.date >= TODAY)
  const past = meetings.filter(m => m.date && m.date < TODAY)
  const displayed = filter === 'upcoming' ? upcoming : past

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Meetings</h1>
          <p className="text-sand-400 text-sm mt-0.5">{upcoming.length} upcoming</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Meeting
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <h2 className="font-semibold text-sand-900 mb-4">Schedule a Meeting</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Meeting title…"
              autoFocus
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-sand-500 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 focus:ring-2 focus:ring-warm-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-sand-500 mb-1">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 focus:ring-2 focus:ring-warm-300 focus:outline-none"
                />
              </div>
            </div>
            <input
              value={form.attendees}
              onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}
              placeholder="Attendees (e.g. Shaniah, Coaches)…"
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-sand-500 hover:text-sand-700 px-3 py-2">Cancel</button>
              <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Create Meeting</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['upcoming', 'past'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-4 py-1.5 rounded-full border font-medium capitalize transition-colors ${
              filter === f ? 'bg-warm-500 border-warm-500 text-white' : 'border-sand-200 text-sand-600 hover:border-sand-400 bg-white'
            }`}
          >
            {f} {f === 'upcoming' ? `(${upcoming.length})` : `(${past.length})`}
          </button>
        ))}
      </div>

      {/* Meetings list */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">
            {filter === 'upcoming' ? 'No upcoming meetings — add one above' : 'No past meetings'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(m => (
            <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
