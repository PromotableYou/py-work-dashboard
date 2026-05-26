import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle } from 'lucide-react'
import { getSessionTypes, addCoachLog, getCoachLogs } from '../../../lib/supabase'
import { coachBySlug } from '../../../lib/coaches'

// Monday of any given week
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

function localISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWeek(monday) {
  const friday = addDays(monday, 4)
  const opts = { day: 'numeric', month: 'short' }
  return `${monday.toLocaleDateString('en-AU', opts)} – ${friday.toLocaleDateString('en-AU', { ...opts, year: 'numeric' })}`
}

export default function CoachLogPage() {
  const { coachName } = useParams()
  const coach = coachBySlug(coachName || '')
  const displayName = coach?.name || null

  const [sessionTypes, setSessionTypes] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  // Week navigation — default to current week
  const [weekOffset, setWeekOffset] = useState(0)
  const currentWeekStart = getWeekStart()
  const weekStart = addDays(currentWeekStart, weekOffset * 7)
  const weekISO = localISO(weekStart)
  const isCurrentWeek = weekOffset === 0

  // Form state
  const [hours, setHours] = useState('')
  const [selectedSessions, setSelectedSessions] = useState([])
  const [privateClients, setPrivateClients] = useState([{ client: '', duration: '' }])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!displayName) { setLoading(false); return }
    Promise.all([getSessionTypes(), getCoachLogs(displayName)])
      .then(([st, logs]) => { setSessionTypes(st); setRecentLogs(logs) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [displayName])

  // Reset form when week changes
  useEffect(() => {
    const existing = recentLogs.find(l => l.date === weekISO)
    if (existing) {
      setHours(String(existing.hours || ''))
      setSelectedSessions(existing.sessions || [])
      setPrivateClients(
        existing.private_sessions?.length
          ? existing.private_sessions
          : [{ client: '', duration: '' }]
      )
      setNotes(existing.notes || '')
    } else {
      setHours('')
      setSelectedSessions([])
      setPrivateClients([{ client: '', duration: '' }])
      setNotes('')
    }
  }, [weekISO, recentLogs])

  function toggleSession(name) {
    setSelectedSessions(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  function addPrivateClient() {
    setPrivateClients(prev => [...prev, { client: '', duration: '' }])
  }

  function updatePrivateClient(idx, field, val) {
    setPrivateClients(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c))
  }

  function removePrivateClient(idx) {
    setPrivateClients(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hours || parseFloat(hours) <= 0) {
      setError('Please enter your hours for this week')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const validClients = privateClients.filter(c => c.client.trim())
      await addCoachLog({
        coach_name: displayName,
        date: weekISO,          // stores the Monday as the week identifier
        hours: parseFloat(hours),
        sessions: selectedSessions,
        private_sessions: validClients,
        notes: notes.trim(),
      })
      setSubmitted(true)
      const logs = await getCoachLogs(displayName)
      setRecentLogs(logs)
      setTimeout(() => setSubmitted(false), 4000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyLogged = recentLogs.some(l => l.date === weekISO)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sand-50">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!displayName) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-3xl mb-3">🤔</p>
        <h1 className="text-lg font-bold text-sand-900 mb-1">Page not found</h1>
        <p className="text-sm text-sand-400">This coach log link doesn't exist.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blush-500 to-warm-500 px-6 pt-10 pb-8 text-white">
        <p className="text-sm font-medium opacity-80 mb-1">Promotable You</p>
        <h1 className="text-3xl font-bold">{displayName} 👋</h1>
        <p className="text-sm opacity-70 mt-1">Log your hours for Stacey</p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-16 space-y-4">

        {/* Week picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-sand-100 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-sand-100 text-sand-400 hover:text-sand-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold text-sand-400 uppercase tracking-wide mb-0.5">
              {isCurrentWeek ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
            </p>
            <p className="text-sm font-bold text-sand-900">{formatWeek(weekStart)}</p>
            {alreadyLogged && (
              <p className="text-xs text-emerald-500 font-medium mt-0.5">✓ Already logged</p>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={isCurrentWeek}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-sand-100 text-sand-400 hover:text-sand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Hours */}
          <div className="bg-white rounded-2xl shadow-sm border border-sand-100 p-5">
            <label className="block text-xs font-bold text-sand-400 uppercase tracking-widest mb-3">
              Total hours this week
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="80"
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="e.g. 12"
              className="w-full text-3xl font-bold text-sand-900 bg-sand-50 border-2 border-sand-200 rounded-xl px-4 py-4 placeholder-sand-300 focus:border-blush-400 focus:outline-none transition-colors text-center"
            />
          </div>

          {/* Sessions */}
          {sessionTypes.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-sand-100 p-5">
              <label className="block text-xs font-bold text-sand-400 uppercase tracking-widest mb-3">
                Sessions you ran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {sessionTypes.map(st => {
                  const selected = selectedSessions.includes(st.name)
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleSession(st.name)}
                      className={`text-sm px-3 py-3 rounded-xl font-medium border-2 transition-all text-left leading-snug ${
                        selected
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-sand-50 text-sand-600 border-sand-100 hover:border-sand-300'
                      }`}
                      style={selected ? { backgroundColor: st.color || '#e5a0a0', borderColor: st.color || '#e5a0a0' } : {}}
                    >
                      {selected && <span className="mr-1">✓ </span>}{st.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Private 1:1s */}
          <div className="bg-white rounded-2xl shadow-sm border border-sand-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-sand-400 uppercase tracking-widest">
                Private 1:1s
              </label>
              <button
                type="button"
                onClick={addPrivateClient}
                className="flex items-center gap-1 text-sm text-blush-500 font-semibold"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            <div className="space-y-2.5">
              {privateClients.map((pc, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={pc.client}
                    onChange={e => updatePrivateClient(idx, 'client', e.target.value)}
                    placeholder="Client name"
                    className="flex-1 text-sm bg-sand-50 border-2 border-sand-100 rounded-xl px-3 py-3 text-sand-800 placeholder-sand-300 focus:border-blush-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={pc.duration}
                    onChange={e => updatePrivateClient(idx, 'duration', e.target.value)}
                    placeholder="e.g. 1hr"
                    className="w-20 text-sm bg-sand-50 border-2 border-sand-100 rounded-xl px-3 py-3 text-sand-800 placeholder-sand-300 focus:border-blush-300 focus:outline-none"
                  />
                  {privateClients.length > 1 && (
                    <button type="button" onClick={() => removePrivateClient(idx)} className="text-sand-300 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-sand-300 mt-2.5">Leave blank if no private sessions this week</p>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-sand-100 p-5">
            <label className="block text-xs font-bold text-sand-400 uppercase tracking-widest mb-3">
              Notes for Stacey <span className="font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything else Stacey should know…"
              rows={3}
              className="w-full text-sm bg-sand-50 border-2 border-sand-100 rounded-xl px-3 py-3 text-sand-800 placeholder-sand-300 focus:border-blush-300 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {submitted && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-medium">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>Logged! Thanks {displayName} 🙌</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blush-500 hover:bg-blush-600 active:bg-blush-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors text-lg shadow-sm"
          >
            {submitting ? 'Saving…' : alreadyLogged ? 'Update This Week' : 'Submit Week'}
          </button>
        </form>

        {/* Recent submissions */}
        {recentLogs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-sand-100 p-5">
            <h2 className="font-bold text-sand-900 mb-3">Past submissions</h2>
            <div className="space-y-2.5">
              {recentLogs.slice(0, 6).map(log => {
                const mon = new Date(log.date + 'T12:00:00')
                const fri = addDays(mon, 4)
                return (
                  <div key={log.id} className="flex items-start gap-3 bg-sand-50 rounded-xl px-3 py-3">
                    <div className="shrink-0 text-center min-w-[52px]">
                      <p className="text-[10px] font-bold text-sand-400 uppercase">w/c</p>
                      <p className="text-xs font-bold text-sand-700">{mon.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-blush-500">{log.hours}h</span>
                        {log.sessions?.length > 0 && (
                          <span className="text-xs text-sand-500 truncate">{log.sessions.join(', ')}</span>
                        )}
                      </div>
                      {log.private_sessions?.some(p => p.client) && (
                        <p className="text-xs text-sand-400">
                          1:1: {log.private_sessions.filter(p => p.client).map(p =>
                            `${p.client}${p.duration ? ` (${p.duration})` : ''}`
                          ).join(', ')}
                        </p>
                      )}
                      {log.notes && <p className="text-xs text-sand-400 italic mt-0.5">"{log.notes}"</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
