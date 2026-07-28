import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import DashboardPage from './components/pages/DashboardPage'
import TasksPage from './components/pages/TasksPage'
import CalendarPage from './components/pages/CalendarPage'
import IdeasPage from './components/pages/IdeasPage'
import BrainDumpPage from './components/pages/BrainDumpPage'
import TimesheetPage from './components/pages/TimesheetPage'
import NotesPage from './components/pages/NotesPage'
import KeyPrioritiesPage from './components/pages/KeyPrioritiesPage'
import MarketingCalendarPage from './components/pages/MarketingCalendarPage'
import SalesPage from './components/pages/SalesPage'
import BossDashboardPage from './components/pages/boss/BossDashboardPage'
import MeetingsPage from './components/pages/boss/MeetingsPage'
import TeamHoursPage from './components/pages/boss/TeamHoursPage'
import CoachesCalendarPage from './components/pages/boss/CoachesCalendarPage'
import RosterPage from './components/pages/boss/RosterPage'
import { useParams } from 'react-router-dom'
import CoachLogPage from './components/pages/coach/CoachLogPage'
import SimpleCoachLogPage from './components/pages/coach/SimpleCoachLogPage'
import SessionsPage from './components/pages/coach/SessionsPage'
import { coachBySlug } from './lib/coaches'

// Dispatch to the right form based on coach slug
function CoachLogDispatch() {
  const { coachName } = useParams()
  const coach = coachBySlug(coachName || '')
  if (['tanya', 'tanaz'].includes(coach?.slug)) return <SimpleCoachLogPage />
  return <CoachLogPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public coach log — no nav, coaches bookmark this */}
        <Route path="/log/:coachName" element={<CoachLogDispatch />} />

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
                  <Route path="/priorities" element={<KeyPrioritiesPage workspace="shaniah" />} />
                  <Route path="/marketing" element={<MarketingCalendarPage />} />
                  <Route path="/sales" element={<SalesPage workspace="shaniah" />} />
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
                  <Route path="/stacey/priorities" element={<KeyPrioritiesPage workspace="stacey" />} />
                  <Route path="/stacey/marketing" element={<MarketingCalendarPage />} />
                  <Route path="/stacey/sales" element={<SalesPage workspace="stacey" />} />
                  {/* Em */}
                  <Route path="/em" element={<DashboardPage workspace="em" />} />
                  <Route path="/em/tasks" element={<TasksPage workspace="em" />} />
                  <Route path="/em/calendar" element={<CalendarPage calendarEmail="em@promotableyou.com.au" />} />
                  <Route path="/em/meetings" element={<MeetingsPage workspace="em" />} />
                  <Route path="/em/coaches-calendar" element={<CoachesCalendarPage />} />
                  <Route path="/em/roster" element={<RosterPage />} />
                  <Route path="/em/notes" element={<NotesPage workspace="em" />} />
                  <Route path="/em/ideas" element={<IdeasPage workspace="em" />} />
                  <Route path="/em/dump" element={<BrainDumpPage workspace="em" />} />
                  <Route path="/em/priorities" element={<KeyPrioritiesPage workspace="em" />} />
                  <Route path="/em/marketing" element={<MarketingCalendarPage />} />
                  <Route path="/em/sales" element={<SalesPage workspace="em" />} />
                  {/* William */}
                  <Route path="/william" element={<DashboardPage workspace="william" />} />
                  <Route path="/william/tasks" element={<TasksPage workspace="william" />} />
                  <Route path="/william/calendar" element={<CalendarPage calendarEmail="william@promotableyou.com.au" />} />
                  <Route path="/william/meetings" element={<MeetingsPage workspace="william" />} />
                  <Route path="/william/coaches-calendar" element={<CoachesCalendarPage />} />
                  <Route path="/william/roster" element={<RosterPage />} />
                  <Route path="/william/notes" element={<NotesPage workspace="william" />} />
                  <Route path="/william/ideas" element={<IdeasPage workspace="william" />} />
                  <Route path="/william/dump" element={<BrainDumpPage workspace="william" />} />
                  <Route path="/william/priorities" element={<KeyPrioritiesPage workspace="william" />} />
                  <Route path="/william/marketing" element={<MarketingCalendarPage />} />
                  <Route path="/william/sales" element={<SalesPage workspace="william" />} />
                  {/* Tanya */}
                  <Route path="/tanya" element={<DashboardPage workspace="tanya" />} />
                  <Route path="/tanya/tasks" element={<TasksPage workspace="tanya" />} />
                  <Route path="/tanya/calendar" element={<CalendarPage calendarEmail="tanya@promotableyou.com.au" />} />
                  <Route path="/tanya/sessions" element={<SessionsPage workspace="tanya" />} />
                  <Route path="/tanya/roster" element={<RosterPage readOnly />} />
                  <Route path="/tanya/notes" element={<NotesPage workspace="tanya" />} />
                  <Route path="/tanya/ideas" element={<IdeasPage workspace="tanya" />} />
                  <Route path="/tanya/dump" element={<BrainDumpPage workspace="tanya" />} />
                  <Route path="/tanya/timesheet" element={<SimpleCoachLogPage coachSlug="tanya-log" />} />
                  <Route path="/tanya/priorities" element={<KeyPrioritiesPage workspace="tanya" />} />
                  {/* Tanaz */}
                  <Route path="/tanaz" element={<DashboardPage workspace="tanaz" />} />
                  <Route path="/tanaz/tasks" element={<TasksPage workspace="tanaz" />} />
                  <Route path="/tanaz/calendar" element={<CalendarPage calendarEmail="tanaz@promotableyou.com.au" />} />
                  <Route path="/tanaz/sessions" element={<SessionsPage workspace="tanaz" />} />
                  <Route path="/tanaz/roster" element={<RosterPage readOnly />} />
                  <Route path="/tanaz/notes" element={<NotesPage workspace="tanaz" />} />
                  <Route path="/tanaz/ideas" element={<IdeasPage workspace="tanaz" />} />
                  <Route path="/tanaz/dump" element={<BrainDumpPage workspace="tanaz" />} />
                  <Route path="/tanaz/timesheet" element={<SimpleCoachLogPage coachSlug="tanaz-log" />} />
                  <Route path="/tanaz/priorities" element={<KeyPrioritiesPage workspace="tanaz" />} />
                </Routes>
              </div>
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
