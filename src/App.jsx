import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import DashboardPage from './components/pages/DashboardPage'
import TasksPage from './components/pages/TasksPage'
import CalendarPage from './components/pages/CalendarPage'
import IdeasPage from './components/pages/IdeasPage'
import BrainDumpPage from './components/pages/BrainDumpPage'
import TimesheetPage from './components/pages/TimesheetPage'
import BossDashboardPage from './components/pages/boss/BossDashboardPage'
import MeetingsPage from './components/pages/boss/MeetingsPage'
import TeamHoursPage from './components/pages/boss/TeamHoursPage'

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
              {/* Stacey */}
              <Route path="/boss" element={<BossDashboardPage />} />
              <Route path="/boss/tasks" element={<TasksPage workspace="stacey" />} />
              <Route path="/boss/calendar" element={<CalendarPage />} />
              <Route path="/boss/ideas" element={<IdeasPage workspace="stacey" />} />
              <Route path="/boss/dump" element={<BrainDumpPage workspace="stacey" />} />
              <Route path="/boss/meetings" element={<MeetingsPage />} />
              <Route path="/boss/team-hours" element={<TeamHoursPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
