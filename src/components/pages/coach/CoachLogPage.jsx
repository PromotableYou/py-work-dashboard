import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle, CalendarDays } from 'lucide-react'
import { getSessionTypes, addCoachLog, getCoachLogs, getRosterBlocks } from '../../../lib/supabase'
import { coachBySlug } from '../../../lib/coaches'

const DAY_KEYS  = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_LABEL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' }

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
  const [rosterBlocks, setRosterBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const [weekOffset, setWeekOffset] = useState(0)
  const currentWeekStart = getWeekStart()
  const weekStart = addDays(currentWeekStart, weekOffset * 7)
  const weekISO = localISO(weekStart)
  const isCurrentWeek = weekOffset === 0

  const [hours, setHours] = useState('')
  const [selectedSessions, setSelectedSessions] = useState([])
  const [privateClients, setPrivateClients] = useState([{ client: '', duration: '' }])
  const [notes, setNotes] = useState('')
  const [prefilledFromRoster, setPrefilledFromRoster] = useState(false)

  // Initial load
  useEffect(() => {
    if (!displayName) { setLoading(false); return }
    Promise.all([getSessionTypes(), getCoachLogs(displayName)])
      .then(([st, logs]) => { setSessionTypes(st); setRecentLogs(logs) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [displayName])

  // When week changes — load roster for that week + pre-fill form
  useEffect(() => {
    if (!displayName) return
    const existingLog = recentLogs.find(l => l.date === weekISO)

    if (existingLog) {
      // Already submitted — fill from their saved log
      setHours(String(existingLog.hours || ''))
      setSelectedSessions(existingLog.sessions || [])
      setPrivateClients(existingLog.private_sessions?.length ? existingLog.private_sessions : [{ client: '', duration: '' }])
      setNotes(existingLog.notes || '')
      setPrefilledFromRoster(false)
      setRosterBlocks([])
      return
    }

    // No log yet — fetch the roster and pre-fill sessions
    setRosterLoading(true)
    getRosterBlocks(weekISO)
      .then(blocks => {
        const myBlocks = blocks.filter(b => b.coach_name === displayName)
        setRosterBlocks(myBlocks)
        if (myBlocks.length > 0) {
          // Unique session names from their roster
          const sessions = [...new Set(myBlocks.map(b => b.session_type).filter(Boolean))]
          setSelectedSessions(sessions)
          setPrefilledFromRoster(true)
        } else {
          setSelectedSessions([])
          setPrefilledFromRoster(false)
        }
        setHours('')
        setPrivateClients([{ client: '', duration: '' }])
        setNotes('')
      })
      .catch(() => {})
      .finally(() => setRosterLoading(false))
  }, [weekISO, recentLogs, displayName])

  function toggleSession(name) {
    setSelectedSessions(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hours || parseFloat(hours) <= 0) { setError('Please enter your total hours for this week'); return }
    setSubmitting(true)
    setError(null)
    try {
      const validClients = privateClients.filter(c => c.client.trim())
      await addCoachLog({
        coach_name: displayName,
        date: weekISO,
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

  // Group roster blocks by day for the preview
  const rosterByDay = DAY_KEYS.reduce((acc, d) => {
    acc[d] = rosterBlocks.filter(b => b.day === d)
    return acc
  }, {})
  const hasRoster = rosterBlocks.length > 0

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sand-50">
      <div className="w-5 h-5 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!displayName) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl mb-2">🤔</p>
        <p className="text-sand-500">This link doesn't exist.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Top bar */}
      <div className="bg-white border-b border-sand-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blush-400 flex items-center justify-center text-white font-bold text-sm">
            {displayName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sand-900 leading-none">{displayName}</p>
            <p className="text-xs text-sand-400 mt-0.5">Promotable You · Weekly Hours</p>
          </div>
        </div>

        {/* Week selector */}
        <div className="flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-xl px-3 py-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 rounded hover:bg-sand-200 text-sand-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[220px]">
            <p className="text-sm font-semibold text-sand-900">{formatWeek(weekStart)}</p>
            <p className="text-xs text-sand-400">
              {isCurrentWeek ? 'Current week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
              {alreadyLogged && <span className="text-emerald-500 font-medium"> · ✓ logged</span>}
            </p>
          </div>
          <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={isCurrentWeek} className="p-1 rounded hover:bg-sand-200 text-sand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-6">

            {/* Left column */}
            <div className="col-span-2 space-y-5">

              {/* Roster preview — only shown when pre-filling */}
              {rosterLoading && (
                <div className="bg-white border border-sand-200 rounded-2xl p-5 flex items-center gap-2 text-sand-400 text-sm">
                  <div className="w-4 h-4 border-2 border-sand-300 border-t-transparent rounded-full animate-spin" />
                  Loading your schedule…
                </div>
              )}

              {!rosterLoading && hasRoster && !alreadyLogged && (
                <div className="bg-white border border-sand-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-blush-400" />
                    <p className="text-sm font-semibold text-sand-800">Your roster this week</p>
                    <span className="text-xs bg-blush-50 text-blush-500 border border-blush-100 px-2 py-0.5 rounded-full font-medium ml-auto">Sessions pre-filled below</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {DAY_KEYS.map(day => (
                      <div key={day}>
                        <p className="text-xs font-semibold text-sand-400 uppercase tracking-wide mb-1.5">{DAY_LABEL[day]}</p>
                        <div className="space-y-1">
                          {rosterByDay[day].length === 0 ? (
                            <p className="text-xs text-sand-200">—</p>
                          ) : rosterByDay[day].map((b, i) => (
                            <div key={i} className="text-xs rounded-lg px-2 py-1.5 font-medium leading-snug" style={{ backgroundColor: sessionTypes.find(s => s.name === b.session_type)?.color || '#e5e7eb', color: '#1a1a1a' }}>
                              {b.session_type}
                              {b.time && <span className="block font-normal opacity-70">{b.time}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hours */}
              <div className="bg-white border border-sand-200 rounded-2xl p-5">
                <label className="block text-xs font-semibold text-sand-400 uppercase tracking-wide mb-3">Total hours this week</label>
                <div className="flex items-baseline gap-3">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="80"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-36 text-2xl font-bold text-sand-900 bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 placeholder-sand-300 focus:border-blush-400 focus:outline-none focus:ring-2 focus:ring-blush-100 transition-colors text-center"
                  />
                  <p className="text-sm text-sand-400">hours worked across the week</p>
                </div>
              </div>

              {/* Sessions */}
              {sessionTypes.length > 0 && (
                <div className="bg-white border border-sand-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Sessions run this week</label>
                    {prefilledFromRoster && !alreadyLogged && (
                      <span className="text-xs text-blush-500 font-medium ml-auto">Pre-filled from roster — edit as needed</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sessionTypes.map(st => {
                      const selected = selectedSessions.includes(st.name)
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => toggleSession(st.name)}
                          className={`text-sm px-3 py-2 rounded-xl font-medium border transition-all ${
                            selected ? 'text-white border-transparent shadow-sm' : 'bg-white text-sand-500 border-sand-200 hover:border-sand-400'
                          }`}
                          style={selected ? { backgroundColor: st.color || '#e5a0a0', borderColor: st.color || '#e5a0a0' } : {}}
                        >
                          {selected && '✓ '}{st.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-white border border-sand-200 rounded-2xl p-5">
                <label className="block text-xs font-semibold text-sand-400 uppercase tracking-wide mb-3">Notes for Stacey <span className="font-normal normal-case">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anything else Stacey should know…"
                  rows={3}
                  className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">

              {/* Private 1:1s */}
              <div className="bg-white border border-sand-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Private 1:1s</label>
                  <button
                    type="button"
                    onClick={() => setPrivateClients(p => [...p, { client: '', duration: '' }])}
                    className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {privateClients.map((pc, idx) => (
                    <div key={idx} className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={pc.client}
                        onChange={e => setPrivateClients(p => p.map((c, i) => i === idx ? { ...c, client: e.target.value } : c))}
                        placeholder="Client name"
                        className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-2.5 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none min-w-0"
                      />
                      <input
                        type="text"
                        value={pc.duration}
                        onChange={e => setPrivateClients(p => p.map((c, i) => i === idx ? { ...c, duration: e.target.value } : c))}
                        placeholder="1hr"
                        className="w-14 text-sm bg-sand-50 border border-sand-200 rounded-lg px-2 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
                      />
                      {privateClients.length > 1 && (
                        <button type="button" onClick={() => setPrivateClients(p => p.filter((_, i) => i !== idx))} className="text-sand-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-sand-300 mt-2">Leave blank if none this week</p>
              </div>

              {/* Submit */}
              <div className="space-y-3">
                {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>}
                {submitted && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" /> Logged — thanks!
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blush-500 hover:bg-blush-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {submitting ? 'Saving…' : alreadyLogged ? 'Update This Week' : 'Submit Week'}
                </button>
              </div>

              {/* Past submissions */}
              {recentLogs.length > 0 && (
                <div className="bg-white border border-sand-200 rounded-2xl p-5">
                  <p className="text-xs font-semibold text-sand-400 uppercase tracking-wide mb-3">Past submissions</p>
                  <div className="space-y-2">
                    {recentLogs.slice(0, 6).map(log => (
                      <div key={log.id} className="flex items-start justify-between gap-2 py-2 border-b border-sand-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-sand-700">
                            w/c {new Date(log.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                          {log.sessions?.length > 0 && (
                            <p className="text-xs text-sand-400 truncate">{log.sessions.join(', ')}</p>
                          )}
                          {log.private_sessions?.some(p => p.client) && (
                            <p className="text-xs text-sand-400">
                              1:1: {log.private_sessions.filter(p => p.client).map(p => p.client).join(', ')}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-blush-500 shrink-0">{log.hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
