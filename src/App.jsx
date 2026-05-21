import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import DashboardPage from './components/pages/DashboardPage'
import TasksPage from './components/pages/TasksPage'
import CalendarPage from './components/pages/CalendarPage'
import IdeasPage from './components/pages/IdeasPage'
import BrainDumpPage from './components/pages/BrainDumpPage'
import TimesheetPage from './components/pages/TimesheetPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-sand-50 flex">
        <Nav />
        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/dump" element={<BrainDumpPage />} />
              <Route path="/timesheet" element={<TimesheetPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  )
}
