import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Users, ChevronLeft, ChevronRight, AlertCircle, Download, Link, Clock, ClipboardCheck, CheckCircle, XCircle } from 'lucide-react'
import { getTeamMembers, addTeamMember, deleteTeamMember, getTeamHours, upsertTeamHourRow, getAllCoachLogs, deleteCoachLog, approveCoachLog, unapproveCoachLog } from '../../../lib/supabase'
import { COACHES } from '../../../lib/coaches'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getPayPeriodStart(date = new Date(), anchor = new Date('2025-01-06')) {
  const diff = Math.floor((date - anchor) / (1000 * 60 * 60 * 24 * 14))
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + diff * 14)
  return start
}

function getFortnightDays(start) {
  const days = []
  let current = new Date(start)
  while (days.length < 10) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(current))
    current = addDays(current, 1)
  }
  return days
}

const MEMBER_COLORS = [
  '#e5a0a0', '#f5c27a', '#a0c4e5', '#a0e5b0', '#c4a0e5',
  '#e5c4a0', '#a0e5e5', '#e5a0c4', '#b0d4a0', '#d4a0d4',
]

const LEAVE_TYPES = ['Normal', 'Annual Leave', 'Sick Leave', 'Public Holiday', 'RDO', 'Unpaid']

const LEAVE_STYLE = {
  'Annual Leave':   'bg-blue-100 text-blue-600 border-blue-200',
  'Sick Leave':     'bg-amber-100 text-amber-600 border-amber-200',
  'Public Holiday': 'bg-purple-100 text-purple-600 border-purple-200',
  'RDO':            'bg-emerald-100 text-emerald-600 border-emerald-200',
  'Unpaid':         'bg-sand-100 text-sand-500 border-sand-200',
}

const TODAY = localISO()

