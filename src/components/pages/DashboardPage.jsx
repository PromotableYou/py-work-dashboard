import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquare, Calendar, Lightbulb, Brain, Clock, ArrowRight,
  TrendingUp, Zap, Star, AlertCircle, Flame, AlertTriangle, Video, ExternalLink, CheckCircle2,
} from 'lucide-react'
import { getTasks, getProjects, getSubtasks, getDumps, getIdeas, getTimelog, getUnreviewedVideos, markVideoReviewed } from '../../lib/supabase'
import { getStreak } from './TasksPage'
import QuickLinks from '../QuickLinks'

const WORKSPACE_CONFIG = {
  shaniah: { name: 'Shaniah', email: 'shaniah@promotableyou.com.au' },
  stacey:  { name: 'Stacey',  email: 'stacey@promotableyou.com.au'  },
  em:      { name: 'Em',      email: 'em@promotableyou.com.au'      },
  william: { name: 'William', email: 'william@promotableyou.com.au' },
  tanya:   { name: 'Tanya',   email: 'tanya@promotableyou.com.au'   },
  tanaz:   { name: 'Tanaz',   email: 'tanaz@promotableyou.com.au'   },
}

function gcalAgenda(email) {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  const d = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(email)}&ctz=Australia%2FBrisbane&showTitle=0&showNav=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA&dates=${d}%2F${d}`
}

function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const TODAY = localISO()

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return localISO(mon)
}

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }

// ─── Daily hours mini bar chart (pure SVG) ───────────────────────────────────
function DailyHoursChart({ timelog }) {
  // Get last 10 weekdays
  const days = []
  let d = new Date()
  while (days.length < 10) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) days.unshift(localISO(new Date(d)))
    d.setDate(d.getDate() - 1)
  }

  function calcHours(entry) {
    if (!entry) return null
    if (!entry.clock_in || !entry.clock_out) return 7.6
    const [ih, im] = entry.clock_in.split(':').map(Number)
    const [oh, om] = entry.clock_out.split(':').map(Number)
    return Math.max(0, (oh + om / 60) - (ih + im / 60))
  }

  const hoursMap = {}
  timelog.forEach(t => {
    if (!hoursMap[t.date]) hoursMap[t.date] = t
  })

  const barData = days.map(iso => ({
    iso,
    label: new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short' }),
    hours: calcHours(hoursMap[iso]),
    logged: !!hoursMap[iso],
    isToday: iso === TODAY,
    isWeekend: false,
  }))

  const TARGET = 7.6
  const maxH   = Math.max(...barData.map(b => b.hours || 0), TARGET, 1)
  const W = 420; const H = 100
  const pad = { top: 8, right: 8, bottom: 22, left: 28 }
  const slotW = (W - pad.left - pad.right) / barData.length
  const barW  = Math.max(slotW - 6, 4)

  function xc(i) { return pad.left + i * slotW + slotW / 2 }
  function yh(h) { return pad.top + (1 - h / maxH) * (H - pad.top - pad.bottom) }

  const targetY = yh(TARGET)
  const totalLogged = barData.filter(b => b.logged).length

  if (totalLogged === 0) return null

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
        {/* Gridlines */}
        {[0, 0.5, 1].map(f => {
          const yy = pad.top + (1 - f) * (H - pad.top - pad.bottom)
          return (
            <g key={f}>
              <line x1={pad.left} x2={W - pad.right} y1={yy} y2={yy} stroke="#ece8e3" strokeWidth="1" />
              <text x={pad.left - 3} y={yy + 3} textAnchor="end" fill="#b8afa8" fontSize="7">
                {(maxH * f).toFixed(0)}
              </text>
            </g>
          )
        })}
        {/* Target line */}
        <line x1={pad.left} x2={W - pad.right} y1={targetY} y2={targetY}
          stroke="#f9a8d4" strokeWidth="1.5" strokeDasharray="4 3" />
        {/* Bars */}
        {barData.map((b, i) => {
          if (b.hours === null) {
            // future / unlogged
            return (
              <g key={i}>
                <text x={xc(i)} y={H - pad.bottom + 10} textAnchor="middle" fill={b.isToday ? '#f9a8d4' : '#c8c0bb'} fontSize="7.5" fontWeight={b.isToday ? 'bold' : 'normal'}>
                  {b.label}
                </text>
              </g>
            )
          }
          const bh = Math.max(3, H - pad.bottom - yh(b.hours))
          const by = yh(b.hours)
          const hit = b.hours >= TARGET - 0.1
          const color = b.isToday ? '#f472b6' : hit ? '#86efac' : '#f9a8d4'
          return (
            <g key={i}>
              <rect x={xc(i) - barW / 2} y={by} width={barW} height={bh}
                rx="3" fill={color} opacity={b.isToday ? 1 : 0.8} />
              <text x={xc(i)} y={H - pad.bottom + 10} textAnchor="middle"
                fill={b.isToday ? '#f9a8d4' : '#b8afa8'} fontSize="7.5" fontWeight={b.isToday ? 'bold' : 'normal'}>
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 mt-1">
        <span className="flex items-center gap-1 text-[10px] text-sand-400">
          <span className="w-2.5 h-1.5 rounded bg-emerald-300 inline-block" />hit target
        </span>
        <span className="flex items-center gap-1 text-[10px] text-sand-400">
          <span className="w-2.5 h-1.5 rounded bg-blush-300 inline-block" />under 7.6h
        </span>
        <span className="flex items-center gap-1 text-[10px] text-sand-400">
          <span className="inline-block w-5 border-t-2 border-dashed border-blush-300" />target
        </span>
      </div>
    </div>
  )
}

// ─── Due soon badge helper ────────────────────────────────────────────────────
function dueDiff(dueDate) {
  if (!dueDate) return null
  return Math.round((new Date(dueDate) - new Date(TODAY)) / 86400000)
}

export default function DashboardPage({ workspace = 'shaniah' }) {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [unreviewedVideos, setVideos] = useState([])

  useEffect(() => {
    Promise.all([getTasks(workspace), getProjects(workspace), getSubtasks(workspace), getDumps(workspace), getIdeas(workspace), getTimelog(workspace)])
      .then(([tasks, projects, subtasks, dumps, ideas, timelog]) => {
        setData({ tasks, projects, subtasks, dumps, ideas, timelog })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [workspace])

  useEffect(() => {
    if (workspace === 'shaniah') {
      getUnreviewedVideos().then(setVideos).catch(() => {})
    }
  }, [workspace])

  async function handleMarkReviewed(id) {
    try {
      await markVideoReviewed(id)
      setVideos(v => v.filter(x => x.id !== id))
    } catch { /* graceful */ }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
      <AlertCircle className="w-4 h-4 shrink-0" />{error}
    </div>
  )

  const { tasks, projects, subtasks, dumps, ideas, timelog } = data
  const streak = getStreak()

  // Stats
  const todayTasks    = tasks.filter(t => t.type === 'daily' && t.date === TODAY)
  const todayDone     = todayTasks.filter(t => t.completed).length
  const weekTasks     = tasks.filter(t => t.type === 'weekly' && !t.completed)
  const activeProjects = projects.filter(p => !p.done)

  // Hours
  const weekStart = getWeekStart()
  function calcHours(entry) {
    if (!entry.clock_in || !entry.clock_out) return 7.6
    const [ih, im] = entry.clock_in.split(':').map(Number)
    const [oh, om] = entry.clock_out.split(':').map(Number)
    return Math.max(0, (oh + om / 60) - (ih + im / 60))
  }
  const weekTimelog = timelog.filter(t => t.date >= weekStart)
  const weekHours   = weekTimelog.reduce((s, t) => s + calcHours(t), 0)
  const WEEKLY_TARGETS = { shaniah: 38, stacey: 38, em: 38, william: 38, tanya: 29, tanaz: 38 }
  const TARGET_WEEK = WEEKLY_TARGETS[workspace] ?? 38
  const hoursProgress = Math.min((weekHours / TARGET_WEEK) * 100, 100)

  // Projects with progress
  const projectsWithProgress = activeProjects.map(p => {
    const subs = subtasks.filter(s => s.project_id === p.id)
    const done = subs.filter(s => s.completed).length
    return { ...p, total: subs.length, done }
  }).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))

  // Due soon
  const dueSoon = projectsWithProgress.filter(p => {
    const diff = dueDiff(p.due_date)
    return diff !== null && diff <= 7 && diff >= 0
  }).sort((a, b) => dueDiff(a.due_date) - dueDiff(b.due_date))

  const overdue = projectsWithProgress.filter(p => {
    const diff = dueDiff(p.due_date)
    return diff !== null && diff < 0
  })

  const PRIORITY_COLOR = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-sand-300' }

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blush-500 via-blush-400 to-warm-400 p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="relative">
          <p className="text-white/70 text-sm font-medium">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-4xl font-bold">{greeting()}, {WORKSPACE_CONFIG[workspace]?.name || workspace} 👋</h1>
            {streak.current > 0 && (
              <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold text-white border border-white/30">
                <Flame className="w-4 h-4 text-orange-300" />
                {streak.current} day streak{streak.current >= streak.best && streak.best > 1 ? ' 🏆' : ''}
              </span>
            )}
          </div>
          <p className="text-white/80 mt-2 text-base">
            {todayTasks.length === 0
              ? "You're all clear — add some tasks to get started."
              : todayDone === todayTasks.length
              ? `You've completed all ${todayTasks.length} tasks today. Amazing! 🎉`
              : `You have ${todayTasks.length - todayDone} task${todayTasks.length - todayDone > 1 ? 's' : ''} left today.`
            }
          </p>

          {/* Hours progress bar */}
          <div className="mt-4 max-w-sm">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>This week's hours</span>
              <span>{weekHours.toFixed(1)}h / {TARGET_WEEK}h</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${hoursProgress}%`,
                  background: hoursProgress >= 100 ? '#86efac' : 'rgba(255,255,255,0.9)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      {!['tanya', 'tanaz'].includes(workspace) && <QuickLinks workspace={workspace} />}

      {/* ── Video upload notifications (Shaniah only) ── */}
      {workspace === 'shaniah' && unreviewedVideos.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-violet-100 border-b border-violet-200 flex items-center gap-2">
            <Video className="w-4 h-4 text-violet-600"/>
            <p className="text-xs font-bold text-violet-700 uppercase tracking-widest flex-1">New coach recordings</p>
            <span className="text-xs font-bold text-violet-600 bg-violet-200 rounded-full px-2 py-0.5">{unreviewedVideos.length}</span>
          </div>
          <div className="divide-y divide-violet-100">
            {unreviewedVideos.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                <Video className="w-4 h-4 text-violet-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sand-900">{v.coach_name} — {v.session_name}</p>
                  <p className="text-xs text-sand-400">{v.session_date}</p>
                </div>
                <a href={v.video_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                  View <ExternalLink className="w-3 h-3"/>
                </a>
                <button onClick={() => handleMarkReviewed(v.id)}
                  className="flex items-center gap-1 text-xs text-sand-400 hover:text-green-600 font-medium ml-2 transition-colors">
                  <CheckCircle2 className="w-4 h-4"/> Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overdue / due soon alert ── */}
      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className={`border rounded-2xl p-4 ${overdue.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-4 h-4 ${overdue.length > 0 ? 'text-red-500' : 'text-amber-500'}`} />
            <p className={`text-sm font-semibold ${overdue.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
              {overdue.length > 0
                ? `${overdue.length} project${overdue.length !== 1 ? 's' : ''} overdue`
                : `${dueSoon.length} project${dueSoon.length !== 1 ? 's' : ''} due soon`
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[...overdue, ...dueSoon].map(p => {
              const diff = dueDiff(p.due_date)
              return (
                <Link key={p.id} to="/tasks"
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-colors ${
                    diff < 0
                      ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                      : diff === 0
                      ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLOR[p.priority] || 'bg-sand-300'}`} />
                  {p.name}
                  <span className="font-bold">
                    {diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'today' : `${diff}d`}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Today',
            value: `${todayDone}/${todayTasks.length || 0}`,
            sub: 'tasks done',
            icon: CheckSquare,
            color: 'text-blush-500',
            bg: 'bg-blush-50',
            link: '/tasks',
          },
          {
            label: 'This Week',
            value: weekTasks.length,
            sub: 'tasks remaining',
            icon: Zap,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            link: '/tasks',
          },
          {
            label: 'Projects',
            value: activeProjects.length,
            sub: `${projects.filter(p => p.done).length} completed`,
            icon: Star,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            link: '/tasks',
          },
          {
            label: 'Hours This Week',
            value: weekHours > 0 ? `${weekHours.toFixed(1)}h` : '—',
            sub: `${Math.round(hoursProgress)}% of ${TARGET_WEEK}h target`,
            icon: Clock,
            color: weekHours >= TARGET_WEEK ? 'text-emerald-500' : 'text-blush-500',
            bg: weekHours >= TARGET_WEEK ? 'bg-emerald-50' : 'bg-blush-50',
            link: '/timesheet',
          },
        ].map(s => (
          <Link key={s.label} to={s.link} className="bg-white border border-sand-200 rounded-2xl p-5 hover:shadow-sm hover:border-sand-300 transition-all group">
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-sand-300 group-hover:text-sand-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-sand-900 mt-3">{s.value}</p>
            <p className="text-xs text-sand-400 mt-0.5">{s.sub}</p>
            <p className="text-sm font-medium text-sand-600 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left col (1/2) */}
        <div className="space-y-5">

          {/* Daily hours chart */}
          {timelog.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blush-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Daily Hours — Last 10 Weekdays</h2>
                </div>
                <Link to="/timesheet" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                  Timesheet <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="px-5 py-4">
                <DailyHoursChart timelog={timelog} />
              </div>
            </div>
          )}

          {/* Projects overview */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden" style={{ minHeight: 440 }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-blush-400" />
                <h2 className="font-semibold text-sand-900 text-sm">Active Projects</h2>
              </div>
              <Link to="/tasks" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {projectsWithProgress.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sand-400 text-sm">No active projects</p>
                <Link to="/tasks" className="text-blush-500 text-xs font-medium mt-1 inline-block">Add a project →</Link>
              </div>
            ) : (
              <div className="divide-y divide-sand-50">
                {projectsWithProgress.slice(0, 5).map(p => {
                  const pct  = p.total ? Math.round((p.done / p.total) * 100) : 0
                  const diff = dueDiff(p.due_date)
                  return (
                    <div key={p.id} className="px-5 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLOR[p.priority] || 'bg-sand-300'}`} />
                          <p className="text-sm font-medium text-sand-900 truncate">{p.name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {diff !== null && diff <= 3 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              diff < 0 ? 'bg-red-100 text-red-600' : diff === 0 ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {diff < 0 ? `${Math.abs(diff)}d over` : diff === 0 ? 'today' : `${diff}d`}
                            </span>
                          )}
                          <p className="text-xs text-sand-400">{p.done}/{p.total}</p>
                          <span className="text-xs font-semibold text-sand-600 w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden ml-4">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, p.total === 0 ? 0 : 3)}%`, background: p.color || '#f9a8d4' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Today's tasks snapshot */}
          {todayTasks.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blush-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Today's Tasks</h2>
                  <span className="text-xs bg-blush-100 text-blush-600 font-semibold px-2 py-0.5 rounded-full">{todayDone}/{todayTasks.length}</span>
                </div>
                <Link to="/tasks" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-sand-50">
                {todayTasks.map(t => (
                  <div key={t.id} className={`flex items-center gap-3 px-5 py-3 ${t.completed ? 'opacity-50' : ''}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${t.completed ? 'bg-blush-400 border-blush-400' : 'border-sand-300'}`}>
                      {t.completed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className={`text-sm ${t.completed ? 'line-through text-sand-400' : 'text-sand-800'}`}>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right col (1/3) */}
        <div className="space-y-5">

          {/* Upcoming events — live Google Calendar */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blush-400" />
                <h2 className="font-semibold text-sand-900 text-sm">Upcoming</h2>
              </div>
              <Link to="/calendar" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                Full view <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-hidden" style={{ height: 440 }}>
              <iframe
                src={gcalAgenda(WORKSPACE_CONFIG[workspace]?.email || 'shaniah@promotableyou.com.au')}
                style={{ border: 0, marginTop: -46, display: 'block' }}
                width="100%"
                height="500"
                frameBorder="0"
                scrolling="no"
                title="Upcoming Events"
              />
            </div>
          </div>

          {/* Latest brain dump */}
          {dumps.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blush-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Latest Dump</h2>
                </div>
                <Link to="/dump" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                  Open <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-sand-600 leading-relaxed line-clamp-4">{dumps[0].content}</p>
                <p className="text-xs text-sand-400 mt-2">
                  {new Date(dumps[0].created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          {/* Recent ideas */}
          {ideas.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Recent Ideas</h2>
                  <span className="text-xs bg-amber-100 text-amber-600 font-semibold px-2 py-0.5 rounded-full">{ideas.length}</span>
                </div>
                <Link to="/ideas" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                  All ideas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="px-5 py-3 space-y-2">
                {ideas.slice(0, 3).map(idea => (
                  <div key={idea.id} className="flex items-start gap-2">
                    <span className="text-amber-400 text-sm mt-0.5">💡</span>
                    <p className="text-sm text-sand-700 leading-snug">{idea.title}</p>
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
