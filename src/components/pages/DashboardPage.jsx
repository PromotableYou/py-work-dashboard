import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Calendar, Lightbulb, Brain, Clock, ArrowRight, TrendingUp, Zap, Star, AlertCircle, Flame } from 'lucide-react'
import { getTasks, getProjects, getSubtasks, getDumps, getIdeas, getTimelog } from '../../lib/supabase'
import { getStreak } from './TasksPage'

const GCAL_AGENDA = 'https://calendar.google.com/calendar/embed?src=shaniah%40promotableyou.com.au&ctz=Australia%2FBrisbane&showTitle=0&showNav=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&mode=AGENDA'

const TODAY = new Date().toISOString().slice(0, 10)

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon.toISOString().slice(0, 10)
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([getTasks(), getProjects(), getSubtasks(), getDumps(), getIdeas(), getTimelog()])
      .then(([tasks, projects, subtasks, dumps, ideas, timelog]) => {
        setData({ tasks, projects, subtasks, dumps, ideas, timelog })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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
  const todayTasks = tasks.filter(t => t.type === 'daily' && t.date === TODAY)
  const todayDone = todayTasks.filter(t => t.completed).length
  const weekTasks = tasks.filter(t => t.type === 'weekly' && !t.completed)
  const wipTasks = tasks.filter(t => t.type === 'wip' && !t.completed)
  const activeProjects = projects.filter(p => !p.done)

  const weekStart = getWeekStart()
  const weekHours = timelog
    .filter(t => t.date >= weekStart)
    .reduce((s, t) => {
      if (!t.clock_in || !t.clock_out) return s + 7.6
      const [ih, im] = t.clock_in.split(':').map(Number)
      const [oh, om] = t.clock_out.split(':').map(Number)
      return s + Math.max(0, (oh + om / 60) - (ih + im / 60))
    }, 0)

  // Projects with progress
  const projectsWithProgress = activeProjects.map(p => {
    const subs = subtasks.filter(s => s.project_id === p.id)
    const done = subs.filter(s => s.completed).length
    return { ...p, total: subs.length, done }
  }).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))

  const PRIORITY_COLOR = {
    high: 'bg-red-400',
    medium: 'bg-amber-400',
    low: 'bg-sand-300',
  }

  return (
    <div className="space-y-6 pb-6">

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blush-500 via-blush-400 to-warm-400 p-8 text-white shadow-lg">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full" />

        <div className="relative">
          <p className="text-white/70 text-sm font-medium">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="text-4xl font-bold">{greeting()}, Shaniah 👋</h1>
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

          {/* Mini progress bar */}
          {todayTasks.length > 0 && (
            <div className="mt-4 max-w-xs">
              <div className="flex justify-between text-xs text-white/70 mb-1">
                <span>Today's progress</span>
                <span>{todayDone}/{todayTasks.length}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${(todayDone / todayTasks.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
            sub: 'active',
            icon: Star,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            link: '/tasks',
          },
          {
            label: 'Hours This Week',
            value: weekHours > 0 ? `${weekHours.toFixed(1)}h` : '—',
            sub: 'logged',
            icon: Clock,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left col (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Projects overview */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
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
                {projectsWithProgress.slice(0, 4).map(p => {
                  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0
                  return (
                    <div key={p.id} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${PRIORITY_COLOR[p.priority] || 'bg-sand-300'}`} />
                          <p className="text-sm font-medium text-sand-900">{p.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-sand-400">{p.done}/{p.total} tasks</p>
                          <span className="text-xs font-semibold text-sand-600">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-sand-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blush-400 to-blush-500 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, p.total === 0 ? 0 : 3)}%` }}
                        />
                      </div>
                      {p.notes && <p className="text-xs text-sand-400 mt-1.5 truncate">{p.notes}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Today's tasks snapshot */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blush-400" />
                <h2 className="font-semibold text-sand-900 text-sm">Today's Tasks</h2>
              </div>
              <Link to="/tasks" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {todayTasks.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sand-400 text-sm">Nothing added yet today</p>
                <Link to="/tasks" className="text-blush-500 text-xs font-medium mt-1 inline-block">Add tasks →</Link>
              </div>
            ) : (
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
            )}
          </div>

          {/* WIP snapshot */}
          {wipTasks.length > 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sand-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <h2 className="font-semibold text-sand-900 text-sm">Work in Progress</h2>
                  <span className="text-xs bg-purple-100 text-purple-600 font-semibold px-2 py-0.5 rounded-full">{wipTasks.length}</span>
                </div>
                <Link to="/tasks" className="text-xs text-blush-500 hover:text-blush-600 font-medium flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="px-5 py-3 flex flex-wrap gap-2">
                {wipTasks.slice(0, 6).map(t => (
                  <span key={t.id} className="text-xs bg-sand-100 text-sand-700 px-3 py-1.5 rounded-full border border-sand-200">{t.text}</span>
                ))}
                {wipTasks.length > 6 && (
                  <span className="text-xs text-sand-400 px-3 py-1.5">+{wipTasks.length - 6} more</span>
                )}
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
            {/* Clip the Google Calendar header bar with overflow + negative margin */}
            <div className="overflow-hidden" style={{ height: 260 }}>
              <iframe
                src={GCAL_AGENDA}
                style={{ border: 0, marginTop: -46, display: 'block' }}
                width="100%"
                height="320"
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
