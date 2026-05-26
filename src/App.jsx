import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import DashboardPage from './components/pages/DashboardPage'
import TasksPage from './components/pages/TasksPage'
import CalendarPage from './components/pages/CalendarPage'
import IdeasPage from './components/pages/IdeasPage'
import BrainDumpPage from './components/pages/BrainDumpPage'
import TimesheetPage from './components/pages/TimesheetPage'
import NotesPage from './components/pages/NotesPage'
import BossDashboardPage from './components/pages/boss/BossDashboardPage'
import MeetingsPage from './components/pages/boss/MeetingsPage'
import TeamHoursPage from './components/pages/boss/TeamHoursPage'
import CoachesCalendarPage from './components/pages/boss/CoachesCalendarPage'
import RosterPage from './components/pages/boss/RosterPage'
import CoachLogPage from './components/pages/coach/CoachLogPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public coach log — no nav, coaches bookmark this */}
        <Route path="/log/:coachName" element={<CoachLogPage />} />

        {/* Main app with sidebar nav */}
        <Route path="*" element={
          <div className="min-h-screen bg-sand-50 flex">
            <Nav />
            <main className="flex-1 lg:ml-56 pb-20 lg:pb-0 print:ml-0 print:pb-0">
              <div className="max-w-6xl mx-auto px-4 py-6 print:max-w-full print:px-0 print:py-0">
                <Routes>
                  {/* Shaniah */}
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/ideas" element={<IdeasPage />} />
                  <Route path="/dump" element={<BrainDumpPage />} />
                  <Route path="/timesheet" element={<TimesheetPage />} />
                  <Route path="/meetings" element={<MeetingsPage workspace="shaniah" />} />
                  <Route path="/notes" element={<NotesPage workspace="shaniah" />} />
                  <Route path="/roster" element={<RosterPage />} />
                  <Route path="/coaches-calendar" element={<CoachesCalendarPage />} />
                  {/* Stacey */}
                  <Route path="/stacey" element={<BossDashboardPage />} />
                  <Route path="/stacey/tasks" element={<TasksPage workspace="stacey" />} />
                  <Route path="/stacey/calendar" element={<CalendarPage calendarEmail="stacey@promotableyou.com.au" />} />
                  <Route path="/stacey/ideas" element={<IdeasPage workspace="stacey" />} />
                  <Route path="/stacey/dump" element={<BrainDumpPage workspace="stacey" />} />
                  <Route path="/stacey/meetings" element={<MeetingsPage workspace="stacey" />} />
                  <Route path="/stacey/notes" element={<NotesPage workspace="stacey" />} />
                  <Route path="/stacey/coaches-calendar" element={<CoachesCalendarPage />} />
                  <Route path="/stacey/roster" element={<RosterPage readOnly />} />
                  <Route path="/stacey/team-hours" element={<TeamHoursPage />} />
                </Routes>
              </div>
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
