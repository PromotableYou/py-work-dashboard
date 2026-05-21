import { useState, useEffect } from 'react'
import { CheckSquare, FolderOpen, CalendarDays, Users, TrendingUp, Clock } from 'lucide-react'
import { getProjects, getMeetings, getTeamMembers, getTeamHours } from '../../../lib/supabase'
import QuickLinks from '../../QuickLinks'

function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Fortnightly pay period starting from a Monday
function getPayPeriod(today = new Date()) {
  const anchor = new Date('2025-01-06') // a known Monday
  const diff = Math.floor((today - anchor) / (1000 * 60 * 60 * 24 * 14))
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + diff * 14)
  const end = new Date(start)
  end.setDate(start.getDate() + 13)
  return { start, end }
}

export default function BossDashboardPage() {
  const [projects, setProjects] = useState([])
  const [meetings, setMeetings] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [teamHours, setTeamHours] = useState([])
  const [loading, setLoading] = useState(true)

  const TODAY = localISO()
  const NOW = new Date()
  const greeting = NOW.getHours() < 12 ? 'Good morning' : NOW.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    Promise.all([
      getProjects('stacey'),
      getMeetings(),
      getTeamMembers(),
      getTeamHours(),
    ])
      .then(([p, m, tm, th]) => {
        setProjects(p)
        setMeetings(m)
        setTeamMembers(tm)
        setTeamHours(th)
      })
      .finally(() => setLoading(false))
  }, [])

  const { start: payStart, end: payEnd } = getPayPeriod(NOW)

  const activeProjects = projects.filter(p => !p.done)
  const completedProjects = projects.filter(p => p.done)

  // Upcoming meetings (today or future, sorted)
  const upcomingMeetings = meetings
    .filter(m => m.date >= TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  // Team hours for this pay period
  const STD_HOURS = 7.6
  const payStartISO = localISO(payStart)
  const payEndISO = localISO(payEnd)
  const periodRows = teamHours.filter(h => h.date >= payStartISO && h.date <= payEndISO && h.worked)

  // Hours worked per member this period (use stored hours value, fall back to 7.6 per worked day)
  const memberHours = {}
  teamMembers.forEach(m => { memberHours[m.name] = 0 })
  periodRows.forEach(h => {
    if (memberHours[h.person_name] !== undefined) {
      memberHours[h.person_name] += parseFloat(h.hours) || STD_HOURS
    }
  })

  function formatMeetingDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    if (dateStr === TODAY) return 'Today'
    const tomorrow = new Date(NOW)
    tomorrow.setDate(NOW.getDate() + 1)
    if (dateStr === localISO(tomorrow)) return 'Tomorrow'
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const PRIORITY_DOT = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-sand-300',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Hero greeting */}
      <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl px-6 py-5 text-white">
        <p className="text-sm font-medium opacity-80">{greeting}</p>
        <h1 className="text-2xl font-bold mt-0.5">Stacey 👋</h1>
        <p className="text-sm opacity-70 mt-1">
          {NOW.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Quick Links */}
      <QuickLinks workspace="stacey" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-sand-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blush-50 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-3.5 h-3.5 text-blush-500" />
            </div>
            <span className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Active</span>
          </div>
          <p className="text-2xl font-bold text-sand-900">{activeProjects.length}</p>
          <p className="text-xs text-sand-400 mt-0.5">projects</p>
        </div>

        <div className="bg-white border border-sand-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Done</span>
          </div>
          <p className="text-2xl font-bold text-sand-900">{completedProjects.length}</p>
          <p className="text-xs text-sand-400 mt-0.5">projects</p>
        </div>

        <div className="bg-white border border-sand-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-warm-50 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-3.5 h-3.5 text-warm-500" />
            </div>
            <span className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Meetings</span>
          </div>
          <p className="text-2xl font-bold text-sand-900">{upcomingMeetings.length}</p>
          <p className="text-xs text-sand-400 mt-0.5">upcoming</p>
        </div>

        <div className="bg-white border border-sand-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <span className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Team</span>
          </div>
          <p className="text-2xl font-bold text-sand-900">{teamMembers.length}</p>
          <p className="text-xs text-sand-400 mt-0.5">members</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Projects */}
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sand-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blush-400" /> Active Projects
            </h2>
            <a href="/stacey/tasks" className="text-xs text-blush-500 hover:text-blush-600 font-medium">View all →</a>
          </div>

          {activeProjects.length === 0 ? (
            <p className="text-sm text-sand-400 text-center py-6">No active projects</p>
          ) : (
            <div className="space-y-2.5">
              {activeProjects.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center gap-3">
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
                <p className="text-xs text-sand-400 pt-1">+{activeProjects.length - 6} more</p>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sand-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-warm-400" /> Upcoming Meetings
            </h2>
            <a href="/stacey/meetings" className="text-xs text-blush-500 hover:text-blush-600 font-medium">View all →</a>
          </div>

          {upcomingMeetings.length === 0 ? (
            <p className="text-sm text-sand-400 text-center py-6">No upcoming meetings</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingMeetings.map(m => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="shrink-0 text-center min-w-[36px]">
                    <p className={`text-[10px] font-semibold uppercase ${m.date === TODAY ? 'text-blush-500' : 'text-sand-400'}`}>
                      {formatMeetingDate(m.date)}
                    </p>
                    {m.time && <p className="text-[10px] text-sand-400">{m.time}</p>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-sand-800 font-medium truncate">{m.title}</p>
                    {m.attendees && <p className="text-[10px] text-sand-400 truncate">{m.attendees}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Hours Overview */}
      {teamMembers.length > 0 && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sand-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" /> Team Hours This Pay Period
            </h2>
            <a href="/stacey/team-hours" className="text-xs text-blush-500 hover:text-blush-600 font-medium">Manage →</a>
          </div>
          <p className="text-xs text-sand-400 mb-3">
            {payStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {payEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {teamMembers.map(member => {
              const hours = memberHours[member.name] || 0
              const pct   = Math.round((hours / (STD_HOURS * 10)) * 100)
              return (
                <div key={member.id} className="bg-sand-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: member.color || '#e5a0a0' }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-sand-800 truncate">{member.name}</p>
                  </div>
                  <p className="text-xl font-bold text-sand-900">
                    {hours % 1 === 0 ? hours : hours.toFixed(1)}
                    <span className="text-xs font-normal text-sand-400 ml-1">hrs</span>
                  </p>
                  <div className="mt-1.5 h-1 bg-sand-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blush-400 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
