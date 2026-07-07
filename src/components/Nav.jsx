import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { LayoutDashboard, CheckSquare, Calendar, Lightbulb, Brain, Clock, Users, CalendarDays, CalendarRange, StickyNote, ClipboardList, ChevronDown, Video } from 'lucide-react'
import { getUnapprovedCoachLogsCount, getUnreviewedVideos } from '../lib/supabase'

const WORKSPACES = [
  {
    slug: 'shaniah', label: 'Shaniah', home: '/',
    links: [
      { to: '/',                 icon: LayoutDashboard, label: 'Dashboard',   end: true, videoBadge: true },
      { to: '/tasks',            icon: CheckSquare,     label: 'Tasks'       },
      { to: '/calendar',         icon: Calendar,        label: 'Calendar'    },
      { to: '/meetings',         icon: CalendarDays,    label: 'Meetings'    },
      { to: '/coaches-calendar', icon: CalendarRange,   label: 'Coaches Cal' },
      { to: '/roster',           icon: ClipboardList,   label: 'Roster'      },
      { to: '/notes',            icon: StickyNote,      label: 'Notes'       },
      { to: '/ideas',            icon: Lightbulb,       label: 'Ideas'       },
      { to: '/dump',             icon: Brain,           label: 'Brain Dump'  },
      { to: '/timesheet',        icon: Clock,           label: 'Timesheet'   },
    ],
  },
  {
    slug: 'stacey', label: 'Stacey', home: '/stacey',
    links: [
      { to: '/stacey',                  icon: LayoutDashboard, label: 'Dashboard',   end: true },
      { to: '/stacey/tasks',            icon: CheckSquare,     label: 'Tasks'       },
      { to: '/stacey/calendar',         icon: Calendar,        label: 'Calendar'    },
      { to: '/stacey/meetings',         icon: CalendarDays,    label: 'Meetings'    },
      { to: '/stacey/coaches-calendar', icon: CalendarRange,   label: 'Coaches Cal' },
      { to: '/stacey/roster',           icon: ClipboardList,   label: 'Roster'      },
      { to: '/stacey/notes',            icon: StickyNote,      label: 'Notes'       },
      { to: '/stacey/ideas',            icon: Lightbulb,       label: 'Ideas'       },
      { to: '/stacey/dump',             icon: Brain,           label: 'Brain Dump'  },
      { to: '/stacey/team-hours',       icon: Users,           label: 'Team Hours', badge: true },
    ],
  },
  {
    slug: 'em', label: 'Em', home: '/em',
    links: [
      { to: '/em',                 icon: LayoutDashboard, label: 'Dashboard',   end: true },
      { to: '/em/tasks',           icon: CheckSquare,     label: 'Tasks'       },
      { to: '/em/meetings',        icon: CalendarDays,    label: 'Meetings'    },
      { to: '/em/coaches-calendar',icon: CalendarRange,   label: 'Coaches Cal' },
      { to: '/em/roster',          icon: ClipboardList,   label: 'Roster'      },
      { to: '/em/notes',           icon: StickyNote,      label: 'Notes'       },
      { to: '/em/ideas',           icon: Lightbulb,       label: 'Ideas'       },
      { to: '/em/dump',            icon: Brain,           label: 'Brain Dump'  },
    ],
  },
  {
    slug: 'william', label: 'William', home: '/william',
    links: [
      { to: '/william',                 icon: LayoutDashboard, label: 'Dashboard',   end: true },
      { to: '/william/tasks',           icon: CheckSquare,     label: 'Tasks'       },
      { to: '/william/meetings',        icon: CalendarDays,    label: 'Meetings'    },
      { to: '/william/coaches-calendar',icon: CalendarRange,   label: 'Coaches Cal' },
      { to: '/william/roster',          icon: ClipboardList,   label: 'Roster'      },
      { to: '/william/notes',           icon: StickyNote,      label: 'Notes'       },
      { to: '/william/ideas',           icon: Lightbulb,       label: 'Ideas'       },
      { to: '/william/dump',            icon: Brain,           label: 'Brain Dump'  },
    ],
  },
  {
    slug: 'tanya', label: 'Tanya', home: '/tanya',
    links: [
      { to: '/tanya',           icon: LayoutDashboard, label: 'Dashboard',   end: true },
      { to: '/tanya/tasks',     icon: CheckSquare,     label: 'Tasks'       },
      { to: '/tanya/sessions',  icon: Video,           label: 'Sessions'    },
      { to: '/tanya/notes',     icon: StickyNote,      label: 'Notes'       },
      { to: '/tanya/ideas',     icon: Lightbulb,       label: 'Ideas'       },
      { to: '/tanya/dump',      icon: Brain,           label: 'Brain Dump'  },
      { to: '/tanya/timesheet', icon: Clock,           label: 'Timesheet'   },
    ],
  },
  {
    slug: 'tanaz', label: 'Tanaz', home: '/tanaz',
    links: [
      { to: '/tanaz',           icon: LayoutDashboard, label: 'Dashboard',   end: true },
      { to: '/tanaz/tasks',     icon: CheckSquare,     label: 'Tasks'       },
      { to: '/tanaz/sessions',  icon: Video,           label: 'Sessions'    },
      { to: '/tanaz/notes',     icon: StickyNote,      label: 'Notes'       },
      { to: '/tanaz/ideas',     icon: Lightbulb,       label: 'Ideas'       },
      { to: '/tanaz/dump',      icon: Brain,           label: 'Brain Dump'  },
      { to: '/tanaz/timesheet', icon: Clock,           label: 'Timesheet'   },
    ],
  },
]

