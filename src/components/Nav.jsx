import { NavLink } from 'react-router-dom'
import { Sun, Calendar, Lightbulb, Brain, Clock } from 'lucide-react'

const links = [
  { to: '/',          icon: Sun,       label: 'Today'      },
  { to: '/calendar',  icon: Calendar,  label: 'Calendar'   },
  { to: '/ideas',     icon: Lightbulb, label: 'Ideas'      },
  { to: '/dump',      icon: Brain,     label: 'Brain Dump' },
  { to: '/timesheet', icon: Clock,     label: 'Timesheet'  },
]

export default function Nav() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-56 bg-white border-r border-sand-200 flex-col py-6 px-4 z-40">
        <div className="mb-8 px-2">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-widest">Promotable You</p>
          <h1 className="text-lg font-bold text-sand-900 mt-0.5">Work Dashboard</h1>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blush-50 text-blush-700 border border-blush-200'
                    : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 mt-4">
          <p className="text-xs text-sand-400">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sand-200 z-40 flex">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                isActive ? 'text-blush-500' : 'text-sand-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