// ─── Hour input cell ──────────────────────────────────────────────────────────
function HourCell({ memberName, dateISO, value, leaveType, onChange }) {
  const [localVal, setLocalVal] = useState(value === 0 ? '' : String(value))
  const [showType, setShowType] = useState(false)
  const isToday = dateISO === TODAY
  const isLeave = leaveType && leaveType !== 'Normal'

  useEffect(() => {
    setLocalVal(value === 0 ? '' : String(value))
  }, [value, dateISO])

  function handleChange(e) {
    const raw = e.target.value
    if (raw === '' || /^\d*\.?\d?$/.test(raw)) setLocalVal(raw)
  }

  function handleBlur() {
    const num = parseFloat(localVal) || 0
    setLocalVal(num === 0 ? '' : String(num))
    if (num !== value) onChange(memberName, dateISO, { hours: num, worked: num > 0, type: leaveType || 'Normal' })
  }

  function handleTypeChange(type) {
    setShowType(false)
    // If marking as leave, default to 7.6h if currently 0
    const hrs = value > 0 ? value : (type !== 'Normal' ? 7.6 : 0)
    setLocalVal(hrs === 0 ? '' : String(hrs))
    onChange(memberName, dateISO, { hours: hrs, worked: hrs > 0 || type !== 'Normal', type })
  }

  return (
    <td className={`px-1 py-1.5 text-center relative ${isToday ? 'bg-blush-50' : ''}`}>
      <div className="flex flex-col items-center gap-0.5">
        <input
          type="text"
          inputMode="decimal"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          placeholder="–"
          className={`w-11 text-center text-sm rounded-lg border py-1 focus:outline-none focus:ring-2 focus:ring-blush-300 transition-colors ${
            isLeave
              ? `${LEAVE_STYLE[leaveType]} font-semibold`
              : parseFloat(localVal) > 0
              ? 'bg-blush-50 border-blush-200 text-blush-700 font-semibold'
              : 'bg-white border-sand-200 text-sand-300 placeholder-sand-200'
          } ${isToday ? 'ring-1 ring-warm-300' : ''}`}
        />
        {/* Leave type badge — click to change */}
        <button
          onClick={() => setShowType(s => !s)}
          className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full border leading-tight transition-colors ${
            isLeave ? LEAVE_STYLE[leaveType] : 'text-sand-300 border-sand-100 hover:border-sand-300 hover:text-sand-500'
          }`}
        >
          {isLeave ? leaveType.split(' ')[0] : 'type'}
        </button>
      </div>

      {/* Type dropdown */}
      {showType && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-sand-200 rounded-xl shadow-lg py-1 min-w-[120px]">
          {LEAVE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`w-full text-left text-xs px-3 py-1.5 hover:bg-sand-50 transition-colors ${(leaveType || 'Normal') === t ? 'text-blush-600 font-semibold' : 'text-sand-700'}`}
            >
              {t}
            </button>
          ))}
          {(value > 0 || isLeave) && (
            <>
              <div className="border-t border-sand-100 my-1" />
              <button
                onClick={() => { setShowType(false); setLocalVal(''); onChange(memberName, dateISO, { hours: 0, worked: false, type: 'Normal' }) }}
                className="w-full text-left text-xs px-3 py-1.5 text-red-400 hover:bg-red-50"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </td>
  )
}

// ─── Coach Logs Tab ───────────────────────────────────────────────────────────
function CoachLogsTab({ periodStart, periodEnd, periodOffset, setPeriodOffset, onApproved }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [expandedCoach, setExpandedCoach] = useState(null)
  const [approveError, setApproveError] = useState(null)

  useEffect(() => {
    getAllCoachLogs()
      .then(l => {
        setLogs(l)
        // If there are unapproved logs outside the current period, auto-jump to
        // the period containing the most recent one
        const anchor = new Date('2025-01-06')
        const now    = new Date()
        const currentDiff = Math.floor((now - anchor) / (1000 * 60 * 60 * 24 * 14))
        const pending = l.filter(log => !log.approved)
        if (pending.length > 0) {
          const latestDate = pending.reduce((max, log) => log.date > max ? log.date : max, pending[0].date)
          const target = new Date(latestDate + 'T12:00:00')
          const targetDiff = Math.floor((target - anchor) / (1000 * 60 * 60 * 24 * 14))
          const offset = targetDiff - currentDiff
          if (offset !== 0) setPeriodOffset(offset)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const periodStartISO = localISO(periodStart)
  const periodEndISO = localISO(periodEnd)

  // Filter logs to current pay period
  const periodLogs = logs.filter(l => l.date >= periodStartISO && l.date <= periodEndISO)

  // Unapproved logs sitting outside the currently-viewed period
  const stalePending = logs.filter(l => !l.approved && (l.date < periodStartISO || l.date > periodEndISO))

  function copyLink(slug, aliases) {
    const linkSlug = (aliases && aliases.length > 0) ? aliases[0] : slug
    const url = `${window.location.origin}/log/${linkSlug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(slug)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  async function handleDeleteLog(id) {
    if (!window.confirm('Delete this log entry?')) return
    await deleteCoachLog(id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  async function handleApprove(log, coachName) {
    try {
      setApproveError(null)
      await approveCoachLog(log.id, {
        person_name: coachName,
        date: log.date,
        hours: log.hours,
        coaching_hours: log.coaching_hours,
        admin_hours: log.admin_hours,
      })
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, approved: true } : l))
      onApproved?.()  // refresh team members + hours in parent
    } catch (e) {
      setApproveError(e.message)
    }
  }

  async function handleUnapprove(log, coachName) {
    try {
      setApproveError(null)
      await unapproveCoachLog(log.id, { person_name: coachName, date: log.date })
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, approved: false } : l))
    } catch (e) {
      setApproveError(e.message)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-5 h-5 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5">
      {approveError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" /> {approveError}
        </div>
      )}

      {/* Stale pending banner — logs outside the currently-viewed period */}
      {stalePending.length > 0 && (() => {
        const byCoach = {}
        stalePending.forEach(l => {
          const name = l.coach_name || 'Unknown'
          if (!byCoach[name]) byCoach[name] = []
          byCoach[name].push(l)
        })
        const earliestDate = stalePending.reduce((min, l) => l.date < min ? l.date : min, stalePending[0].date)
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1.5">
                  {stalePending.length} unapproved log{stalePending.length !== 1 ? 's' : ''} from a previous pay period
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(byCoach).map(([name, coachLogs]) => (
                    <span key={name} className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {name} · {coachLogs.length} log{coachLogs.length !== 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-500 mt-1.5">
                  Earliest: {new Date(earliestDate + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => {
                  const anchor = new Date('2025-01-06')
                  const target = new Date(earliestDate + 'T12:00:00')
                  const diff        = Math.floor((target - anchor) / (1000 * 60 * 60 * 24 * 14))
                  const currentDiff = Math.floor((new Date() - anchor) / (1000 * 60 * 60 * 24 * 14))
                  setPeriodOffset(diff - currentDiff)
                }}
                className="shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Go to period
              </button>
            </div>
          </div>
        )
      })()}

      {/* Pay period navigator */}
      <div className="bg-white border border-sand-200 rounded-2xl px-5 py-3 flex items-center justify-between">
        <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-sand-100 text-sand-400 hover:text-sand-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-sand-800">
            {periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-sand-400">
            {periodOffset === 0 ? 'Current pay period' : periodOffset === -1 ? 'Previous pay period' : `${Math.abs(periodOffset)} periods ago`}
          </p>
        </div>
        <button onClick={() => setPeriodOffset(o => Math.min(o + 1, 0))} disabled={periodOffset === 0} className="p-1.5 rounded-lg hover:bg-sand-100 text-sand-400 hover:text-sand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {COACHES.map(coach => {
            const coachPeriodLogs = periodLogs.filter(l => l.coach_name === coach.name)
            const totalCoachingHours = coachPeriodLogs.reduce((s, l) => s + (parseFloat(l.coaching_hours) || 0), 0)
            const totalAdminHours    = coachPeriodLogs.reduce((s, l) => s + (parseFloat(l.admin_hours)    || 0), 0)
            const totalHours = totalCoachingHours + totalAdminHours || coachPeriodLogs.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0)
            // sessions may be strings (old) or objects {name,...} (new)
          const allSessions = [...new Set(coachPeriodLogs.flatMap(l =>
            (l.sessions || []).map(s => (typeof s === 'string' ? s : s.name))
          ))]
            const allClients = coachPeriodLogs.flatMap(l => (l.private_sessions || []).filter(p => p.client))
            const isExpanded = expandedCoach === coach.slug

            return (
              <div key={coach.slug} className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
                {/* Coach header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-sand-50 transition-colors"
                  onClick={() => setExpandedCoach(isExpanded ? null : coach.slug)}
                >
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white bg-blush-400">
                    {coach.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sand-900">{coach.name}</p>
                    <p className="text-xs text-sand-400">
                      {coach.email}
                      {coachPeriodLogs.length > 0 && ` · ${coachPeriodLogs.length} log${coachPeriodLogs.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {totalHours > 0 && (
                    <div className="flex items-center gap-3 mr-2">
                      {totalCoachingHours > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-blush-400 uppercase tracking-wide leading-none">Coaching</p>
                          <p className="text-base font-bold text-blush-500">{totalCoachingHours.toFixed(1)}<span className="text-xs font-normal text-sand-400 ml-0.5">h</span></p>
                        </div>
                      )}
                      {totalAdminHours > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-wide leading-none">Admin</p>
                          <p className="text-base font-bold text-sand-600">{totalAdminHours.toFixed(1)}<span className="text-xs font-normal text-sand-400 ml-0.5">h</span></p>
                        </div>
                      )}
                      {(totalCoachingHours > 0 || totalAdminHours > 0) && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-wide leading-none">Total</p>
                          <p className="text-base font-bold text-sand-800">{totalHours.toFixed(1)}<span className="text-xs font-normal text-sand-400 ml-0.5">h</span></p>
                        </div>
                      )}
                      {!totalCoachingHours && !totalAdminHours && (
                        <span className="text-lg font-bold text-blush-500">{totalHours.toFixed(1)}<span className="text-xs font-normal text-sand-400 ml-0.5">h</span></span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); copyLink(coach.slug, coach.aliases) }}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      copiedId === coach.slug
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-white border-sand-200 text-sand-600 hover:border-blush-300 hover:text-blush-500'
                    }`}
                  >
                    <Link className="w-3 h-3" />
                    {copiedId === coach.slug ? 'Copied!' : 'Copy link'}
                  </button>
                </div>

                {/* Expanded log entries */}
                {isExpanded && (
                  <div className="border-t border-sand-100 px-5 pb-4">
                    {coachPeriodLogs.length === 0 ? (
                      <p className="text-sm text-sand-400 text-center py-6">No submissions this pay period</p>
                    ) : (
                      <div className="space-y-3 pt-4">
                        {/* Summary chips */}
                        {allSessions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide mb-2">Sessions run this period</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allSessions.map(s => (
                                <span key={s} className="text-xs bg-blush-50 text-blush-600 border border-blush-100 px-2.5 py-1 rounded-full font-medium">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {allClients.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide mb-2">Private 1:1 clients</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allClients.map((c, i) => (
                                <span key={i} className="text-xs bg-warm-50 text-warm-700 border border-warm-100 px-2.5 py-1 rounded-full font-medium">
                                  {c.client}{c.duration ? ` · ${c.duration}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Individual log entries */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide">Log entries</p>
                            {coachPeriodLogs.some(l => !l.approved) && (
                              <button
                                onClick={async () => {
                                  for (const log of coachPeriodLogs.filter(l => !l.approved)) {
                                    await handleApprove(log, coach.name)
                                  }
                                }}
                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> Approve all
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {coachPeriodLogs.map(log => (
                              <div key={log.id} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border ${log.approved ? 'bg-emerald-50 border-emerald-100' : 'bg-sand-50 border-sand-100'}`}>
                                <div className="text-center shrink-0 min-w-[48px]">
                                  <p className="text-[10px] font-semibold text-sand-500 uppercase">
                                    {new Date(log.date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short' })}
                                  </p>
                                  <p className="text-xs font-bold text-sand-800">
                                    {new Date(log.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                  </p>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    {log.coaching_hours > 0 && (
                                      <span className="text-sm font-bold text-blush-500">{log.coaching_hours}h coaching</span>
                                    )}
                                    {log.admin_hours > 0 && (
                                      <span className="text-sm font-bold text-sand-500">{log.admin_hours}h admin</span>
                                    )}
                                    {!log.coaching_hours && !log.admin_hours && log.hours > 0 && (
                                      <span className="text-sm font-bold text-blush-500">{log.hours}h</span>
                                    )}
                                    {log.approved && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">✓ approved</span>}
                                    {log.sessions?.length > 0 && (
                                      <span className="text-xs text-sand-500 truncate">
                                        {log.sessions.map(s => typeof s === 'string' ? s : s.name).join(', ')}</span>
                                    )}
                                  </div>
                                  {log.private_sessions?.some(p => p.client) && (
                                    <p className="text-xs text-sand-500 mt-0.5">
                                      1:1: {log.private_sessions.filter(p => p.client).map(p => `${p.client}${p.duration ? ` (${p.duration})` : ''}`).join(', ')}
                                    </p>
                                  )}
                                  {log.admin_sessions?.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {log.admin_sessions.map((t, i) => (
                                        <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                                          📋 {t.task}{t.duration ? ` · ${t.duration}h` : ''}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {!log.admin_sessions?.length && log.notes && (
                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 mt-1">
                                      📝 {log.notes}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {log.approved ? (
                                    <button
                                      onClick={() => handleUnapprove(log, coach.name)}
                                      title="Unapprove"
                                      className="text-emerald-400 hover:text-sand-400 transition-colors"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleApprove(log, coach.name)}
                                      title="Approve & add to Team Hours"
                                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg transition-colors"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="text-sand-200 hover:text-red-400 transition-colors ml-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      {/* How it works tip */}
      <div className="bg-warm-50 border border-warm-100 rounded-2xl px-5 py-4">
        <p className="text-xs font-semibold text-warm-700 mb-1">How coach links work</p>
        <p className="text-xs text-warm-600 leading-relaxed">
          Each coach has a personal link — e.g. <span className="font-mono bg-warm-100 px-1 rounded">/log/bec</span>. They bookmark it and submit after each shift. No login needed. Hit <strong>Copy link</strong> above to grab it and send it to them.
        </p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeamHoursPage() {
  const [members, setMembers] = useState([])
  const [hoursData, setHoursData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [periodOffset, setPeriodOffset] = useState(0)
  const [activeTab, setActiveTab] = useState('team')
  const [payRates, setPayRates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wd_pay_rates') || '{}') } catch { return {} }
  })

  const TODAY_DATE = new Date()
  const baseStart = getPayPeriodStart(TODAY_DATE)
  const periodStart = addDays(baseStart, periodOffset * 14)
  const periodEnd = addDays(periodStart, 13)
  const days = getFortnightDays(periodStart)
  const week1 = days.slice(0, 5)
  const week2 = days.slice(5, 10)

  useEffect(() => {
    Promise.all([getTeamMembers(), getTeamHours()])
      .then(([m, h]) => { setMembers(m); setHoursData(h) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Lookup: "name|date" → row
  const lookup = {}
  hoursData.forEach(r => { lookup[`${r.person_name}|${r.date}`] = r })

  const getRow = (name, dateISO) => lookup[`${name}|${dateISO}`] || { hours: 0, worked: false, type: 'Normal' }
  const getHours = (name, dateISO) => parseFloat(getRow(name, dateISO).hours) || 0
  const getType = (name, dateISO) => getRow(name, dateISO).type || 'Normal'

  const handleCellChange = useCallback(async (memberName, dateISO, fields) => {
    try {
      const saved = await upsertTeamHourRow({ person_name: memberName, date: dateISO, ...fields })
      setHoursData(prev => {
        const idx = prev.findIndex(r => r.person_name === memberName && r.date === dateISO)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
    } catch (e) { setError(e.message) }
  }, [])

  async function handleAddMember(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length]
      const saved = await addTeamMember({ name: newName.trim(), color })
      setMembers(prev => [...prev, saved])
      setNewName('')
      setShowAddMember(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteMember(id) {
    if (!window.confirm('Remove this team member? Their hours history will remain.')) return
    try { await deleteTeamMember(id); setMembers(prev => prev.filter(m => m.id !== id)) }
    catch (e) { setError(e.message) }
  }

  function setPayRate(name, val) {
    setPayRates(prev => {
      const next = { ...prev, [name]: val }
      localStorage.setItem('wd_pay_rates', JSON.stringify(next))
      return next
    })
  }
  const getRate = (name) => parseFloat(payRates[name]) || 0

  // Totals
  const memberTotal = (name) => days.reduce((s, d) => s + getHours(name, localISO(d)), 0)
  const memberWeekTotal = (name, wkDays) => wkDays.reduce((s, d) => s + getHours(name, localISO(d)), 0)
  const dayTotal = (iso) => members.reduce((s, m) => s + getHours(m.name, iso), 0)
  const grandTotal = () => members.reduce((s, m) => s + memberTotal(m.name), 0)
  const fmt = (n) => n === 0 ? '–' : n % 1 === 0 ? String(n) : n.toFixed(1)
  const fmtNum = (n) => n === 0 ? '0' : n % 1 === 0 ? String(n) : n.toFixed(1)

  function exportCSV() {
    const periodLabel = `${periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

    const leaveTypes = ['Annual Leave', 'Sick Leave', 'Public Holiday', 'RDO', 'Unpaid']
    const headers = ['Name', 'Week 1 Hours', 'Week 2 Hours', 'Total Hours', ...leaveTypes]

    const rows = members.map(m => {
      const leave = leaveSummary(m.name)
      return [
        m.name,
        fmtNum(memberWeekTotal(m.name, week1)),
        fmtNum(memberWeekTotal(m.name, week2)),
        fmtNum(memberTotal(m.name)),
        ...leaveTypes.map(t => leave[t] ? `${leave[t]}d` : ''),
      ]
    })

    // Daily breakdown rows
    const dayHeaders = ['', ...days.map(d => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }))]
    const dayRows = members.map(m => [m.name, ...days.map(d => fmtNum(getHours(m.name, localISO(d))))])

    const csv = [
      [`Pay Period: ${periodLabel}`],
      [],
      ['SUMMARY'],
      headers,
      ...rows,
      [],
      ['DAILY BREAKDOWN'],
      dayHeaders,
      ...dayRows,
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-hours-${periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Leave summary per member
  function leaveSummary(name) {
    const periodStartISO = localISO(periodStart)
    const periodEndISO = localISO(periodEnd)
    const rows = hoursData.filter(r => r.person_name === name && r.date >= periodStartISO && r.date <= periodEndISO && r.type && r.type !== 'Normal')
    const byType = {}
    rows.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1 })
    return byType
  }

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
          <h1 className="text-xl font-bold text-sand-900">Team Hours</h1>
          <p className="text-sand-400 text-sm mt-0.5">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'team' && members.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-white border border-sand-200 hover:border-sand-400 text-sand-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          {activeTab === 'team' && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Member
            </button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-sand-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
            activeTab === 'team' ? 'bg-white shadow-sm text-sand-900' : 'text-sand-400 hover:text-sand-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Team Hours
        </button>
        <button
          onClick={() => setActiveTab('coaches')}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
            activeTab === 'coaches' ? 'bg-white shadow-sm text-sand-900' : 'text-sand-400 hover:text-sand-700'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" /> Coach Logs
        </button>
      </div>

      {/* Coach Logs tab */}
      {activeTab === 'coaches' && (
        <CoachLogsTab
          periodStart={periodStart}
          periodEnd={periodEnd}
          periodOffset={periodOffset}
          setPeriodOffset={setPeriodOffset}
          onApproved={() => {
            // Reload members and hours so Team Hours tab reflects the approval immediately
            Promise.all([getTeamMembers(), getTeamHours()])
              .then(([m, h]) => { setMembers(m); setHoursData(h) })
          }}
        />
      )}

      {/* Team Hours tab content */}
      {activeTab === 'team' && <>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add member */}
      {showAddMember && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <form onSubmit={handleAddMember} className="flex gap-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Team member name…"
              autoFocus
              className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
            />
            <button type="button" onClick={() => setShowAddMember(false)} className="text-sm text-sand-500 px-3">Cancel</button>
            <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Add</button>
          </form>
        </div>
      )}

      {/* Pay period navigator */}
      <div className="bg-white border border-sand-200 rounded-2xl px-5 py-3 flex items-center justify-between">
        <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-sand-100 text-sand-400 hover:text-sand-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-sand-800">
            {periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-sand-400">
            {periodOffset === 0 ? 'Current pay period' : periodOffset === -1 ? 'Previous pay period' : `${Math.abs(periodOffset)} periods ago`}
          </p>
        </div>
        <button onClick={() => setPeriodOffset(o => Math.min(o + 1, 0))} disabled={periodOffset === 0} className="p-1.5 rounded-lg hover:bg-sand-100 text-sand-400 hover:text-sand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-sand-400">Enter hours per day. Click <span className="font-semibold">type</span> under any cell to mark leave, RDO or public holidays.</p>

      {members.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">No team members yet — add someone above</p>
        </div>
      ) : (
        <>
          {/* Single unified grid — all 10 days in one table */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {/* Week label row */}
                  <tr className="border-b border-sand-100 bg-sand-50/60">
                    <th className="px-4 py-2 w-36" />
                    <th colSpan={5} className="px-1 py-2 text-center border-r-2 border-sand-200">
                      <span className="text-[10px] font-bold text-blush-500 uppercase tracking-widest">Week 1</span>
                      <span className="text-[10px] text-sand-400 font-normal ml-1.5">
                        {week1[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {week1[4].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    </th>
                    <th colSpan={5} className="px-1 py-2 text-center border-r-2 border-sand-200">
                      <span className="text-[10px] font-bold text-warm-500 uppercase tracking-widest">Week 2</span>
                      <span className="text-[10px] text-sand-400 font-normal ml-1.5">
                        {week2[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {week2[4].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                  {/* Day name row */}
                  <tr className="border-b border-sand-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-sand-500 w-36">Member</th>
                    {days.map((d, i) => {
                      const iso = localISO(d)
                      const isToday = iso === TODAY
                      const isWeekBoundary = i === 4
                      return (
                        <th key={iso} className={`px-1 py-2 text-center text-xs font-semibold w-14 ${isToday ? 'text-blush-500' : 'text-sand-500'} ${isWeekBoundary ? 'border-r-2 border-sand-200' : ''}`}>
                          <div>{d.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                          <div className={`text-[9px] font-normal ${isToday ? 'text-blush-400' : 'text-sand-400'}`}>
                            {d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </div>
                        </th>
                      )
                    })}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-sand-500 w-16">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => {
                    const total = memberTotal(member.name)
                    return (
                      <tr key={member.id} className={`border-b border-sand-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/40'}`}>
                        <td className="px-4 py-1.5">
                          <div className="flex items-center gap-2 group">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: member.color || '#e5a0a0' }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-sand-800 truncate max-w-[80px]">{member.name}</span>
                            <button onClick={() => handleDeleteMember(member.id)}
                              className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all ml-auto">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {days.map((d, idx) => {
                          const iso = localISO(d)
                          const isWeekBoundary = idx === 4
                          return (
                            <td key={iso} className={isWeekBoundary ? 'border-r-2 border-sand-200' : ''}>
                              <HourCell
                                memberName={member.name}
                                dateISO={iso}
                                value={getHours(member.name, iso)}
                                leaveType={getType(member.name, iso)}
                                onChange={handleCellChange}
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-1.5 text-center">
                          <span className={`text-sm font-bold ${total > 0 ? 'text-blush-600' : 'text-sand-300'}`}>
                            {fmt(total)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}

                  {/* Day totals row */}
                  <tr className="bg-sand-50 border-t-2 border-sand-200">
                    <td className="px-4 py-2 text-xs font-bold text-sand-500 uppercase tracking-wide">Total</td>
                    {days.map((d, idx) => {
                      const iso = localISO(d)
                      const total = dayTotal(iso)
                      const isWeekBoundary = idx === 4
                      return (
                        <td key={iso} className={`px-1 py-2 text-center ${isWeekBoundary ? 'border-r-2 border-sand-200' : ''}`}>
                          <span className={`text-xs font-bold ${total > 0 ? 'text-sand-700' : 'text-sand-200'}`}>{fmt(total)}</span>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs font-bold text-blush-600">{fmt(grandTotal())}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payroll summary table */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-sand-100">
              <h3 className="font-semibold text-sand-900 text-sm">Payroll Summary</h3>
              <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-blush-500 hover:text-blush-600 font-medium">
                <Download className="w-3 h-3" /> Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sand-100 bg-sand-50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-sand-500">Name</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-sand-500">Wk 1</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-sand-500">Wk 2</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-sand-500">Total hrs</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-600">$/hr</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-500">Wk 1 cost</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-500">Wk 2 cost</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-600 border-r border-sand-200">Period cost</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-blue-400">AL</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-amber-400">SL</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-purple-400">PH</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-400">RDO</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => {
                    const leave     = leaveSummary(member.name)
                    const total     = memberTotal(member.name)
                    const wk1       = memberWeekTotal(member.name, week1)
                    const wk2       = memberWeekTotal(member.name, week2)
                    const rate      = getRate(member.name)
                    const wk1cost   = wk1 * rate
                    const wk2cost   = wk2 * rate
                    const totalCost = total * rate
                    return (
                      <tr key={member.id} className={`border-b border-sand-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/40'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: member.color || '#e5a0a0' }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-sand-800">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-sand-700">{fmtNum(wk1)}</td>
                        <td className="px-3 py-3 text-center text-sm text-sand-700">{fmtNum(wk2)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${total > 0 ? 'text-blush-600' : 'text-sand-300'}`}>{fmtNum(total)}</span>
                        </td>
                        {/* Editable pay rate */}
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="text-xs text-sand-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={payRates[member.name] || ''}
                              onChange={e => setPayRate(member.name, e.target.value)}
                              placeholder="0"
                              className="w-14 text-center text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-300 placeholder-sand-300"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-emerald-600 font-medium">
                          {rate > 0 && wk1 > 0 ? `$${wk1cost.toFixed(2)}` : <span className="text-sand-200">–</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-emerald-600 font-medium">
                          {rate > 0 && wk2 > 0 ? `$${wk2cost.toFixed(2)}` : <span className="text-sand-200">–</span>}
                        </td>
                        <td className="px-3 py-3 text-center border-r border-sand-200">
                          {rate > 0 && total > 0
                            ? <span className="text-sm font-bold text-emerald-700">${totalCost.toFixed(2)}</span>
                            : <span className="text-sand-200 text-sm">–</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-blue-500 font-medium">{leave['Annual Leave'] ? `${leave['Annual Leave']}d` : <span className="text-sand-200">–</span>}</td>
                        <td className="px-3 py-3 text-center text-sm text-amber-500 font-medium">{leave['Sick Leave'] ? `${leave['Sick Leave']}d` : <span className="text-sand-200">–</span>}</td>
                        <td className="px-3 py-3 text-center text-sm text-purple-500 font-medium">{leave['Public Holiday'] ? `${leave['Public Holiday']}d` : <span className="text-sand-200">–</span>}</td>
                        <td className="px-3 py-3 text-center text-sm text-emerald-500 font-medium">{leave['RDO'] ? `${leave['RDO']}d` : <span className="text-sand-200">–</span>}</td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  {(() => {
                    const totalCost = members.reduce((s, m) => s + memberTotal(m.name) * getRate(m.name), 0)
                    const wk1cost   = members.reduce((s, m) => s + memberWeekTotal(m.name, week1) * getRate(m.name), 0)
                    const wk2cost   = members.reduce((s, m) => s + memberWeekTotal(m.name, week2) * getRate(m.name), 0)
                    const hasRates  = members.some(m => getRate(m.name) > 0)
                    return (
                      <tr className="bg-sand-50 border-t-2 border-sand-200">
                        <td className="px-5 py-2.5 text-xs font-bold text-sand-500 uppercase tracking-wide">Total</td>
                        <td className="px-3 py-2.5 text-center text-sm font-bold text-sand-700">{fmtNum(members.reduce((s, m) => s + memberWeekTotal(m.name, week1), 0))}</td>
                        <td className="px-3 py-2.5 text-center text-sm font-bold text-sand-700">{fmtNum(members.reduce((s, m) => s + memberWeekTotal(m.name, week2), 0))}</td>
                        <td className="px-3 py-2.5 text-center text-sm font-bold text-blush-600">{fmtNum(grandTotal())}</td>
                        <td />
                        <td className="px-3 py-2.5 text-center text-sm font-bold text-emerald-700">{hasRates && wk1cost > 0 ? `$${wk1cost.toFixed(2)}` : ''}</td>
                        <td className="px-3 py-2.5 text-center text-sm font-bold text-emerald-700">{hasRates && wk2cost > 0 ? `$${wk2cost.toFixed(2)}` : ''}</td>
                        <td className="px-3 py-2.5 text-center border-r border-sand-200">
                          {hasRates && totalCost > 0 && <span className="text-sm font-bold text-emerald-700">${totalCost.toFixed(2)}</span>}
                        </td>
                        <td colSpan={4} />
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pay period summary */}
          <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Pay Period Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Total Hours</p>
                <p className="text-2xl font-bold">{fmt(grandTotal())}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Team Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Week 1</p>
                <p className="text-2xl font-bold">{fmt(members.reduce((s, m) => s + memberWeekTotal(m.name, week1), 0))}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Week 2</p>
                <p className="text-2xl font-bold">{fmt(members.reduce((s, m) => s + memberWeekTotal(m.name, week2), 0))}</p>
              </div>
            </div>

            {/* Per-member breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map(member => {
                const total = memberTotal(member.name)
                const leave = leaveSummary(member.name)
                return (
                  <div key={member.id} className="bg-white/15 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: member.color || '#e5a0a0', filter: 'brightness(1.3)' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs flex-1 truncate opacity-90">{member.name}</span>
                      <span className="text-sm font-bold">{fmt(total)}<span className="text-[10px] font-normal opacity-70 ml-0.5">h</span></span>
                    </div>
                    {Object.entries(leave).map(([type, count]) => (
                      <p key={type} className="text-[10px] opacity-70 ml-7">{count}d {type}</p>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      </> /* end Team Hours tab */}
    </div>
  )
}
