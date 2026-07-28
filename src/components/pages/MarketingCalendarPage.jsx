import { useState } from 'react'
import { LayoutGrid, List, CalendarDays } from 'lucide-react'

const CAL_ID  = 'c_502f49c07638d7bcac62c218c5a54d175cb84e4df42ae728ecafa19705a1fb61%40group.calendar.google.com'
const TZ      = 'Australia%2FSydney'
const BASE    = `https://calendar.google.com/calendar/embed?src=${CAL_ID}&ctz=${TZ}&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0`

const VIEWS = [
  { id: 'MONTH',  label: 'Month',  icon: LayoutGrid  },
  { id: 'WEEK',   label: 'Week',   icon: CalendarDays },
  { id: 'AGENDA', label: 'Agenda', icon: List         },
]

export default function MarketingCalendarPage() {
  const [view, setView] = useState('MONTH')
  const src = `${BASE}&mode=${view}`

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Marketing Calendar</h1>
          <p className="text-sand-400 text-sm mt-0.5">Shared team marketing calendar</p>
        </div>
        <div className="flex items-center gap-1 bg-sand-100 rounded-xl p-1">
          {VIEWS.map(v => {
            const Icon = v.icon
            return (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  view === v.id ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500 hover:text-sand-700'
                }`}>
                <Icon className="w-3.5 h-3.5"/>
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
        <iframe
          src={src}
          style={{ border: 0 }}
          width="100%"
          height="700"
          frameBorder="0"
          scrolling="no"
          title="Marketing Calendar"
        />
      </div>
    </div>
  )
}
