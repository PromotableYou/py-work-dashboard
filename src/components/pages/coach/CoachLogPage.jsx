import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle } from 'lucide-react'
import { getSessionTypes, getCoachLogs, addCoachLog, updateCoachLog, getRosterBlocks } from '../../../lib/supabase'
import { coachBySlug } from '../../../lib/coaches'

const DAY_KEYS   = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_SHORT  = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' }
const DAY_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 }

// ─── Duration helpers ────────────────────────────────────────────────────────
// Convert a {duration, unit} pair to decimal hours
function toHours(duration, unit) {
  const n = parseFloat(duration) || 0
  return unit === 'min' ? n / 60 : n
}
// Format hours as a readable string for storage / display
function fmtDuration(duration, unit) {
  if (!duration) return ''
  return `${duration}${unit}`
}
// Parse an old-style duration string back to {duration, unit}
function parseDurationStr(str) {
  if (!str) return { duration: '', unit: 'min' }
  const s = String(str)
  const minM = s.match(/^([\d.]+)\s*min?$/i)
  const hrM  = s.match(/^([\d.]+)\s*h(?:rs?|ours?)?$/i)
  if (minM) return { duration: minM[1], unit: 'min' }
  if (hrM)  return { duration: hrM[1],  unit: 'hr'  }
  const n = parseFloat(s)
  if (!isNaN(n) && n > 0) return { duration: String(n), unit: 'hr' }
  return { duration: s, unit: 'hr' }
}

