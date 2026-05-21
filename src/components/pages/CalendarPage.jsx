import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

const MODES = [
  { label: 'Day',    value: 'DAY'    },
  { label: 'Week',   value: 'WEEK'   },
  { label: 'Month',  value: 'MONTH'  },
  { label: 'Agenda', value: 'AGENDA' },
]

function buildSrc(calendarEmail) {
  const encoded = encodeURIComponent(calendarEmail)
  return `https://calendar.google.com/calendar/embed?src=${encoded}&ctz=Australia%2FBrisbane&showTitle=0&showNav=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0`
}

export default function CalendarPage({ calendarEmail = 'shaniah@promotableyou.com.au' }) {
  const [mode, setMode] = useState('WEEK')
  const BASE_SRC = buildSrc(calendarEmail)

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Calendar</h1>
          <p className="text-sand-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode switcher */}
          <div className="flex bg-white border border-sand-200 rounded-xl p-1 gap-1">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === m.value
                    ? 'bg-blush-500 text-white shadow-sm'
                    : 'text-sand-500 hover:text-sand-700 hover:bg-sand-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-blush-500 hover:text-blush-600 bg-white border border-sand-200 px-3 py-2 rounded-xl transition-colors"
          >
            Open in Google <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Calendar embed */}
      <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden shadow-sm">
        <iframe
          key={mode}
          src={`${BASE_SRC}&mode=${mode}`}
          style={{ border: 0 }}
          width="100%"
          height="700"
          frameBorder="0"
          scrolling="no"
          title="Google Calendar"
        />
      </div>
    </div>
  )
}
