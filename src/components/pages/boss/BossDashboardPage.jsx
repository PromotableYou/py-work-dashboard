import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, FolderOpen, CalendarDays, Users, TrendingUp, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import { getProjects, getMeetings, getTeamMembers, getTeamHours, getAllCoachLogs, getUnapprovedCoachLogsCount } from '../../../lib/supabase'
import { COACHES } from '../../../lib/coaches'
import QuickLinks from '../../QuickLinks'

function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getPayPeriod(today = new Date()) {
  const anchor = new Date('2025-01-06')
  const diff = Math.floor((today - anchor) / (1000 * 60 * 60 * 24 * 14))
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + diff * 14)
  const end = new Date(start)
  end.setDate(start.getDate() + 13)
  return { start, end }
}

// ─── Horizontal bar (team member hours) ──────────────────────────────────────
function MemberBar({ name, hours, color, target, max }) {
  const pct   = max > 0 ? Math.min((hours / max) * 100, 100) : 0
  const tPct  = max > 0 ? Math.min((target / max) * 100, 100) : 0
  const over  = hours >= target
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0">
        <p className="text-sm font-semibold text-sand-800 truncate">{name}</p>
        <p className="text-[10px] text-sand-400">{hours.toFixed(1)}h{target > 0 ? ` / ${target}h` : ''}</p>
      </div>
      <div className="flex-1 relative h-5 bg-sand-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color || '#f9a8d4' }}
        />
        {/* Target marker */}
        {target > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-sand-400/60"
            style={{ left: `${tPct}%` }}
          />
        )}
      </div>
      <span className={`text-xs font-bold w-10 text-right shrink-0 ${over ? 'text-emerald-600' : 'text-sand-500'}`}>
        {over ? '✓' : `${Math.round(pct)}%`}
      </span>
    </div>
  )
}

// ─── Stacked bar (coaching vs admin) ─────────────────────────────────────────
function CoachingBar({ name, coaching, admin }) {
  const total  = coaching + admin
  const cPct   = total > 0 ? (coaching / total) * 100 : 0
  const aPct   = total > 0 ? (admin   / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-semibold text-sand-800 w-14 shrink-0">{name}</p>
      <div className="flex-1 flex h-5 rounded-full overflow-hidden bg-sand-100 gap-px">
        {coaching > 0 && (
          <div
            className="h-full bg-blush-400 flex items-center justify-center transition-all duration-700"
            style={{ width: `${cPct}%` }}
            title={`Coaching: ${coaching.toFixed(1)}h`}
          />
        )}
        {admin > 0 && (
          <div
            className="h-full bg-sand-400 flex items-center justify-center transition-all duration-700"
            style={{ width: `${aPct}%` }}
            title={`Admin: ${admin.toFixed(1)}h`}
          />
        )}
      </div>
      <div className="flex gap-2 w-28 shrink-0 justify-end">
        <span className="text-[10px] font-semibold text-blush-500">{coaching.toFixed(1)}h coaching</span>
        {admin > 0 && <span className="text-[10px] font-semibold text-sand-400">{admin.toFixed(1)}h admin</span>}
      </div>
    </div>
  )
}

