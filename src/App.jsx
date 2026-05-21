import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import DashboardPage from './components/pages/DashboardPage'
import TasksPage from './components/pages/TasksPage'
import CalendarPage from './components/pages/CalendarPage'
import IdeasPage from './components/pages/IdeasPage'
import BrainDumpPage from './components/pages/BrainDumpPage'
import TimesheetPage from './components/pages/TimesheetPage'
import BossDashboardPage from './components/pages/stacey.pm/BossDashboardPage'
import MeetingsPage from './components/pages/stacey.pm/MeetingsPage'
import TeamHoursPage from './components/pages/stacey.pm/TeamHoursPage'
import CoachesCalendarPage from './components/pages/stacey.pm/CoachesCalendarPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-sand-50 flex">
        <Nav />
        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Routes>
              {/* Shaniah */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/dump" element={<BrainDumpPage />} />
              <Route path="/timesheet" element={<TimesheetPage />} />
              <Route path="/meetings" element={<MeetingsPage workspace="shaniah" />} />
              {/* Stacey */}
              <Route path="/stacey.pm" element={<BossDashboardPage />} />
              <Route path="/stacey.pm/tasks" element={<TasksPage workspace="stacey" />} />
              <Route path="/stacey.pm/calendar" element={<CalendarPage calendarEmail="stacey@promotableyou.com.au" />} />
              <Route path="/stacey.pm/ideas" element={<IdeasPage workspace="stacey" />} />
              <Route path="/stacey.pm/dump" element={<BrainDumpPage workspace="stacey" />} />
              <Route path="/stacey.pm/meetings" element={<MeetingsPage workspace="stacey" />} />
              <Route path="/stacey.pm/coaches-calendar" element={<CoachesCalendarPage />} />
              <Route path="/stacey.pm/team-hours" element={<TeamHoursPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