function detectWorkspace(pathname) {
  if (pathname.startsWith('/stacey'))  return 'stacey'
  if (pathname.startsWith('/em'))      return 'em'
  if (pathname.startsWith('/william')) return 'william'
  if (pathname.startsWith('/tanya'))   return 'tanya'
  if (pathname.startsWith('/tanaz'))   return 'tanaz'
  return 'shaniah'
}

export default function Nav() {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const currentSlug  = detectWorkspace(pathname)
  const current      = WORKSPACES.find(w => w.slug === currentSlug)
  const links        = current?.links || WORKSPACES[0].links

  const [open, setOpen]                 = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [videoCount, setVideoCount]     = useState(0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    getUnapprovedCoachLogsCount().then(setPendingCount)
    const interval = setInterval(() => getUnapprovedCoachLogsCount().then(setPendingCount), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (currentSlug === 'shaniah') {
      getUnreviewedVideos().then(videos => setVideoCount(videos.length)).catch(() => {})
      const iv = setInterval(() => getUnreviewedVideos().then(v => setVideoCount(v.length)).catch(() => {}), 5 * 60 * 1000)
      return () => clearInterval(iv)
    } else {
      setVideoCount(0)
    }
  }, [currentSlug])

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex print:hidden fixed left-0 top-0 h-full w-56 bg-white border-r border-sand-200 flex-col py-6 px-4 z-40">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-widest">Promotable You</p>
          <h1 className="text-lg font-bold text-sand-900 mt-0.5">Work Dashboard</h1>
        </div>

        {/* Workspace switcher — dropdown */}
        <div className="relative mb-5" ref={dropdownRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 bg-sand-100 hover:bg-sand-200 rounded-xl px-3 py-2 transition-colors"
          >
            <span className="text-sm font-semibold text-sand-800">{current?.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-sand-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-sand-200 rounded-xl shadow-lg overflow-hidden z-50">
              {WORKSPACES.map(ws => (
                <button
                  key={ws.slug}
                  onClick={() => { navigate(ws.home); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                    currentSlug === ws.slug
                      ? 'bg-blush-50 text-blush-700'
                      : 'text-sand-700 hover:bg-sand-50'
                  }`}
                >
                  {ws.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label, end, badge, videoBadge }) => {
            const showBadge = badge && pendingCount > 0
            const showVideo = videoBadge && videoCount > 0
            return (
              <NavLink
                key={to}
                to={to}
                end={!!end}
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
                {showVideo && (
                  <span className="min-w-[18px] h-[18px] bg-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                    {videoCount > 9 ? '9+' : videoCount}
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
        {links.map(({ to, icon: Icon, label, end, badge, videoBadge }) => {
          const showBadge = badge && pendingCount > 0
          const showVideo = videoBadge && videoCount > 0
          return (
            <NavLink
              key={to}
              to={to}
              end={!!end}
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
                {showVideo && !showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-violet-500 rounded-full border-2 border-white" />
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
