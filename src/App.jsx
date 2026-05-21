import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import TodayPage from './components/pages/TodayPage'
import CalendarPage from './components/pages/CalendarPage'
import IdeasPage from './components/pages/IdeasPage'
import BrainDumpPage from './components/pages/BrainDumpPage'
import TimesheetPage from './components/pages/TimesheetPage'

export default function App() {
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-sand-50 flex">
        <Nav />
        <main className="flex-1 lg:ml-56 pb-20 lg:pb-0">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<TodayPage />} />
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