// ─── Duration input ──────────────────────────────────────────────────────────
function DurationInput({ duration, unit, onDuration, onUnit, placeholder = '0' }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-sand-300 focus-within:ring-1 focus-within:ring-blush-400 focus-within:border-blush-400 shrink-0">
      <input
        type="number"
        min="0"
        step="1"
        value={duration}
        onChange={e => onDuration(e.target.value)}
        placeholder={placeholder}
        className="w-10 text-xs text-sand-900 placeholder-sand-400 bg-white px-1.5 py-1.5 text-center focus:outline-none"
      />
      <select
        value={unit}
        onChange={e => onUnit(e.target.value)}
        className="text-[10px] font-semibold bg-sand-50 text-sand-600 border-l border-sand-300 px-1 py-1.5 focus:outline-none cursor-pointer"
      >
        <option value="min">min</option>
        <option value="hr">hr</option>
      </select>
    </div>
  )
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function localISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function formatWeek(monday) {
  const fri = addDays(monday, 4)
  return `${monday.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${fri.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// ─── Day defaults ────────────────────────────────────────────────────────────
function emptyClient()    { return { client: '', duration: '', unit: 'min' } }
function emptyAdminTask() { return { task:   '', duration: '', unit: 'min' } }
function emptyDay()       { return { sessions: [], clients: [], adminTasks: [], totalHrs: '', totalUnit: 'hr' } }

export default function CoachLogPage() {
  const { coachName } = useParams()
  const coach = coachBySlug(coachName || '')
  const displayName = coach?.name || null

  const [sessionTypes, setSessionTypes] = useState([])
  const [recentLogs,   setRecentLogs]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [error,        setError]        = useState(null)
  const [openPicker,   setOpenPicker]   = useState(null)

  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart  = addDays(getWeekStart(), weekOffset * 7)
  const weekISO    = localISO(weekStart)
  const isThisWeek = weekOffset === 0

  const dayISO = (day) => localISO(addDays(weekStart, DAY_OFFSET[day]))

  const [dayData, setDayData] = useState(() =>
    Object.fromEntries(DAY_KEYS.map(d => [d, emptyDay()]))
  )

  // ─── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!displayName) { setLoading(false); return }
    Promise.all([getSessionTypes(), getCoachLogs(displayName)])
      .then(([st, logs]) => { setSessionTypes(st); setRecentLogs(logs) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [displayName])

  // ─── Week pre-fill ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!displayName || loading) return

    const newData = Object.fromEntries(DAY_KEYS.map(d => [d, emptyDay()]))
    const weekEnd  = localISO(addDays(weekStart, 4))
    const weekLogs = recentLogs.filter(l => l.date >= weekISO && l.date <= weekEnd)

    weekLogs.forEach(log => {
      const day = DAY_KEYS.find(d => dayISO(d) === log.date)
      if (!day) return

      // Restore clients — handle both new {client, duration, unit} and old {client, duration: "1hr"}
      const clients = (log.private_sessions || []).map(c => {
        if (c.unit) return c                          // already has unit
        const parsed = parseDurationStr(c.duration)
        return { client: c.client || '', ...parsed }
      })

      // Restore admin tasks
      let adminTasks = []
      if (log.admin_sessions?.length) {
        adminTasks = log.admin_sessions.map(t => {
          if (t.unit) return t
          const parsed = parseDurationStr(t.duration)
          return { task: t.task || '', ...parsed }
        })
      } else if (parseFloat(log.admin_hours) > 0) {
        // migrate old single admin_hours + notes
        adminTasks = [{ task: log.notes || 'Admin', ...parseDurationStr(String(log.admin_hours)) }]
      } else if (log.notes?.trim()) {
        adminTasks = [{ task: log.notes.trim(), duration: '', unit: 'min' }]
      }

      // Restore manual total (stored in hours as decimal hrs)
      const savedHrs = parseFloat(log.hours)
      const totalHrs = !isNaN(savedHrs) && savedHrs > 0 ? String(savedHrs) : ''

      newData[day] = { sessions: log.sessions || [], clients, adminTasks, totalHrs, totalUnit: 'hr' }
    })

    // Overlay roster for unlogged days
    getRosterBlocks(weekISO).then(blocks => {
      const mine = blocks.filter(b => b.coach_name === displayName)
      mine.forEach(block => {
        if (!block.day || !block.session_type) return
        const day = block.day
        const alreadyLogged = weekLogs.some(l => l.date === dayISO(day))
        if (!alreadyLogged && newData[day]) {
          if (/admin/i.test(block.session_type)) {
            const already = newData[day].adminTasks.some(t => t.task === block.session_type)
            if (!already) newData[day].adminTasks = [...newData[day].adminTasks, { task: block.session_type, duration: '', unit: 'min' }]
          } else {
            newData[day].sessions = [...new Set([...newData[day].sessions, block.session_type])]
          }
        }
      })
      setDayData({ ...newData })
    }).catch(() => setDayData({ ...newData }))
  }, [weekISO, recentLogs, loading])

  // ─── Day data helpers ─────────────────────────────────────────────────────────
  function addSession(day, name)   { setDayData(p => ({ ...p, [day]: { ...p[day], sessions: [...p[day].sessions, name] } })); setOpenPicker(null) }
  function removeSession(day, name){ setDayData(p => ({ ...p, [day]: { ...p[day], sessions: p[day].sessions.filter(s => s !== name) } })) }

  function addClient(day)   { setDayData(p => ({ ...p, [day]: { ...p[day], clients: [...p[day].clients, emptyClient()] } })) }
  function updateClient(day, idx, field, val) {
    setDayData(p => ({ ...p, [day]: { ...p[day], clients: p[day].clients.map((c, i) => i === idx ? { ...c, [field]: val } : c) } }))
  }
  function removeClient(day, idx) { setDayData(p => ({ ...p, [day]: { ...p[day], clients: p[day].clients.filter((_, i) => i !== idx) } })) }

  function addAdminTask(day)   { setDayData(p => ({ ...p, [day]: { ...p[day], adminTasks: [...p[day].adminTasks, emptyAdminTask()] } })) }
  function updateAdminTask(day, idx, field, val) {
    setDayData(p => ({ ...p, [day]: { ...p[day], adminTasks: p[day].adminTasks.map((t, i) => i === idx ? { ...t, [field]: val } : t) } }))
  }
  function removeAdminTask(day, idx) { setDayData(p => ({ ...p, [day]: { ...p[day], adminTasks: p[day].adminTasks.filter((_, i) => i !== idx) } })) }

  // ─── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      for (const day of DAY_KEYS) {
        const d          = dayData[day]
        const validClients = d.clients.filter(c => c.client.trim())
        const validAdmin   = d.adminTasks.filter(t => t.task.trim())
        const clientH    = validClients.reduce((s, c) => s + toHours(c.duration, c.unit || 'min'), 0)
        const adminH     = validAdmin.reduce(  (s, t) => s + toHours(t.duration, t.unit || 'min'), 0)
        const autoH      = clientH + adminH
        const manualH    = toHours(d.totalHrs, d.totalUnit || 'hr')
        const totalH     = manualH > 0 ? manualH : autoH   // manual overrides auto
        // coaching = everything that isn't admin (group sessions + 1:1 all count as coaching)
        const coachingH  = Math.max(0, totalH - adminH)

        const hasAnything = totalH > 0 || d.sessions.length > 0 || validClients.length > 0 || validAdmin.length > 0
        if (!hasAnything) continue

        const iso = dayISO(day)
        const payload = {
          coach_name:      displayName,
          date:            iso,
          coaching_hours:  coachingH,                 // total minus admin = all coaching time
          admin_hours:     adminH,
          hours:           totalH,
          sessions:        d.sessions,
          private_sessions: validClients.map(c => ({
            client:   c.client,
            duration: fmtDuration(c.duration, c.unit || 'min'),
            unit:     c.unit || 'min',
            hours:    toHours(c.duration, c.unit || 'min'),
          })),
          admin_sessions: validAdmin.map(t => ({
            task:     t.task,
            duration: fmtDuration(t.duration, t.unit || 'min'),
            unit:     t.unit || 'min',
            hours:    toHours(t.duration, t.unit || 'min'),
          })),
          notes: validAdmin.map(t => `${t.task}${t.duration ? ` (${fmtDuration(t.duration, t.unit || 'min')})` : ''}`).join(', '),
        }

        const existing = recentLogs.find(l => l.date === iso && l.coach_name === displayName)
        if (existing) await updateCoachLog(existing.id, payload)
        else          await addCoachLog(payload)
      }
      setSubmitted(true)
      const logs = await getCoachLogs(displayName)
      setRecentLogs(logs)
      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const weekEnd   = localISO(addDays(weekStart, 4))
  const loggedDays = new Set(
    recentLogs.filter(l => l.date >= weekISO && l.date <= weekEnd).map(l => l.date)
  )

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-sand-50">
      <div className="w-5 h-5 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!displayName) return (
    <div className="min-h-screen bg-sand-50 flex items-center justify-center">
      <div className="text-center"><p className="text-2xl mb-2">🤔</p><p className="text-sand-500">This link doesn't exist.</p></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand-50" onClick={() => setOpenPicker(null)}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-sand-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blush-400 flex items-center justify-center text-white font-bold text-sm">
            {displayName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sand-900 leading-none">{displayName}</p>
            <p className="text-xs text-sand-400 mt-0.5">Promotable You · Weekly Hours</p>
          </div>
        </div>

        {/* Week picker */}
        <div className="flex items-center gap-2 bg-sand-50 border border-sand-200 rounded-xl px-3 py-2">
          <button type="button" onClick={() => setWeekOffset(o => o - 1)} className="p-1 rounded hover:bg-sand-200 text-sand-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[220px]">
            <p className="text-sm font-semibold text-sand-900">{formatWeek(weekStart)}</p>
            <p className="text-xs text-sand-400">
              {isThisWeek ? 'Current week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
              {loggedDays.size > 0 && <span className="text-emerald-500 font-medium"> · {loggedDays.size} day{loggedDays.size !== 1 ? 's' : ''} logged</span>}
            </p>
          </div>
          <button type="button" onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={isThisWeek}
            className="p-1 rounded hover:bg-sand-200 text-sand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {submitted && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Saved!
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={handleSubmit} disabled={submitting}
            className="bg-blush-500 hover:bg-blush-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm">
            {submitting ? 'Saving…' : 'Save Week'}
          </button>
        </div>
      </div>

      {/* ── Day columns ── */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-5 gap-4">
          {DAY_KEYS.map(day => {
            const iso  = dayISO(day)
            const date = new Date(iso + 'T12:00:00')
            const isToday  = iso === localISO(new Date())
            const d        = dayData[day]
            const availableSessions = sessionTypes.filter(st => !d.sessions.includes(st.name))

            // Live day totals
            const clientH  = d.clients.reduce(   (s, c) => s + toHours(c.duration, c.unit || 'min'), 0)
            const adminH   = d.adminTasks.reduce( (s, t) => s + toHours(t.duration, t.unit || 'min'), 0)
            const autoTotal  = clientH + adminH
            const manualTotal = toHours(d.totalHrs, d.totalUnit || 'hr')
            const dayTotal  = manualTotal > 0 ? manualTotal : autoTotal

            return (
              <div key={day} className={`bg-white border rounded-2xl flex flex-col overflow-hidden ${isToday ? 'border-blush-300 ring-2 ring-blush-100' : 'border-sand-200'}`}>

                {/* Day header */}
                <div className={`px-4 py-3 border-b ${isToday ? 'bg-blush-50 border-blush-100' : 'bg-sand-50 border-sand-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-bold ${isToday ? 'text-blush-600' : 'text-sand-800'}`}>{DAY_SHORT[day]}</p>
                      <p className="text-xs text-sand-400">{date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {dayTotal > 0 && (
                        <span className="text-xs font-bold text-sand-700">{dayTotal.toFixed(1)}h</span>
                      )}
                      {(() => {
                        const log = recentLogs.find(l => l.date === iso)
                        if (!log) return null
                        return log.approved
                          ? <span className="text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">✓</span>
                          : <span className="text-amber-500 text-xs font-semibold">saved</span>
                      })()}
                    </div>
                  </div>
                </div>

                <div className="p-3 flex flex-col gap-3 flex-1">

                  {/* Sessions */}
                  <div>
                    <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide mb-1.5">Sessions run</p>
                    <div className="flex flex-wrap gap-1 min-h-[24px]">
                      {d.sessions.length === 0 && (
                        <p className="text-xs text-sand-400 italic">None yet</p>
                      )}
                      {d.sessions.map(name => {
                        const st = sessionTypes.find(s => s.name === name)
                        return (
                          <span key={name}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg leading-none border border-black/10"
                            style={{ backgroundColor: st?.color || '#e5e7eb', color: '#1a1a1a' }}>
                            {name}
                            <button type="button" onClick={() => removeSession(day, name)} className="opacity-60 hover:opacity-100 transition-opacity ml-0.5">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                    {availableSessions.length > 0 && (
                      <div className="relative mt-1.5" onClick={e => e.stopPropagation()}>
                        <button type="button"
                          onClick={() => setOpenPicker(openPicker === day ? null : day)}
                          className="flex items-center gap-1 text-xs text-blush-600 hover:text-blush-700 font-semibold border border-blush-200 bg-blush-50 hover:bg-blush-100 px-2 py-1 rounded-lg transition-colors">
                          <Plus className="w-3 h-3" /> Add session
                        </button>
                        {openPicker === day && (
                          <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-sand-300 rounded-xl shadow-lg py-1 min-w-[190px] max-h-52 overflow-y-auto">
                            {availableSessions.map(st => (
                              <button key={st.id} type="button" onClick={() => addSession(day, st.name)}
                                className="w-full text-left text-xs px-3 py-2 hover:bg-sand-50 transition-colors flex items-center gap-2 text-sand-800 font-medium">
                                <span className="w-3 h-3 rounded shrink-0 border border-black/10" style={{ backgroundColor: st.color || '#e5e7eb' }} />
                                {st.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1:1 Clients */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide">1:1 Clients</p>
                      <button type="button" onClick={() => addClient(day)} className="text-xs text-blush-600 hover:text-blush-700 font-semibold flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {d.clients.length === 0 ? (
                      <button type="button" onClick={() => addClient(day)}
                        className="text-xs text-sand-500 hover:text-blush-600 font-medium border border-dashed border-sand-300 hover:border-blush-300 rounded-lg px-2 py-1.5 w-full text-center transition-colors">
                        + Add client
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {d.clients.map((c, idx) => (
                          <div key={idx} className="flex gap-1 items-center">
                            <input type="text" value={c.client}
                              onChange={e => updateClient(day, idx, 'client', e.target.value)}
                              placeholder="Client name"
                              className="flex-1 text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none min-w-0" />
                            <DurationInput
                              duration={c.duration} unit={c.unit || 'min'}
                              onDuration={v => updateClient(day, idx, 'duration', v)}
                              onUnit={v     => updateClient(day, idx, 'unit',     v)}
                            />
                            <button type="button" onClick={() => removeClient(day, idx)} className="text-sand-400 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {clientH > 0 && (
                          <p className="text-[10px] text-sand-400 text-right pr-7">= {clientH.toFixed(2)}h total</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin / Other */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide">Admin / Other</p>
                      <button type="button" onClick={() => addAdminTask(day)} className="text-xs text-blush-600 hover:text-blush-700 font-semibold flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {d.adminTasks.length === 0 ? (
                      <button type="button" onClick={() => addAdminTask(day)}
                        className="text-xs text-sand-500 hover:text-blush-600 font-medium border border-dashed border-sand-300 hover:border-blush-300 rounded-lg px-2 py-1.5 w-full text-center transition-colors">
                        + Log admin work
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        {d.adminTasks.map((t, idx) => (
                          <div key={idx} className="flex gap-1 items-center">
                            <input type="text" value={t.task}
                              onChange={e => updateAdminTask(day, idx, 'task', e.target.value)}
                              placeholder="What did you work on?"
                              className="flex-1 text-xs bg-white border border-sand-300 rounded-lg px-2 py-1.5 text-sand-900 placeholder-sand-400 focus:ring-1 focus:ring-blush-400 focus:border-blush-400 focus:outline-none min-w-0" />
                            <DurationInput
                              duration={t.duration} unit={t.unit || 'min'}
                              onDuration={v => updateAdminTask(day, idx, 'duration', v)}
                              onUnit={v     => updateAdminTask(day, idx, 'unit',     v)}
                            />
                            <button type="button" onClick={() => removeAdminTask(day, idx)} className="text-sand-400 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {adminH > 0 && (
                          <p className="text-[10px] text-sand-400 text-right pr-7">= {adminH.toFixed(2)}h total</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Editable total hours */}
                  <div className="mt-auto pt-2.5 border-t border-sand-100">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-sand-600 uppercase tracking-wide">Total hrs worked</p>
                        {autoTotal > 0 && (
                          <p className="text-[10px] text-sand-400 mt-0.5">
                            auto: {autoTotal.toFixed(2)}h
                            {manualTotal > 0 && manualTotal !== autoTotal && (
                              <button type="button"
                                onClick={() => setDayData(p => ({ ...p, [day]: { ...p[day], totalHrs: String(autoTotal.toFixed(2)), totalUnit: 'hr' } }))}
                                className="ml-1 underline hover:text-blush-500 transition-colors">use</button>
                            )}
                          </p>
                        )}
                      </div>
                      <DurationInput
                        duration={d.totalHrs}
                        unit={d.totalUnit || 'hr'}
                        onDuration={v => setDayData(p => ({ ...p, [day]: { ...p[day], totalHrs: v } }))}
                        onUnit={v     => setDayData(p => ({ ...p, [day]: { ...p[day], totalUnit: v } }))}
                        placeholder={autoTotal > 0 ? autoTotal.toFixed(1) : '0'}
                      />
                    </div>
                    {dayTotal > 0 && (
                      <p className="text-right text-xs font-bold text-sand-900 mt-1">= {dayTotal.toFixed(2)}h</p>
                    )}
                  </div>

                </div>
              </div>
            )
          })}
        </div>

        {/* ── Weekly total ── */}
        {(() => {
          const totAll = DAY_KEYS.reduce((s, d) => {
            const adminH = dayData[d].adminTasks.reduce((a, t) => a + toHours(t.duration, t.unit || 'min'), 0)
            const autoH  = dayData[d].clients.reduce(  (a, c) => a + toHours(c.duration, c.unit || 'min'), 0) + adminH
            const manual = toHours(dayData[d].totalHrs, dayData[d].totalUnit || 'hr')
            return s + (manual > 0 ? manual : autoH)
          }, 0)
          const totAdmin = DAY_KEYS.reduce((s, d) =>
            s + dayData[d].adminTasks.reduce((a, t) => a + toHours(t.duration, t.unit || 'min'), 0), 0)
          // coaching = everything that isn't admin (same formula used when saving)
          const totCoaching = Math.max(0, totAll - totAdmin)
          if (!totAll) return null
          return (
            <div className="mt-4 flex justify-end">
              <div className="bg-white border border-sand-200 rounded-xl px-5 py-3 flex items-center gap-5">
                {totCoaching > 0 && (
                  <>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-blush-400 uppercase tracking-wide">Coaching</p>
                      <p className="text-lg font-bold text-blush-500">{totCoaching.toFixed(1)}h</p>
                    </div>
                    <div className="w-px h-8 bg-sand-200" />
                  </>
                )}
                {totAdmin > 0 && (
                  <>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-sand-400 uppercase tracking-wide">Admin</p>
                      <p className="text-lg font-bold text-sand-600">{totAdmin.toFixed(1)}h</p>
                    </div>
                    <div className="w-px h-8 bg-sand-200" />
                  </>
                )}
                <div className="text-center">
                  <p className="text-[10px] font-bold text-sand-400 uppercase tracking-wide">Total</p>
                  <p className="text-lg font-bold text-sand-900">{totAll.toFixed(1)}h</p>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
