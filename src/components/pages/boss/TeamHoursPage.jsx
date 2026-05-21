import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react'
import { getTeamMembers, addTeamMember, deleteTeamMember, getTeamHours, upsertTeamHourRow } from '../../../lib/supabase'

function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Returns the start of a fortnightly pay period
function getPayPeriodStart(date = new Date(), anchor = new Date('2025-01-06')) {
  const diff = Math.floor((date - anchor) / (1000 * 60 * 60 * 24 * 14))
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + diff * 14)
  return start
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Generate the 10 weekdays in a fortnight
function getFortnightDays(start) {
  const days = []
  let current = new Date(start)
  while (days.length < 10) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(current))
    current = addDays(current, 1)
  }
  return days
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

const MEMBER_COLORS = [
  '#e5a0a0', '#f5c27a', '#a0c4e5', '#a0e5b0', '#c4a0e5',
  '#e5c4a0', '#a0e5e5', '#e5a0c4', '#b0c4a0', '#d4a0d4',
]

const WORK_TYPES = ['Normal', 'Annual Leave', 'Sick Leave', 'Public Holiday', 'RDO']

// ─── Day cell ─────────────────────────────────────────────────────────────────
function DayCell({ personName, dateISO, data, onChange }) {
  const [open, setOpen] = useState(false)
  const worked = data?.worked || false
  const type = data?.type || 'Normal'
  const isToday = dateISO === localISO()

  async function toggle() {
    await onChange(personName, dateISO, { worked: !worked, type, notes: data?.notes || '' })
  }

  async function changeType(newType) {
    await onChange(personName, dateISO, { worked: true, type: newType, notes: data?.notes || '' })
    setOpen(false)
  }

  const cellColor = worked
    ? type === 'Annual Leave' ? 'bg-blue-100 border-blue-300'
      : type === 'Sick Leave' ? 'bg-amber-100 border-amber-300'
      : type === 'Public Holiday' ? 'bg-purple-100 border-purple-300'
      : type === 'RDO' ? 'bg-emerald-100 border-emerald-300'
      : 'bg-blush-100 border-blush-300'
    : 'bg-white border-sand-200 hover:border-sand-300'

  return (
    <div className="relative">
      <button
        onClick={toggle}
        onContextMenu={e => { e.preventDefault(); setOpen(o => !o) }}
        title={`${worked ? '✓ ' + type : 'Not worked'} — right-click to change type`}
        className={`w-full aspect-square rounded-lg border-2 flex items-center justify-center transition-all text-[10px] font-bold relative ${cellColor} ${
          isToday ? 'ring-2 ring-offset-1 ring-warm-400' : ''
        }`}
      >
        {worked && (
          type === 'Normal' ? <Check className="w-3 h-3 text-blush-500" />
          : type === 'Annual Leave' ? <span className="text-blue-500">AL</span>
          : type === 'Sick Leave' ? <span className="text-amber-500">SL</span>
          : type === 'Public Holiday' ? <span className="text-purple-500">PH</span>
          : type === 'RDO' ? <span className="text-emerald-500">R</span>
          : <Check className="w-3 h-3 text-blush-500" />
        )}
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-sand-200 rounded-xl shadow-lg py-1 min-w-[130px]">
          {WORK_TYPES.map(t => (
            <button
              key={t}
              onClick={() => changeType(t)}
              className={`w-full text-left text-xs px-3 py-1.5 hover:bg-sand-50 transition-colors ${type === t ? 'text-blush-600 font-semibold' : 'text-sand-700'}`}
            >
              {t}
            </button>
          ))}
          <div className="border-t border-sand-100 mt-1 pt-1">
            <button
              onClick={async () => { await onChange(personName, dateISO, { worked: false, type: 'Normal', notes: '' }); setOpen(false) }}
              className="w-full text-left text-xs px-3 py-1.5 text-red-400 hover:bg-red-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeamHoursPage() {
  const [members, setMembers] = useState([])
  const [hoursData, setHoursData] = useState([]) // raw rows from DB
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [periodOffset, setPeriodOffset] = useState(0) // 0 = current, -1 = previous, etc.

  // Compute pay period based on offset
  const TODAY = new Date()
  const baseStart = getPayPeriodStart(TODAY)
  const periodStart = addDays(baseStart, periodOffset * 14)
  const periodEnd = addDays(periodStart, 13)
  const days = getFortnightDays(periodStart)

  const periodStartISO = localISO(periodStart)
  const periodEndISO = localISO(periodEnd)

  useEffect(() => {
    Promise.all([getTeamMembers(), getTeamHours()])
      .then(([m, h]) => { setMembers(m); setHoursData(h) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Build lookup: { "name|date": rowObj }
  const hoursLookup = {}
  hoursData.forEach(row => {
    hoursLookup[`${row.person_name}|${row.date}`] = row
  })

  // Filter hours for current period
  const periodHours = hoursData.filter(h => h.date >= periodStartISO && h.date <= periodEndISO)

  async function handleCellChange(personName, dateISO, fields) {
    try {
      const saved = await upsertTeamHourRow({ person_name: personName, date: dateISO, ...fields })
      setHoursData(prev => {
        const existing = prev.findIndex(r => r.person_name === personName && r.date === dateISO)
        if (existing >= 0) {
          const next = [...prev]
          next[existing] = saved
          return next
        }
        return [...prev, saved]
      })
    } catch (e) { setError(e.message) }
  }

  async function handleAddMember(e) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const color = MEMBER_COLORS[members.length % MEMBER_COLORS.length]
      const saved = await addTeamMember({ name: newName.trim(), color })
      setMembers(prev => [...prev, saved])
      setNewName('')
      setShowAddMember(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteMember(id) {
    if (!window.confirm('Remove this team member? Their hours history will remain.')) return
    try { await deleteTeamMember(id); setMembers(prev => prev.filter(m => m.id !== id)) }
    catch (e) { setError(e.message) }
  }

  // Summary per member for this period
  function memberSummary(memberName) {
    const rows = periodHours.filter(h => h.person_name === memberName && h.worked)
    const byType = {}
    rows.forEach(r => { byType[r.type || 'Normal'] = (byType[r.type || 'Normal'] || 0) + 1 })
    return { total: rows.length, byType }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Team Hours</h1>
          <p className="text-sand-400 text-sm mt-0.5">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddMember(!showAddMember)}
          className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add member form */}
      {showAddMember && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <form onSubmit={handleAddMember} className="flex gap-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Team member name…"
              autoFocus
              className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
            />
            <button type="button" onClick={() => setShowAddMember(false)} className="text-sm text-sand-500 px-3">Cancel</button>
            <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Add</button>
          </form>
        </div>
      )}

      {/* Pay period navigator */}
      <div className="bg-white border border-sand-200 rounded-2xl px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => setPeriodOffset(o => o - 1)}
          className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors text-sand-400 hover:text-sand-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-sand-800">
            {periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <p className="text-xs text-sand-400">
            {periodOffset === 0 ? 'Current pay period' : periodOffset === -1 ? 'Previous pay period' : `${Math.abs(periodOffset)} periods ago`}
          </p>
        </div>
        <button
          onClick={() => setPeriodOffset(o => Math.min(o + 1, 0))}
          disabled={periodOffset === 0}
          className="p-1.5 rounded-lg hover:bg-sand-100 transition-colors text-sand-400 hover:text-sand-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-semibold text-sand-400 uppercase tracking-wide">Legend:</span>
        {[
          { label: 'Normal', color: 'bg-blush-100 border-blush-300 text-blush-500' },
          { label: 'Annual Leave', color: 'bg-blue-100 border-blue-300 text-blue-500' },
          { label: 'Sick Leave', color: 'bg-amber-100 border-amber-300 text-amber-500' },
          { label: 'Public Holiday', color: 'bg-purple-100 border-purple-300 text-purple-500' },
          { label: 'RDO', color: 'bg-emerald-100 border-emerald-300 text-emerald-500' },
        ].map(({ label, color }) => (
          <span key={label} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
        ))}
        <span className="text-[10px] text-sand-400">Right-click a cell to change type</span>
      </div>

      {/* Grid */}
      {members.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">No team members yet — add someone above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {members.map(member => {
            const summary = memberSummary(member.name)

            return (
              <div key={member.id} className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
                {/* Member header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-sand-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: member.color || '#e5a0a0' }}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sand-900 text-sm">{member.name}</p>
                      <p className="text-xs text-sand-400">
                        {summary.total} day{summary.total !== 1 ? 's' : ''} worked
                        {Object.entries(summary.byType).filter(([t]) => t !== 'Normal').map(([t, n]) => ` · ${n} ${t}`)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="text-sand-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Day grid — 2 rows of 5 */}
                <div className="px-5 py-4">
                  {[0, 1].map(week => {
                    const weekDays = days.slice(week * 5, week * 5 + 5)
                    const weekStart = weekDays[0]
                    return (
                      <div key={week} className="mb-3 last:mb-0">
                        <p className="text-[10px] font-semibold text-sand-400 mb-2">
                          Week {week + 1} — {weekStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </p>
                        <div className="grid grid-cols-5 gap-1.5">
                          {weekDays.map((day, i) => {
                            const iso = localISO(day)
                            return (
                              <div key={iso}>
                                <p className="text-[9px] text-center text-sand-400 mb-1">{DAY_LABELS[i]}</p>
                                <DayCell
                                  personName={member.name}
                                  dateISO={iso}
                                  data={hoursLookup[`${member.name}|${iso}`]}
                                  onChange={handleCellChange}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Mini summary bar */}
                <div className="bg-sand-50 border-t border-sand-100 px-5 py-2.5 flex gap-4 flex-wrap">
                  <span className="text-xs text-sand-500">
                    <span className="font-semibold text-sand-800">{summary.total}</span> / 10 days
                  </span>
                  <span className="text-xs text-sand-500">
                    <span className="font-semibold text-sand-800">{summary.total * 7.6}</span> hrs (@ 7.6hr/day)
                  </span>
                  {summary.byType['Annual Leave'] > 0 && (
                    <span className="text-xs text-blue-500">{summary.byType['Annual Leave']} AL</span>
                  )}
                  {summary.byType['Sick Leave'] > 0 && (
                    <span className="text-xs text-amber-500">{summary.byType['Sick Leave']} SL</span>
                  )}
                  {summary.byType['RDO'] > 0 && (
                    <span className="text-xs text-emerald-500">{summary.byType['RDO']} RDO</span>
                  )}
                  {summary.byType['Public Holiday'] > 0 && (
                    <span className="text-xs text-purple-500">{summary.byType['Public Holiday']} PH</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pay summary */}
      {members.length > 0 && (
        <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl p-5 text-white">
          <h3 className="font-semibold mb-3">Pay Period Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-xs opacity-70">Team Members</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-xs opacity-70">Total Days</p>
              <p className="text-2xl font-bold">{periodHours.filter(h => h.worked).length}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-xs opacity-70">Total Hours</p>
              <p className="text-2xl font-bold">{(periodHours.filter(h => h.worked).length * 7.6).toFixed(0)}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-xs opacity-70">Leave Days</p>
              <p className="text-2xl font-bold">{periodHours.filter(h => h.worked && h.type !== 'Normal').length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
