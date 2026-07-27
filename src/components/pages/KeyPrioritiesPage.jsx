import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, ArrowUp, AlertCircle, X, ChevronDown, FileText, Clock } from 'lucide-react'
import {
  getMyPriorities, getAllActivePriorities, getAllPendingPriorities,
  addPriorityItem, updatePriorityItem, deletePriorityItem,
} from '../../lib/supabase'

const WORKSPACES = ['shaniah', 'stacey', 'em', 'william', 'tanya', 'tanaz']
const WS_NAMES   = { shaniah: 'Shaniah', stacey: 'Stacey', em: 'Em', william: 'William', tanya: 'Tanya', tanaz: 'Tanaz' }
const BOSS       = ['shaniah', 'stacey']

const SLOT_STYLE = {
  1: { bg: 'bg-blush-500',  text: 'text-white', border: 'border-blush-200', light: 'bg-blush-50',  label: 'Priority 1', accent: '#F0457A' },
  2: { bg: 'bg-amber-400',  text: 'text-white', border: 'border-amber-200', light: 'bg-amber-50',  label: 'Priority 2', accent: '#F59E0B' },
  3: { bg: 'bg-sand-400',   text: 'text-white', border: 'border-sand-200',  light: 'bg-sand-50',   label: 'Priority 3', accent: '#94A3B8' },
}

const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_STYLES = {
  high:   'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low:    'bg-sand-50 text-sand-500 border-sand-200',
}

