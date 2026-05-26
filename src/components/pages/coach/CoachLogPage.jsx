import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Trash2, Send, CheckCircle } from 'lucide-react'
import { getSessionTypes, addCoachLog, getCoachLogs } from '../../../lib/supabase'
import { coachBySlug } from '../../../lib/coaches'

function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

  // Form state
  const [date, setDate] = useState(localISO())
  const [hours, setHours] = useState('')
  const [selectedSessions, setSelectedSessions] = useState([])
  const [privateClients, setPrivateClients] = useState([{ client: '', duration: '' }])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!displayName) { setLoading(false); return }
    Promise.all([getSessionTypes(), getCoachLogs(displayName)])
      .then(([st, logs]) => {
        setSessionTypes(st)
        setRecentLogs(logs)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [displayName])

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
      setError('Please enter hours worked')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const validClients = privateClients.filter(c => c.client.trim())
      await addCoachLog({
        coach_name: displayName,
        date,
        hours: parseFloat(hours),
        sessions: selectedSessions,
        private_sessions: validClients,
        notes: notes.trim(),
      })
      setSubmitted(true)
      // Reset form
      setDate(localISO())
      setHours('')
      setSelectedSessions([])
      setPrivateClients([{ client: '', duration: '' }])
      setNotes('')
      // Refresh recent logs
      const logs = await getCoachLogs(displayName)
      setRecentLogs(logs)
      setTimeout(() => setSubmitted(false), 4000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!displayName) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-2xl mb-2">🤔</p>
        <h1 className="text-lg font-bold text-sand-900 mb-1">Page not found</h1>
        <p className="text-sm text-sand-400">This coach log link doesn't exist.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5 pb-12">

        {/* Header */}
        <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl px-6 py-6 text-white">
          <p className="text-sm font-medium opacity-80">Promotable You · Coach Hours</p>
          <h1 className="text-2xl font-bold mt-0.5">{displayName} 👋</h1>
          <p className="text-sm opacity-70 mt-1">Log your sessions and hours for Stacey</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Date + Hours */}
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-sand-500 uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 focus:ring-2 focus:ring-blush-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sand-500 uppercase tracking-wide mb-1.5">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sessions run */}
          {sessionTypes.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl p-5">
              <label className="block text-xs font-semibold text-sand-500 uppercase tracking-wide mb-3">Sessions Run Today</label>
              <div className="flex flex-wrap gap-2">
                {sessionTypes.map(st => {
                  const selected = selectedSessions.includes(st.name)
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleSession(st.name)}
                      className={`text-sm px-3 py-1.5 rounded-full font-medium border transition-all ${
                        selected
                          ? 'text-white border-transparent shadow-sm scale-105'
                          : 'bg-white text-sand-600 border-sand-200 hover:border-sand-400'
                      }`}
                      style={selected ? { backgroundColor: st.color || '#e5a0a0', borderColor: st.color || '#e5a0a0' } : {}}
                    >
                      {st.name}
                    </button>
                  )
                })}
              </div>
              {selectedSessions.length > 0 && (
                <p className="text-xs text-sand-400 mt-2.5">{selectedSessions.length} session{selectedSessions.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Private 1:1s */}
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-xs font-semibold text-sand-500 uppercase tracking-wide">Private 1:1s</label>
                <p className="text-xs text-sand-400 mt-0.5">Leave blank if none today</p>
              </div>
              <button
                type="button"
                onClick={addPrivateClient}
                className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1 bg-blush-50 px-2.5 py-1.5 rounded-lg"
              >
                <Plus className="w-3 h-3" /> Add client
              </button>
            </div>
            <div className="space-y-2">
              {privateClients.map((pc, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={pc.client}
                    onChange={e => updatePrivateClient(idx, 'client', e.target.value)}
                    placeholder="Client name"
                    className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={pc.duration}
                    onChange={e => updatePrivateClient(idx, 'duration', e.target.value)}
                    placeholder="Duration"
                    className="w-24 text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-300 focus:outline-none"
                  />
                  {privateClients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrivateClient(idx)}
                      className="text-sand-300 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <label className="block text-xs font-semibold text-sand-500 uppercase tracking-wide mb-1.5">Notes <span className="font-normal normal-case">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any extra info, issues, or comments for Stacey…"
              rows={3}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-300 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          {submitted && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" /> Logged successfully — thanks!
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blush-500 hover:bg-blush-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-base"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Saving…' : 'Submit Log'}
          </button>
        </form>

        {/* Recent submissions */}
        {recentLogs.length > 0 && (
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <h2 className="font-semibold text-sand-900 mb-3">Your Recent Submissions</h2>
            <div className="space-y-3">
              {recentLogs.slice(0, 8).map(log => (
                <div key={log.id} className="border border-sand-100 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-sand-800">
                      {new Date(log.date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-sm font-bold text-blush-500">{log.hours}h</span>
                  </div>
                  {log.sessions?.length > 0 && (
                    <p className="text-xs text-sand-500 mb-1">
                      <span className="font-medium">Sessions:</span> {log.sessions.join(', ')}
                    </p>
                  )}
                  {log.private_sessions?.length > 0 && log.private_sessions.some(p => p.client) && (
                    <p className="text-xs text-sand-500 mb-1">
                      <span className="font-medium">1:1s:</span>{' '}
                      {log.private_sessions.filter(p => p.client).map(p =>
                        `${p.client}${p.duration ? ` (${p.duration})` : ''}`
                      ).join(', ')}
                    </p>
                  )}
                  {log.notes && (
                    <p className="text-xs text-sand-400 mt-1 italic">"{log.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
