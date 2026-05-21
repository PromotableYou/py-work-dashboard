import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, AlertCircle } from 'lucide-react'
import { getTimesheet, addTimeEntry, deleteTimeEntry } from '../../lib/supabase'

const TODAY = new Date().toISOString().slice(0, 10)

function formatHours(h) {
  if (h === 0) return '0h'
  const hours = Math.floor(h)
  const mins = Math.round((h - hours) * 60)
  if (mins === 0) return `${hours}h`
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

export default function TimesheetPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ project: '', description: '', hours: '', date: TODAY })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    getTimesheet()
      .then(setEntries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.project.trim() || !form.hours) return
    try {
      const saved = await addTimeEntry({
        project: form.project.trim(),
        description: form.description.trim(),
        hours: parseFloat(form.hours),
        date: form.date,
      })
      setEntries(prev => [saved, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setForm({ project: '', description: '', hours: '', date: TODAY })
      setShowForm(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deleteTimeEntry(id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) { setError(e.message) }
  }

  // Stats
  const todayEntries = entries.filter(e => e.date === TODAY)
  const todayHours = todayEntries.reduce((s, e) => s + e.hours, 0)

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const weekEntries = entries.filter(e => e.date >= weekStartStr)
  const weekHours = weekEntries.reduce((s, e) => s + e.hours, 0)

  // By project this week
  const byProject = weekEntries.reduce((acc, e) => {
    acc[e.project] = (acc[e.project] || 0) + e.hours
    return acc
  }, {})

  // Group entries by date
  const grouped = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = []
    acc[e.date].push(e)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Timesheet</h1>
          <p className="text-sand-400 text-sm mt-0.5">Log your hours</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Log Time
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-sand-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-sand-900">{formatHours(todayHours)}</p>
          <p className="text-xs text-sand-400 mt-1">Today</p>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-sand-900">{formatHours(weekHours)}</p>
          <p className="text-xs text-sand-400 mt-1">This week</p>
        </div>
        <div className="bg-white border border-sand-200 rounded-xl p-4 sm:col-span-2">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-wide mb-2">This week by project</p>
          {Object.keys(byProject).length === 0 ? (
            <p className="text-xs text-sand-400">Nothing logged yet</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(byProject)
                .sort((a, b) => b[1] - a[1])
                .map(([project, hours]) => (
                  <div key={project} className="flex items-center justify-between">
                    <span className="text-xs text-sand-700 truncate">{project}</span>
                    <span className="text-xs font-semibold text-warm-600 ml-2 shrink-0">{formatHours(hours)}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <h2 className="font-semibold text-sand-900 mb-3">Log time</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.project}
                onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                placeholder="Project name…"
                list="projects-list"
                className="text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300"
              />
              <datalist id="projects-list">
                {[...new Set(entries.map(e => e.project))].map(p => <option key={p} value={p} />)}
              </datalist>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What did you work on?…"
                className="text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                placeholder="Hours (e.g. 1.5)…"
                step="0.25"
                min="0.25"
                className="text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300"
              />
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 focus:ring-2 focus:ring-warm-300"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-sand-500 hover:text-sand-700 px-3 py-2">Cancel</button>
              <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Save Entry</button>
            </div>
          </form>
        </div>
      )}

      {/* Entries grouped by date */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">No time logged yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dayEntries]) => {
            const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0)
            const d = new Date(date + 'T00:00:00')
            const isToday_ = date === TODAY
            return (
              <div key={date} className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-sand-50 border-b border-sand-100">
                  <p className="text-sm font-semibold text-sand-700">
                    {isToday_ ? 'Today' : d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-sm font-bold text-warm-600">{formatHours(dayTotal)}</p>
                </div>
                <div className="divide-y divide-sand-50">
                  {dayEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between px-5 py-3 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-sand-900">{entry.project}</p>
                        {entry.description && <p className="text-xs text-sand-400 mt-0.5">{entry.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 ml-3 shrink-0">
                        <span className="text-sm font-semibold text-sand-700">{formatHours(entry.hours)}</span>
                        <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