function getWeekLabel() {
  const d   = new Date()
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return mon.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Add / Edit form ──────────────────────────────────────────────────────────
function ItemForm({ initial = {}, onSave, onClose, title = 'Add Task' }) {
  const [form, setForm] = useState({
    title:    initial.title    || '',
    notes:    initial.notes    || '',
    priority: initial.priority || 'medium',
    due_date: initial.due_date || '',
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({ ...form, title: form.title.trim() })
  }

  return (
    <div className="bg-white border-2 border-blush-200 rounded-2xl p-5 space-y-3 mb-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sand-900 text-sm">{title}</h3>
        <button onClick={onClose} className="text-sand-300 hover:text-sand-500"><X className="w-4 h-4"/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Task name…" autoFocus required
          className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
        />
        <textarea
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Notes, context, links… (optional)" rows={2}
          className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-700 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none resize-none"
        />
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1.5">
            {['high','medium','low'].map(p => (
              <button key={p} type="button"
                onClick={() => setForm(f => ({ ...f, priority: p }))}
                className={`text-xs px-3 py-1.5 rounded-lg border font-semibold capitalize transition-colors ${
                  form.priority === p
                    ? p === 'high' ? 'bg-red-500 border-red-500 text-white'
                    : p === 'medium' ? 'bg-amber-400 border-amber-400 text-white'
                    : 'bg-sand-400 border-sand-400 text-white'
                    : 'bg-white border-sand-200 text-sand-400 hover:border-sand-300'
                }`}>{p}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-sand-400">Due</label>
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="text-xs bg-sand-50 border border-sand-200 rounded-lg px-2 py-1.5 text-sand-700 focus:outline-none focus:ring-2 focus:ring-blush-200"/>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 text-sm text-sand-500 py-2 rounded-xl border border-sand-200 hover:bg-sand-50 transition-colors">Cancel</button>
          <button type="submit"
            className="flex-1 text-sm bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-xl font-semibold transition-colors">Save</button>
        </div>
      </form>
    </div>
  )
}

// ─── Backlog task row ─────────────────────────────────────────────────────────
function BacklogRow({ item, isBoss, activeSlotsForWs, onPropose, onBossAssign, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const slotsOpen = [1,2,3].filter(s => !activeSlotsForWs.includes(s))
  const st = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
  const due = item.due_date
    ? Math.round((new Date(item.due_date) - new Date()) / 86400000)
    : null

  return (
    <div className="group border-b border-sand-100 last:border-0">
      <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-sand-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-sand-800 leading-snug">{item.title}</span>
            {item.priority && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st}`}>
                {PRIORITY_LABELS[item.priority]}
              </span>
            )}
            {due !== null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                due < 0  ? 'bg-red-50 text-red-600 border-red-200' :
                due === 0 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                due <= 3  ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-sand-50 text-sand-500 border-sand-200'
              }`}>
                {due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Due today' : `${due}d left`}
              </span>
            )}
            {item.notes && (
              <button onClick={() => setExpanded(s => !s)} className="text-sand-300 hover:text-sand-500 transition-colors">
                <FileText className="w-3 h-3"/>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          {isBoss ? (
            slotsOpen.map(slot => (
              <button key={slot} onClick={() => onBossAssign(item, slot)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${SLOT_STYLE[slot].bg}`}
                title={`Set as priority ${slot}`}>{slot}</button>
            ))
          ) : (
            slotsOpen.length > 0 && (
              <button onClick={() => onPropose(item.id)}
                className="flex items-center gap-1 text-xs text-blush-600 hover:text-blush-700 font-semibold bg-blush-50 border border-blush-200 hover:bg-blush-100 px-2.5 py-1 rounded-lg transition-colors">
                <ArrowUp className="w-3 h-3"/> Propose
              </button>
            )
          )}
          <button onClick={() => onEdit(item)} className="text-sand-300 hover:text-sand-600 transition-colors">
            <FileText className="w-3.5 h-3.5"/>
          </button>
          <button onClick={() => onDelete(item.id)} className="text-sand-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>
      {expanded && item.notes && (
        <div className="px-5 pb-3 -mt-1">
          <p className="text-xs text-sand-500 leading-relaxed bg-sand-50 rounded-lg px-3 py-2">{item.notes}</p>
        </div>
      )}
    </div>
  )
}

// ─── Approval card ────────────────────────────────────────────────────────────
function ApprovalCard({ item, activeSlotsForWs, onApprove, onReject }) {
  const name = WS_NAMES[item.workspace] || item.workspace
  const available = [1,2,3].filter(s => !activeSlotsForWs.includes(s))
  const st = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-5 hover:border-sand-300 transition-colors">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-blush-100 flex items-center justify-center text-sm font-bold text-blush-600 shrink-0">
          {name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-sand-400 font-medium">{name} wants to prioritise:</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm font-semibold text-sand-900">{item.title}</p>
            {item.priority && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st}`}>
                {PRIORITY_LABELS[item.priority]}
              </span>
            )}
          </div>
          {item.notes && <p className="text-xs text-sand-400 mt-1 italic">{item.notes}</p>}
        </div>
        <button onClick={() => onReject(item.id)} className="text-sand-300 hover:text-red-400 transition-colors shrink-0" title="Decline">
          <X className="w-4 h-4"/>
        </button>
      </div>
      {available.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-sand-500">Approve as:</p>
          {available.map(slot => (
            <button key={slot} onClick={() => onApprove(item, slot)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white hover:opacity-80 transition-opacity"
              style={{ borderColor: SLOT_STYLE[slot].accent, color: SLOT_STYLE[slot].accent }}>
              Priority {slot}
            </button>
          ))}
          <button onClick={() => onReject(item.id)}
            className="ml-auto text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
            Decline
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            All 3 slots are full for {name} — complete one first
          </p>
          <button onClick={() => onReject(item.id)} className="text-xs text-red-400 hover:text-red-500 font-medium ml-3">Decline</button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function KeyPrioritiesPage({ workspace = 'shaniah' }) {
  const [tab, setTab]           = useState('team')
  const [myItems, setMyItems]   = useState([])
  const [teamActive, setTeamActive] = useState([])
  const [allPending, setAllPending] = useState([])
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState(null)
  const [newTask, setNewTask]   = useState('')
  const [showAdd, setShowAdd]   = useState(false)
  const [editItem, setEditItem] = useState(null)

  const isBoss = BOSS.includes(workspace)

  useEffect(() => { load() }, [workspace])

  async function load() {
    setLoading(true)
    try {
      const [mine, active, pending] = await Promise.all([
        getMyPriorities(workspace),
        getAllActivePriorities(),
        getAllPendingPriorities(),
      ])
      setMyItems(mine)
      setTeamActive(active)
      setAllPending(pending)
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  const myBacklog  = myItems.filter(i => i.status === 'backlog')
  const myPending  = myItems.filter(i => i.status === 'pending')
  const pendingCount = allPending.length

  // Build team map: workspace -> { 1: item, 2: item, 3: item }
  const teamMap = {}
  for (const w of WORKSPACES) teamMap[w] = { 1: null, 2: null, 3: null }
  for (const item of teamActive) {
    if (item.slot && teamMap[item.workspace]) teamMap[item.workspace][item.slot] = item
  }

  function activeSlotsFor(ws) {
    return teamActive.filter(i => i.workspace === ws).map(i => i.slot)
  }

  async function handleAddTask(fields) {
    try {
      const saved = await addPriorityItem({ workspace, status: 'backlog', ...fields })
      setMyItems(p => [...p, saved])
      setShowAdd(false)
    } catch(e) { setErr(e.message) }
  }

  async function handleEditTask(fields) {
    try {
      await updatePriorityItem(editItem.id, fields)
      setMyItems(p => p.map(i => i.id === editItem.id ? { ...i, ...fields } : i))
      setEditItem(null)
    } catch(e) { setErr(e.message) }
  }

  async function handlePropose(id) {
    try {
      await updatePriorityItem(id, { status: 'pending' })
      const item = myItems.find(i => i.id === id)
      if (item) {
        const updated = { ...item, status: 'pending' }
        setMyItems(p => p.map(i => i.id === id ? updated : i))
        setAllPending(p => [...p, updated])
      }
    } catch(e) { setErr(e.message) }
  }

  async function handleCancelPropose(id) {
    try {
      await updatePriorityItem(id, { status: 'backlog' })
      setMyItems(p => p.map(i => i.id === id ? { ...i, status: 'backlog' } : i))
      setAllPending(p => p.filter(i => i.id !== id))
    } catch(e) { setErr(e.message) }
  }

  async function handleApprove(item, slot) {
    try {
      await updatePriorityItem(item.id, { status: 'active', slot })
      const updated = { ...item, status: 'active', slot }
      setAllPending(p => p.filter(i => i.id !== item.id))
      setTeamActive(p => {
        const rest = p.filter(i => !(i.workspace === item.workspace && i.slot === slot))
        return [...rest, updated]
      })
      if (item.workspace === workspace) {
        setMyItems(p => p.map(i => i.id === item.id ? updated : i))
      }
    } catch(e) { setErr(e.message) }
  }

  async function handleBossAssign(item, slot) {
    try {
      await updatePriorityItem(item.id, { status: 'active', slot })
      const updated = { ...item, status: 'active', slot }
      setMyItems(p => p.map(i => i.id === item.id ? updated : i))
      setTeamActive(p => {
        const rest = p.filter(i => !(i.workspace === item.workspace && i.slot === slot))
        return [...rest, updated]
      })
    } catch(e) { setErr(e.message) }
  }

  async function handleReject(id) {
    try {
      await updatePriorityItem(id, { status: 'backlog' })
      setAllPending(p => p.filter(i => i.id !== id))
      setMyItems(p => p.map(i => i.id === id ? { ...i, status: 'backlog' } : i))
    } catch(e) { setErr(e.message) }
  }

  async function handleComplete(id) {
    try {
      await updatePriorityItem(id, { status: 'done' })
      setTeamActive(p => p.filter(i => i.id !== id))
      setMyItems(p => p.filter(i => i.id !== id))
    } catch(e) { setErr(e.message) }
  }

  async function handleRemovePriority(id) {
    // Move back to backlog (unassign from slot)
    try {
      await updatePriorityItem(id, { status: 'backlog', slot: null })
      const item = teamActive.find(i => i.id === id)
      setTeamActive(p => p.filter(i => i.id !== id))
      if (item) setMyItems(p => {
        if (p.find(i => i.id === id)) return p.map(i => i.id === id ? { ...i, status: 'backlog', slot: null } : i)
        return [...p, { ...item, status: 'backlog', slot: null }]
      })
    } catch(e) { setErr(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deletePriorityItem(id)
      setMyItems(p => p.filter(i => i.id !== id))
      setAllPending(p => p.filter(i => i.id !== id))
      setTeamActive(p => p.filter(i => i.id !== id))
    } catch(e) { setErr(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const tabs = [
    { id: 'team', label: 'Team Overview' },
    { id: 'mine', label: 'My Priorities' },
    ...(isBoss ? [{ id: 'approvals', label: pendingCount > 0 ? `Approvals (${pendingCount})` : 'Approvals' }] : []),
  ]

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Key Priorities</h1>
          <p className="text-sand-400 text-sm mt-0.5">Week of {getWeekLabel()}</p>
        </div>
        {myPending.length > 0 && !isBoss && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
            {myPending.length} awaiting approval
          </span>
        )}
        {isBoss && pendingCount > 0 && (
          <button onClick={() => setTab('approvals')}
            className="flex items-center gap-1.5 text-xs font-semibold text-blush-700 bg-blush-50 border border-blush-200 rounded-full px-3 py-1.5 hover:bg-blush-100 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-blush-500 animate-pulse"/>
            {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-sand-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-sand-900 shadow-sm' :
              t.id === 'approvals' && pendingCount > 0 ? 'text-blush-600 hover:text-blush-700' :
              'text-sand-500 hover:text-sand-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 shrink-0"/>{err}
          <button onClick={() => setErr(null)} className="ml-auto"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      {/* ── TEAM OVERVIEW ── */}
      {tab === 'team' && (
        <div className="bg-white border border-sand-200 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[580px]">
            <thead>
              <tr className="border-b border-sand-200">
                <th className="px-5 py-3 text-left text-xs font-bold text-sand-400 uppercase tracking-widest w-[160px]">Name</th>
                {[1,2,3].map(n => (
                  <th key={n} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest border-l border-sand-100"
                    style={{ color: SLOT_STYLE[n].accent }}>
                    Priority {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WORKSPACES.map(w => (
                <tr key={w} className="border-b border-sand-100 last:border-0 hover:bg-sand-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blush-100 flex items-center justify-center text-xs font-bold text-blush-600 shrink-0">
                        {WS_NAMES[w][0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-sand-800">{WS_NAMES[w]}</p>
                        {w === workspace && <p className="text-[10px] text-blush-400 font-semibold leading-none mt-0.5">you</p>}
                      </div>
                    </div>
                  </td>
                  {[1,2,3].map(slot => {
                    const item = teamMap[w][slot]
                    const st   = SLOT_STYLE[slot]
                    return (
                      <td key={slot} className="px-5 py-4 border-l border-sand-100">
                        {item ? (
                          <div className="flex items-start gap-2 group/cell">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm text-sand-800 leading-snug">{item.title}</p>
                                {item.priority && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[item.priority]}`}>
                                    {PRIORITY_LABELS[item.priority]}
                                  </span>
                                )}
                              </div>
                              {item.notes && <p className="text-xs text-sand-400 mt-0.5 line-clamp-1">{item.notes}</p>}
                              {item.due_date && (
                                <p className="text-[10px] text-sand-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5"/> Due {new Date(item.due_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                </p>
                              )}
                            </div>
                            {(w === workspace || isBoss) && (
                              <div className="flex gap-1 opacity-0 group-hover/cell:opacity-100 transition-all shrink-0">
                                <button onClick={() => handleComplete(item.id)} title="Mark done"
                                  className="text-sand-300 hover:text-emerald-500 transition-colors">
                                  <Check className="w-3.5 h-3.5"/>
                                </button>
                                <button onClick={() => handleRemovePriority(item.id)} title="Move to backlog"
                                  className="text-sand-300 hover:text-sand-500 transition-colors">
                                  <X className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-sand-300 italic">Not set</p>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MY PRIORITIES ── */}
      {tab === 'mine' && (
        <div className="space-y-6">

          {/* Add/edit form */}
          {showAdd && (
            <ItemForm onSave={handleAddTask} onClose={() => setShowAdd(false)} title="Add to Backlog"/>
          )}
          {editItem && (
            <ItemForm initial={editItem} onSave={handleEditTask} onClose={() => setEditItem(null)} title="Edit Task"/>
          )}

          {/* Active priority slots */}
          <div>
            <h2 className="text-sm font-bold text-sand-700 mb-3">This Week's Top 3</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1,2,3].map(slot => {
                const item = teamActive.find(i => i.workspace === workspace && i.slot === slot)
                const st   = SLOT_STYLE[slot]
                return (
                  <div key={slot}
                    className={`rounded-2xl border-2 p-4 min-h-[110px] transition-all ${
                      item ? `bg-white ${st.border}` : 'bg-sand-50 border-dashed border-sand-200'
                    }`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`w-6 h-6 rounded-full ${st.bg} ${st.text} flex items-center justify-center text-xs font-bold shrink-0`}>{slot}</span>
                      <span className="text-xs font-semibold text-sand-500">{st.label}</span>
                      {item && (
                        <div className="ml-auto flex gap-1">
                          <button onClick={() => handleComplete(item.id)} title="Mark done"
                            className="text-sand-300 hover:text-emerald-500 transition-colors">
                            <Check className="w-3.5 h-3.5"/>
                          </button>
                          <button onClick={() => handleRemovePriority(item.id)} title="Move back to backlog"
                            className="text-sand-300 hover:text-sand-500 transition-colors">
                            <X className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      )}
                    </div>
                    {item ? (
                      <div>
                        <p className="text-sm font-semibold text-sand-800 leading-snug">{item.title}</p>
                        {item.notes && <p className="text-xs text-sand-400 mt-1 leading-relaxed">{item.notes}</p>}
                        {item.due_date && (
                          <p className="text-[10px] text-sand-400 mt-1.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5"/>
                            Due {new Date(item.due_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                        {item.priority && (
                          <span className={`mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[item.priority]}`}>
                            {PRIORITY_LABELS[item.priority]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-sand-400 leading-relaxed">
                        {myPending.length > 0
                          ? 'Awaiting manager approval…'
                          : isBoss
                          ? 'Assign a backlog task using the slot buttons'
                          : 'Add tasks to your backlog and propose them for approval'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending approval (shows for everyone in their own pending context) */}
          {myPending.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-sand-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"/>
                Pending Approval ({myPending.length})
              </h2>
              <div className="space-y-2">
                {myPending.map(item => (
                  <div key={item.id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    {isBoss ? (
                      <>
                        <span className="text-sm text-sand-800 flex-1">{item.title}</span>
                        <div className="flex gap-1.5">
                          {[1,2,3].filter(s => !activeSlotsFor(workspace).includes(s)).map(slot => (
                            <button key={slot} onClick={() => handleApprove(item, slot)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${SLOT_STYLE[slot].bg}`}
                              title={`Assign to priority ${slot}`}>{slot}</button>
                          ))}
                        </div>
                        <button onClick={() => handleCancelPropose(item.id)} className="text-sand-300 hover:text-red-400 transition-colors">
                          <X className="w-4 h-4"/>
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-sand-800 flex-1">{item.title}</span>
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">Awaiting approval</span>
                        <button onClick={() => handleCancelPropose(item.id)} title="Cancel proposal" className="text-sand-300 hover:text-sand-500 transition-colors">
                          <X className="w-4 h-4"/>
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Backlog */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-sand-700">Backlog <span className="font-normal text-sand-400">({myBacklog.length})</span></h2>
              <button onClick={() => { setShowAdd(true); setEditItem(null) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blush-600 hover:text-blush-700 bg-blush-50 border border-blush-200 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5"/> Add Task
              </button>
            </div>

            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              {myBacklog.length === 0 && !showAdd && (
                <div className="text-center py-10">
                  <p className="text-sand-400 text-sm">No tasks in your backlog</p>
                  <button onClick={() => setShowAdd(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
                    Add your first task →
                  </button>
                </div>
              )}
              {myBacklog.map(item => (
                <BacklogRow
                  key={item.id}
                  item={item}
                  isBoss={isBoss}
                  activeSlotsForWs={activeSlotsFor(workspace)}
                  onPropose={handlePropose}
                  onBossAssign={handleBossAssign}
                  onDelete={handleDelete}
                  onEdit={setEditItem}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVALS (boss only) ── */}
      {tab === 'approvals' && isBoss && (
        <div className="space-y-4">
          {allPending.length === 0 && (
            <div className="bg-white border border-sand-200 rounded-2xl px-5 py-16 text-center">
              <p className="text-sand-400 text-sm">No pending approvals right now</p>
            </div>
          )}
          {allPending.map(item => (
            <ApprovalCard
              key={item.id}
              item={item}
              activeSlotsForWs={activeSlotsFor(item.workspace)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}