// ─── Mini SVG bar chart (weekly trend) ───────────────────────────────────────
function WeeklyHoursChart({ data, target = 76 }) {
  if (!data || data.length === 0) return null
  const max   = Math.max(...data.map(d => d.hours), target, 1)
  const W     = 400
  const H     = 120
  const pad   = { top: 10, right: 10, bottom: 24, left: 32 }
  const barW  = Math.floor((W - pad.left - pad.right) / data.length) - 4

  function x(i)  { return pad.left + i * ((W - pad.left - pad.right) / data.length) + 2 }
  function y(val) { return pad.top + (1 - val / max) * (H - pad.top - pad.bottom) }

  const targetY = y(target)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map(f => {
        const yy = pad.top + (1 - f) * (H - pad.top - pad.bottom)
        return (
          <g key={f}>
            <line x1={pad.left} x2={W - pad.right} y1={yy} y2={yy} stroke="#e8e3df" strokeWidth="1" />
            <text x={pad.left - 4} y={yy + 3} textAnchor="end" fill="#a89e98" fontSize="8">
              {Math.round(max * f)}
            </text>
          </g>
        )
      })}
      {/* Target line */}
      <line x1={pad.left} x2={W - pad.right} y1={targetY} y2={targetY}
        stroke="#f9a8d4" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={W - pad.right + 2} y={targetY + 3} fill="#f9a8d4" fontSize="7">target</text>
      {/* Bars */}
      {data.map((d, i) => {
        const bh  = Math.max(2, H - pad.bottom - y(d.hours))
        const by  = y(d.hours)
        const hit = d.hours >= target
        return (
          <g key={i}>
            <rect x={x(i)} y={by} width={barW} height={bh}
              rx="3" fill={hit ? '#86efac' : '#f9a8d4'} opacity="0.85" />
            <text x={x(i) + barW / 2} y={H - pad.bottom + 10} textAnchor="middle" fill="#a89e98" fontSize="8">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BossDashboardPage() {
  const [projects,    setProjects]    = useState([])
  const [meetings,    setMeetings]    = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [teamHours,   setTeamHours]   = useState([])
  const [coachLogs,   setCoachLogs]   = useState([])
  const [pending,     setPending]     = useState(0)
  const [loading,     setLoading]     = useState(true)

  const TODAY = localISO()
  const NOW   = new Date()
  const greeting = NOW.getHours() < 12 ? 'Good morning' : NOW.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    Promise.all([
      getProjects('stacey'),
      getMeetings(),
      getTeamMembers(),
      getTeamHours(),
      getAllCoachLogs(),
      getUnapprovedCoachLogsCount(),
    ])
      .then(([p, m, tm, th, cl, pc]) => {
        setProjects(p); setMeetings(m); setTeamMembers(tm)
        setTeamHours(th); setCoachLogs(cl); setPending(pc)
      })
      .finally(() => setLoading(false))
  }, [])

  const { start: payStart, end: payEnd } = getPayPeriod(NOW)
  const payStartISO = localISO(payStart)
  const payEndISO   = localISO(payEnd)

  const activeProjects    = projects.filter(p => !p.done)
  const completedProjects = projects.filter(p => p.done)

  const upcomingMeetings = meetings
    .filter(m => m.date >= TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const todayMeetings = upcomingMeetings.filter(m => m.date === TODAY)

  // ── Team hours per member (current pay period) ──
  const STD_HOURS   = 7.6
  const periodRows  = teamHours.filter(h => h.date >= payStartISO && h.date <= payEndISO && h.worked)
  const memberHoursMap = {}
  teamMembers.forEach(m => { memberHoursMap[m.name] = 0 })
  periodRows.forEach(h => {
    if (memberHoursMap[h.person_name] !== undefined) {
      memberHoursMap[h.person_name] += parseFloat(h.hours) || STD_HOURS
    }
  })
  const totalTeamHours = Object.values(memberHoursMap).reduce((s, h) => s + h, 0)
  const maxMemberHours = Math.max(...Object.values(memberHoursMap), 76, 1)

  // Member colours from DB
  const memberColorMap = {}
  teamMembers.forEach(m => { memberColorMap[m.name] = m.color })

  // ── Weekly pay period hours chart (by week within period) ──
  // Build week buckets: week1 (days 1-5) and week2 (days 6-10) sums
  const w1Start = payStartISO
  const w1End   = localISO(new Date(payStart.getTime() + 4 * 86400000))
  const w2Start = localISO(new Date(payStart.getTime() + 7 * 86400000))
  const w2End   = payEndISO

  // Get last 6 weeks of team hours for trend chart
  const sixWeeksAgo = localISO(new Date(NOW.getTime() - 42 * 86400000))
  const recentHours = teamHours.filter(h => h.date >= sixWeeksAgo && h.worked)

  // Build weekly buckets (Mon of each week)
  const weekBuckets = {}
  recentHours.forEach(h => {
    const d    = new Date(h.date + 'T12:00:00')
    const day  = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon  = new Date(d); mon.setDate(d.getDate() + diff)
    const key  = localISO(mon)
    if (!weekBuckets[key]) weekBuckets[key] = 0
    weekBuckets[key] += parseFloat(h.hours) || STD_HOURS
  })
  const weekChartData = Object.keys(weekBuckets).sort().slice(-6).map(key => {
    const d = new Date(key + 'T12:00:00')
    return {
      label: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      hours: weekBuckets[key],
    }
  })

  // ── Coach breakdown (coaching vs admin) ──
  const coachBreakdown = COACHES.map(coach => {
    const logs = coachLogs.filter(l => l.coach_name === coach.name)
    const coaching = logs.reduce((s, l) => s + (parseFloat(l.coaching_hours) || 0), 0)
    const admin    = logs.reduce((s, l) => s + (parseFloat(l.admin_hours)    || 0), 0)
    const total    = coaching + admin || logs.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0)
    const pending  = logs.filter(l => !l.approved).length
    return { ...coach, coaching, admin, total, pending }
  })

  const totalCoachingHours = coachBreakdown.reduce((s, c) => s + c.coaching, 0)
  const totalAdminHours    = coachBreakdown.reduce((s, c) => s + c.admin, 0)
  const coachingPct        = totalCoachingHours + totalAdminHours > 0
    ? Math.round((totalCoachingHours / (totalCoachingHours + totalAdminHours)) * 100) : 0

  function formatMeetingDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    if (dateStr === TODAY) return 'Today'
    const tom = new Date(NOW); tom.setDate(NOW.getDate() + 1)
    if (dateStr === localISO(tom)) return 'Tomorrow'
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const PRIORITY_DOT = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-sand-300' }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl px-6 py-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24" />
        <div className="relative">
          <p className="text-sm font-medium opacity-80">{greeting}</p>
          <h1 className="text-2xl font-bold mt-0.5">Stacey 👋</h1>
          <p className="text-sm opacity-70 mt-0.5">
            {NOW.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {/* Chips row */}
          <div className="flex flex-wrap gap-2 mt-3">
            {pending > 0 && (
              <Link to="/stacey/team-hours"
                className="flex items-center gap-1.5 bg-red-400/80 hover:bg-red-400 border border-red-300/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors">
                🔔 {pending} pending approval{pending !== 1 ? 's' : ''}
              </Link>
            )}
            {todayMeetings.length > 0 && (
              <Link to="/stacey/meetings"
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors">
                📅 {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''} today
              </Link>
            )}
            {activeProjects.length > 0 && (
              <span className="flex items-center gap-1.5 bg-white/15 border border-white/25 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90">
                📁 {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
              </span>
            )}
            {totalTeamHours > 0 && (
              <span className="flex items-center gap-1.5 bg-white/15 border border-white/25 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90">
                ⏱ {totalTeamHours.toFixed(0)}h logged this period
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <QuickLinks workspace="stacey" />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Active Projects', value: activeProjects.length, sub: `${completedProjects.length} completed`,
            icon: FolderOpen, color: 'text-blush-500', bg: 'bg-blush-50', link: '/stacey/tasks',
          },
          {
            label: 'Team Members', value: teamMembers.length, sub: `${totalTeamHours.toFixed(0)}h this period`,
            icon: Users, color: 'text-purple-500', bg: 'bg-purple-50', link: '/stacey/team-hours',
          },
          {
            label: 'Pending Approvals', value: pending, sub: 'coach log submissions',
            icon: AlertCircle, color: pending > 0 ? 'text-red-500' : 'text-sand-400',
            bg: pending > 0 ? 'bg-red-50' : 'bg-sand-50', link: '/stacey/team-hours',
          },
          {
            label: 'Upcoming Meetings', value: upcomingMeetings.length, sub: `${todayMeetings.length} today`,
            icon: CalendarDays, color: 'text-warm-500', bg: 'bg-warm-50', link: '/stacey/meetings',
          },
        ].map(s => (
          <Link key={s.label} to={s.link}
            className="bg-white border border-sand-200 rounded-2xl p-4 hover:shadow-sm hover:border-sand-300 transition-all group">
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-sand-300 group-hover:text-sand-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-sand-900">{s.value}</p>
            <p className="text-xs text-sand-400 mt-0.5">{s.sub}</p>
            <p className="text-sm font-medium text-sand-600 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Team hours this period */}
          {teamMembers.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blush-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Team Hours — Current Pay Period</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-sand-400">
                    {payStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {payEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </span>
                  <Link to="/stacey/team-hours" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                    Full grid <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                {teamMembers.map(m => (
                  <MemberBar
                    key={m.id}
                    name={m.name}
                    hours={memberHoursMap[m.name] || 0}
                    color={m.color}
                    target={76}
                    max={maxMemberHours}
                  />
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-sand-400 text-center py-4">No team members yet</p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-sand-100">
                  <span className="text-xs text-sand-400">Target line at 76h — 2 weeks full time</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="w-3 h-1.5 bg-blush-200 rounded-full" />
                    <span className="text-[10px] text-sand-400">under</span>
                    <div className="w-3 h-1.5 bg-emerald-300 rounded-full ml-2" />
                    <span className="text-[10px] text-sand-400">met</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coaching breakdown */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blush-400" />
                <h2 className="font-semibold text-sand-900 text-sm">Coaching Breakdown — All Time</h2>
              </div>
              <Link to="/stacey/team-hours" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                Coach logs <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Overall split */}
              {(totalCoachingHours + totalAdminHours) > 0 && (
                <div className="flex items-center gap-4 pb-3 border-b border-sand-100">
                  <div className="flex-1 h-3 bg-sand-100 rounded-full overflow-hidden flex gap-px">
                    <div className="h-full bg-blush-400 rounded-l-full transition-all duration-700" style={{ width: `${coachingPct}%` }} />
                    <div className="h-full bg-sand-400 rounded-r-full transition-all duration-700" style={{ width: `${100 - coachingPct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-blush-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-blush-400 shrink-0" />{coachingPct}% coaching
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-sand-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-sand-400 shrink-0" />{100 - coachingPct}% admin
                    </span>
                  </div>
                </div>
              )}
              {/* Per-coach bars */}
              {coachBreakdown.map(c => (
                <div key={c.slug}>
                  <CoachingBar name={c.name} coaching={c.coaching} admin={c.admin} />
                  {c.pending > 0 && (
                    <p className="text-[10px] text-amber-600 ml-14 mt-0.5">
                      {c.pending} log{c.pending !== 1 ? 's' : ''} pending approval
                    </p>
                  )}
                </div>
              ))}
              {totalCoachingHours + totalAdminHours === 0 && (
                <p className="text-sm text-sand-400 text-center py-4">No coach logs yet</p>
              )}
            </div>
          </div>

          {/* Team hours weekly trend */}
          {weekChartData.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Total Team Hours — Weekly Trend</h2>
                </div>
              </div>
              <div className="px-5 py-4">
                <WeeklyHoursChart data={weekChartData} target={teamMembers.length * 38} />
                <p className="text-xs text-sand-400 mt-1">Target line = {teamMembers.length} members × 38h/week</p>
              </div>
            </div>
          )}

        </div>

        {/* Right (1/3) */}
        <div className="space-y-5">

          {/* Upcoming meetings */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-warm-400" />
                <h2 className="font-semibold text-sand-900 text-sm">Upcoming Meetings</h2>
              </div>
              <Link to="/stacey/meetings" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-sand-400 text-center py-8">No upcoming meetings</p>
            ) : (
              <div className="divide-y divide-sand-50">
                {upcomingMeetings.map(m => (
                  <div key={m.id} className={`flex items-start gap-3 px-5 py-3 ${m.date === TODAY ? 'bg-blush-50/40' : ''}`}>
                    <div className="shrink-0 min-w-[42px]">
                      <p className={`text-[10px] font-bold uppercase ${m.date === TODAY ? 'text-blush-500' : 'text-sand-400'}`}>
                        {formatMeetingDate(m.date)}
                      </p>
                      {m.time && <p className="text-[10px] text-sand-400">{m.time}</p>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${m.date === TODAY ? 'text-sand-900' : 'text-sand-700'}`}>{m.title}</p>
                      {m.attendees && <p className="text-[10px] text-sand-400 truncate">{m.attendees}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active projects */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blush-400" />
                <h2 className="font-semibold text-sand-900 text-sm">Active Projects</h2>
              </div>
              <Link to="/stacey/tasks" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-sand-400 text-center py-8">No active projects</p>
            ) : (
              <div className="divide-y divide-sand-50">
                {activeProjects.slice(0, 6).map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[p.priority] || 'bg-sand-300'}`} />
                    <p className="text-sm text-sand-800 flex-1 truncate">{p.name}</p>
                    {p.due_date && (
                      <span className="text-[10px] text-sand-400 shrink-0">
                        {new Date(p.due_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
                {activeProjects.length > 6 && (
                  <p className="text-xs text-sand-400 px-5 py-2">+{activeProjects.length - 6} more</p>
                )}
              </div>
            )}
          </div>

          {/* Recent coach log activity */}
          {coachLogs.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Recent Coach Activity</h2>
                </div>
                <Link to="/stacey/team-hours" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                  Review <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-sand-50">
                {coachLogs.slice(0, 5).map(log => (
                  <div key={log.id} className={`flex items-center gap-3 px-5 py-2.5 ${!log.approved ? 'bg-amber-50/50' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-blush-100 flex items-center justify-center text-xs font-bold text-blush-600 shrink-0">
                      {log.coach_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-sand-800">{log.coach_name}</p>
                      <p className="text-[10px] text-sand-400">
                        {new Date(log.date + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{(log.coaching_hours || 0) + (log.admin_hours || 0) || log.hours || 0}h
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      log.approved ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.approved ? '✓' : 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
