import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, Users, ChevronLeft, ChevronRight, AlertCircle, Download } from 'lucide-react'
import { getTeamMembers, addTeamMember, deleteTeamMember, getTeamHours, upsertTeamHourRow } from '../../../lib/supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getPayPeriodStart(date = new Date(), anchor = new Date('2025-01-06')) {
  const diff = Math.floor((date - anchor) / (1000 * 60 * 60 * 24 * 14))
  const start = new Date(anchor)
  start.setDate(anchor.getDate() + diff * 14)
  return start
}

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

const MEMBER_COLORS = [
  '#e5a0a0', '#f5c27a', '#a0c4e5', '#a0e5b0', '#c4a0e5',
  '#e5c4a0', '#a0e5e5', '#e5a0c4', '#b0d4a0', '#d4a0d4',
]

const LEAVE_TYPES = ['Normal', 'Annual Leave', 'Sick Leave', 'Public Holiday', 'RDO', 'Unpaid']

const LEAVE_STYLE = {
  'Annual Leave':   'bg-blue-100 text-blue-600 border-blue-200',
  'Sick Leave':     'bg-amber-100 text-amber-600 border-amber-200',
  'Public Holiday': 'bg-purple-100 text-purple-600 border-purple-200',
  'RDO':            'bg-emerald-100 text-emerald-600 border-emerald-200',
  'Unpaid':         'bg-sand-100 text-sand-500 border-sand-200',
}

const TODAY = localISO()

