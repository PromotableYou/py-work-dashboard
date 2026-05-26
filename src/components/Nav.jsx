import { NavLink, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, CheckSquare, Calendar, Lightbulb, Brain, Clock, Users, CalendarDays, CalendarRange, StickyNote, ClipboardList } from 'lucide-react'
import { getUnapprovedCoachLogsCount } from '../lib/supabase'

const SHANIAH_LINKS = [
  { to: '/',                    icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/tasks',               icon: CheckSquare,     label: 'Tasks'       },
  { to: '/calendar',            icon: Calendar,        label: 'Calendar'    },
  { to: '/meetings',            icon: CalendarDays,    label: 'Meetings'    },
  { to: '/coaches-calendar',    icon: CalendarRange,   label: 'Coaches Cal' },
  { to: '/roster',              icon: ClipboardList,   label: 'Roster'      },
  { to: '/notes',               icon: StickyNote,      label: 'Notes'       },
  { to: '/ideas',               icon: Lightbulb,       label: 'Ideas'       },
  { to: '/dump',                icon: Brain,           label: 'Brain Dump'  },
  { to: '/timesheet',           icon: Clock,           label: 'Timesheet'   },
]

const BOSS_LINKS = [
  { to: '/stacey',                    icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/stacey/tasks',              icon: CheckSquare,     label: 'Tasks'       },
  { to: '/stacey/calendar',           icon: Calendar,        label: 'Calendar'    },
  { to: '/stacey/meetings',           icon: CalendarDays,    label: 'Meetings'    },
  { to: '/stacey/coaches-calendar',   icon: CalendarRange,   label: 'Coaches Cal' },
  { to: '/stacey/roster',             icon: ClipboardList,   label: 'Roster'      },
  { to: '/stacey/notes',              icon: StickyNote,      label: 'Notes'       },
  { to: '/stacey/ideas',              icon: Lightbulb,       label: 'Ideas'       },
  { to: '/stacey/dump',               icon: Brain,           label: 'Brain Dump'  },
  { to: '/stacey/team-hours',         icon: Users,           label: 'Team Hours'  },
]

export default function Nav() {
  const { pathname } = useLocation()
  const isBoss = pathname.startsWith('/stacey')
  const links = isBoss ? BOSS_LINKS : SHANIAH_LINKS

  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    getUnapprovedCoachLogsCount().then(setPendingCount)
    const interval = setInterval(() => getUnapprovedCoachLogsCount().then(setPendingCount), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex print:hidden fixed left-0 top-0 h-full w-56 bg-white border-r border-sand-200 flex-col py-6 px-4 z-40">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-widest">Promotable You</p>
          <h1 className="text-lg font-bold text-sand-900 mt-0.5">Work Dashboard</h1>
        </div>

        {/* Workspace switcher */}
        <div className="flex gap-1 bg-sand-100 rounded-xl p-1 mb-5">
          <Link
            to="/"
            className={`flex-1 text-xs py-1.5 text-center rounded-lg font-semibold transition-all ${
              !isBoss ? 'bg-white shadow-sm text-sand-900' : 'text-sand-400 hover:text-sand-700'
            }`}
          >
            Shaniah
          </Link>
          <Link
            to="/stacey"
            className={`flex-1 text-xs py-1.5 text-center rounded-lg font-semibold transition-all ${
              isBoss ? 'bg-white shadow-sm text-sand-900' : 'text-sand-400 hover:text-sand-700'
            }`}
          >
            Stacey
          </Link>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map(({ to, icon: Icon, label }) => {
            const isTeamHours = to === '/stacey/team-hours'
            const showBadge = isTeamHours && pendingCount > 0
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/' || to === '/stacey'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blush-50 text-blush-700 border border-blush-200'
                      : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="px-2 mt-4">
          <p className="text-xs text-sand-400">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden print:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sand-200 z-40 flex overflow-x-auto">
        {links.map(({ to, icon: Icon, label }) => {
          const isTeamHours = to === '/stacey/team-hours'
          const showBadge = isTeamHours && pendingCount > 0
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/stacey'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors min-w-[3.5rem] relative ${
                  isActive ? 'text-blush-500' : 'text-sand-400'
                }`
              }
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </div>
              {label.split(' ')[0]}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}