// ─── Hour input cell ──────────────────────────────────────────────────────────
function HourCell({ memberName, dateISO, value, leaveType, onChange }) {
  const [localVal, setLocalVal] = useState(value === 0 ? '' : String(value))
  const [showType, setShowType] = useState(false)
  const isToday = dateISO === TODAY
  const isLeave = leaveType && leaveType !== 'Normal'

  useEffect(() => {
    setLocalVal(value === 0 ? '' : String(value))
  }, [value, dateISO])

  function handleChange(e) {
    const raw = e.target.value
    if (raw === '' || /^\d*\.?\d?$/.test(raw)) setLocalVal(raw)
  }

  function handleBlur() {
    const num = parseFloat(localVal) || 0
    setLocalVal(num === 0 ? '' : String(num))
    if (num !== value) onChange(memberName, dateISO, { hours: num, worked: num > 0, type: leaveType || 'Normal' })
  }

  function handleTypeChange(type) {
    setShowType(false)
    // If marking as leave, default to 7.6h if currently 0
    const hrs = value > 0 ? value : (type !== 'Normal' ? 7.6 : 0)
    setLocalVal(hrs === 0 ? '' : String(hrs))
    onChange(memberName, dateISO, { hours: hrs, worked: hrs > 0 || type !== 'Normal', type })
  }

  return (
    <td className={`px-1 py-1.5 text-center relative ${isToday ? 'bg-blush-50' : ''}`}>
      <div className="flex flex-col items-center gap-0.5">
        <input
          type="text"
          inputMode="decimal"
          value={localVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && e.target.blur()}
          placeholder="–"
          className={`w-11 text-center text-sm rounded-lg border py-1 focus:outline-none focus:ring-2 focus:ring-blush-300 transition-colors ${
            isLeave
              ? `${LEAVE_STYLE[leaveType]} font-semibold`
              : parseFloat(localVal) > 0
              ? 'bg-blush-50 border-blush-200 text-blush-700 font-semibold'
              : 'bg-white border-sand-200 text-sand-300 placeholder-sand-200'
          } ${isToday ? 'ring-1 ring-warm-300' : ''}`}
        />
        {/* Leave type badge — click to change */}
        <button
          onClick={() => setShowType(s => !s)}
          className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full border leading-tight transition-colors ${
            isLeave ? LEAVE_STYLE[leaveType] : 'text-sand-300 border-sand-100 hover:border-sand-300 hover:text-sand-500'
          }`}
        >
          {isLeave ? leaveType.split(' ')[0] : 'type'}
        </button>
      </div>

      {/* Type dropdown */}
      {showType && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-sand-200 rounded-xl shadow-lg py-1 min-w-[120px]">
          {LEAVE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`w-full text-left text-xs px-3 py-1.5 hover:bg-sand-50 transition-colors ${(leaveType || 'Normal') === t ? 'text-blush-600 font-semibold' : 'text-sand-700'}`}
            >
              {t}
            </button>
          ))}
          {(value > 0 || isLeave) && (
            <>
              <div className="border-t border-sand-100 my-1" />
              <button
                onClick={() => { setShowType(false); setLocalVal(''); onChange(memberName, dateISO, { hours: 0, worked: false, type: 'Normal' }) }}
                className="w-full text-left text-xs px-3 py-1.5 text-red-400 hover:bg-red-50"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TeamHoursPage() {
  const [members, setMembers] = useState([])
  const [hoursData, setHoursData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [periodOffset, setPeriodOffset] = useState(0)

  const TODAY_DATE = new Date()
  const baseStart = getPayPeriodStart(TODAY_DATE)
  const periodStart = addDays(baseStart, periodOffset * 14)
  const periodEnd = addDays(periodStart, 13)
  const days = getFortnightDays(periodStart)
  const week1 = days.slice(0, 5)
  const week2 = days.slice(5, 10)

  useEffect(() => {
    Promise.all([getTeamMembers(), getTeamHours()])
      .then(([m, h]) => { setMembers(m); setHoursData(h) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Lookup: "name|date" → row
  const lookup = {}
  hoursData.forEach(r => { lookup[`${r.person_name}|${r.date}`] = r })

  const getRow = (name, dateISO) => lookup[`${name}|${dateISO}`] || { hours: 0, worked: false, type: 'Normal' }
  const getHours = (name, dateISO) => parseFloat(getRow(name, dateISO).hours) || 0
  const getType = (name, dateISO) => getRow(name, dateISO).type || 'Normal'

  const handleCellChange = useCallback(async (memberName, dateISO, fields) => {
    try {
      const saved = await upsertTeamHourRow({ person_name: memberName, date: dateISO, ...fields })
      setHoursData(prev => {
        const idx = prev.findIndex(r => r.person_name === memberName && r.date === dateISO)
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
        return [...prev, saved]
      })
    } catch (e) { setError(e.message) }
  }, [])

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

  // Totals
  const memberTotal = (name) => days.reduce((s, d) => s + getHours(name, localISO(d)), 0)
  const memberWeekTotal = (name, wkDays) => wkDays.reduce((s, d) => s + getHours(name, localISO(d)), 0)
  const dayTotal = (iso) => members.reduce((s, m) => s + getHours(m.name, iso), 0)
  const grandTotal = () => members.reduce((s, m) => s + memberTotal(m.name), 0)
  const fmt = (n) => n === 0 ? '–' : n % 1 === 0 ? String(n) : n.toFixed(1)
  const fmtNum = (n) => n === 0 ? '0' : n % 1 === 0 ? String(n) : n.toFixed(1)

  function exportCSV() {
    const periodLabel = `${periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${periodEnd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`

    const leaveTypes = ['Annual Leave', 'Sick Leave', 'Public Holiday', 'RDO', 'Unpaid']
    const headers = ['Name', 'Week 1 Hours', 'Week 2 Hours', 'Total Hours', ...leaveTypes]

    const rows = members.map(m => {
      const leave = leaveSummary(m.name)
      return [
        m.name,
        fmtNum(memberWeekTotal(m.name, week1)),
        fmtNum(memberWeekTotal(m.name, week2)),
        fmtNum(memberTotal(m.name)),
        ...leaveTypes.map(t => leave[t] ? `${leave[t]}d` : ''),
      ]
    })

    // Daily breakdown rows
    const dayHeaders = ['', ...days.map(d => d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }))]
    const dayRows = members.map(m => [m.name, ...days.map(d => fmtNum(getHours(m.name, localISO(d))))])

    const csv = [
      [`Pay Period: ${periodLabel}`],
      [],
      ['SUMMARY'],
      headers,
      ...rows,
      [],
      ['DAILY BREAKDOWN'],
      dayHeaders,
      ...dayRows,
    ].map(r => r.map(v => `"${v}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-hours-${periodStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Leave summary per member
  function leaveSummary(name) {
    const periodStartISO = localISO(periodStart)
    const periodEndISO = localISO(periodEnd)
    const rows = hoursData.filter(r => r.person_name === name && r.date >= periodStartISO && r.date <= periodEndISO && r.type && r.type !== 'Normal')
    const byType = {}
    rows.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1 })
    return byType
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Team Hours</h1>
          <p className="text-sand-400 text-sm mt-0.5">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {members.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-white border border-sand-200 hover:border-sand-400 text-sand-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Member
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add member */}
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
        <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-sand-100 text-sand-400 hover:text-sand-700 transition-colors">
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
        <button onClick={() => setPeriodOffset(o => Math.min(o + 1, 0))} disabled={periodOffset === 0} className="p-1.5 rounded-lg hover:bg-sand-100 text-sand-400 hover:text-sand-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-sand-400">Enter hours per day. Click <span className="font-semibold">type</span> under any cell to mark leave, RDO or public holidays.</p>

      {members.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">No team members yet — add someone above</p>
        </div>
      ) : (
        <>
          {[{ label: 'Week 1', weekDays: week1 }, { label: 'Week 2', weekDays: week2 }].map(({ label, weekDays }) => (
            <div key={label} className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-sand-100 flex items-center justify-between">
                <p className="text-xs font-bold text-blush-500 uppercase tracking-widest">{label}</p>
                <p className="text-xs text-sand-400">
                  {weekDays[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – {weekDays[4].toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sand-100">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-sand-500 w-36">Member</th>
                      {weekDays.map(d => {
                        const iso = localISO(d)
                        const isToday = iso === TODAY
                        return (
                          <th key={iso} className={`px-1 py-2.5 text-center text-xs font-semibold w-16 ${isToday ? 'text-blush-500' : 'text-sand-500'}`}>
                            <div>{d.toLocaleDateString('en-AU', { weekday: 'short' })}</div>
                            <div className={`text-[10px] font-normal ${isToday ? 'text-blush-400' : 'text-sand-400'}`}>
                              {d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                            </div>
                          </th>
                        )
                      })}
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-sand-500 w-16">Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, i) => {
                      const weekTotal = memberWeekTotal(member.name, weekDays)
                      return (
                        <tr key={member.id} className={`border-b border-sand-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/40'}`}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2 group">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: member.color || '#e5a0a0' }}>
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-sand-800 truncate max-w-[80px]">{member.name}</span>
                              <button onClick={() => handleDeleteMember(member.id)}
                                className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all ml-auto">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          {weekDays.map(d => {
                            const iso = localISO(d)
                            return (
                              <HourCell
                                key={iso}
                                memberName={member.name}
                                dateISO={iso}
                                value={getHours(member.name, iso)}
                                leaveType={getType(member.name, iso)}
                                onChange={handleCellChange}
                              />
                            )
                          })}
                          <td className="px-3 py-2 text-center">
                            <span className={`text-sm font-bold ${weekTotal > 0 ? 'text-blush-600' : 'text-sand-300'}`}>
                              {fmt(weekTotal)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}

                    {/* Day totals */}
                    <tr className="bg-sand-50 border-t-2 border-sand-200">
                      <td className="px-4 py-2 text-xs font-bold text-sand-500 uppercase tracking-wide">Total</td>
                      {weekDays.map(d => {
                        const iso = localISO(d)
                        const total = dayTotal(iso)
                        return (
                          <td key={iso} className="px-1 py-2 text-center">
                            <span className={`text-xs font-bold ${total > 0 ? 'text-sand-700' : 'text-sand-300'}`}>{fmt(total)}</span>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-center">
                        <span className="text-xs font-bold text-sand-700">
                          {fmt(weekDays.reduce((s, d) => s + dayTotal(localISO(d)), 0))}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Payroll summary table */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-sand-100">
              <h3 className="font-semibold text-sand-900 text-sm">Payroll Summary</h3>
              <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-blush-500 hover:text-blush-600 font-medium">
                <Download className="w-3 h-3" /> Download CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sand-100 bg-sand-50">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-sand-500">Name</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-sand-500">Wk 1</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-sand-500">Wk 2</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-sand-500">Total hrs</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-blue-400">AL</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-amber-400">SL</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-purple-400">PH</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-400">RDO</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, i) => {
                    const leave = leaveSummary(member.name)
                    const total = memberTotal(member.name)
                    return (
                      <tr key={member.id} className={`border-b border-sand-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-sand-50/40'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: member.color || '#e5a0a0' }}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-sand-800">{member.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-sand-700">{fmtNum(memberWeekTotal(member.name, week1))}</td>
                        <td className="px-3 py-3 text-center text-sm text-sand-700">{fmtNum(memberWeekTotal(member.name, week2))}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${total > 0 ? 'text-blush-600' : 'text-sand-300'}`}>{fmtNum(total)}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-blue-500 font-medium">{leave['Annual Leave'] ? `${leave['Annual Leave']}d` : <span className="text-sand-200">–</span>}</td>
                        <td className="px-3 py-3 text-center text-sm text-amber-500 font-medium">{leave['Sick Leave'] ? `${leave['Sick Leave']}d` : <span className="text-sand-200">–</span>}</td>
                        <td className="px-3 py-3 text-center text-sm text-purple-500 font-medium">{leave['Public Holiday'] ? `${leave['Public Holiday']}d` : <span className="text-sand-200">–</span>}</td>
                        <td className="px-3 py-3 text-center text-sm text-emerald-500 font-medium">{leave['RDO'] ? `${leave['RDO']}d` : <span className="text-sand-200">–</span>}</td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="bg-sand-50 border-t-2 border-sand-200">
                    <td className="px-5 py-2.5 text-xs font-bold text-sand-500 uppercase tracking-wide">Total</td>
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-sand-700">{fmtNum(members.reduce((s, m) => s + memberWeekTotal(m.name, week1), 0))}</td>
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-sand-700">{fmtNum(members.reduce((s, m) => s + memberWeekTotal(m.name, week2), 0))}</td>
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-blush-600">{fmtNum(grandTotal())}</td>
                    <td colSpan={4} />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pay period summary */}
          <div className="bg-gradient-to-br from-blush-500 to-warm-500 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Pay Period Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Total Hours</p>
                <p className="text-2xl font-bold">{fmt(grandTotal())}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Team Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Week 1</p>
                <p className="text-2xl font-bold">{fmt(members.reduce((s, m) => s + memberWeekTotal(m.name, week1), 0))}</p>
              </div>
              <div className="bg-white/20 rounded-xl p-3">
                <p className="text-xs opacity-70">Week 2</p>
                <p className="text-2xl font-bold">{fmt(members.reduce((s, m) => s + memberWeekTotal(m.name, week2), 0))}</p>
              </div>
            </div>

            {/* Per-member breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {members.map(member => {
                const total = memberTotal(member.name)
                const leave = leaveSummary(member.name)
                return (
                  <div key={member.id} className="bg-white/15 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: member.color || '#e5a0a0', filter: 'brightness(1.3)' }}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs flex-1 truncate opacity-90">{member.name}</span>
                      <span className="text-sm font-bold">{fmt(total)}<span className="text-[10px] font-normal opacity-70 ml-0.5">h</span></span>
                    </div>
                    {Object.entries(leave).map(([type, count]) => (
                      <p key={type} className="text-[10px] opacity-70 ml-7">{count}d {type}</p>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
