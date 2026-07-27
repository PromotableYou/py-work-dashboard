import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, X, AlertCircle, FileText, Clock } from 'lucide-react'
import {
  getAllPriorityItems,
  addPriorityItem, updatePriorityItem, deletePriorityItem,
} from '../../lib/supabase'

const WORKSPACES = ['shaniah', 'stacey', 'em', 'william', 'tanya', 'tanaz']
const WS_NAMES   = { shaniah: 'Shaniah', stacey: 'Stacey', em: 'Em', william: 'William', tanya: 'Tanya', tanaz: 'Tanaz' }
const BOSS       = ['shaniah', 'stacey']

const SLOT_STYLE = {
  1: { bg: 'bg-blush-500',  text: 'text-white', border: 'border-blush-200', label: 'Priority 1', accent: '#F0457A' },
  2: { bg: 'bg-amber-400',  text: 'text-white', border: 'border-amber-200', label: 'Priority 2', accent: '#F59E0B' },
  3: { bg: 'bg-sand-400',   text: 'text-white', border: 'border-sand-200',  label: 'Priority 3', accent: '#94A3B8' },
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

// ─── Task form ────────────────────────────────────────────────────────────────
function TaskForm({ initial = {}, onSave, onClose, title = 'Add Task', currentWorkspace, allowPick = false }) {
  const [form, setForm] = useState({
    title:     initial.title     || '',
    notes:     initial.notes     || '',
    priority:  initial.priority  || 'medium',
    due_date:  initial.due_date  || '',
    workspace: initial.workspace || currentWorkspace,
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave({ ...form, title: form.title.trim() })
  }

  const targetName = WS_NAMES[form.workspace] || form.workspace
  const isForOther = form.workspace !== currentWorkspace

  return (
    <div className="bg-white border-2 border-blush-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sand-900 text-sm">{title}</h3>
        <button onClick={onClose} className="text-sand-300 hover:text-sand-500"><X className="w-4 h-4"/></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {allowPick && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-sand-500 shrink-0 w-8">For</label>
            <select
              value={form.workspace}
              onChange={e => setForm(f => ({ ...f, workspace: e.target.value }))}
              className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-xl px-3 py-2 text-sand-800 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            >
              {WORKSPACES.map(w => (
                <option key={w} value={w}>{WS_NAMES[w]}{w === currentWorkspace ? ' (you)' : ''}</option>
              ))}
            </select>
          </div>
        )}
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
                    ? p === 'high'   ? 'bg-red-500 border-red-500 text-white'
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
            className="flex-1 text-sm bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-xl font-semibold transition-colors">
            {isForOther ? `Add to ${targetName}'s list` : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Backlog row (My Tasks tab) — has slot assignment buttons ─────────────────
function BacklogRow({ item, slotsOpen, onAssign, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const st  = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
  const due = item.due_date
    ? Math.round((new Date(item.due_date) - new Date()) / 86400000)
    : null
  const fromName = item.assigned_by && item.assigned_by !== item.workspace
    ? WS_NAMES[item.assigned_by] || item.assigned_by
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
                due < 0   ? 'bg-red-50 text-red-600 border-red-200' :
                due === 0 ? 'bg-orange-50 text-orange-600 border-orange-200' :
                due <= 3  ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-sand-50 text-sand-500 border-sand-200'
              }`}>
                {due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Due today' : `${due}d left`}
              </span>
            )}
            {fromName && (
              <span className="text-[10px] text-blush-400 font-medium italic">from {fromName}</span>
            )}
            {item.notes && (
              <button onClick={() => setExpanded(s => !s)} className="text-sand-300 hover:text-sand-500 transition-colors">
                <FileText className="w-3 h-3"/>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          {slotsOpen.map(slot => (
            <button key={slot} onClick={() => onAssign(item, slot)}
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${SLOT_STYLE[slot].bg}`}
              title={`Set as priority ${slot}`}>{slot}</button>
          ))}
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

// ─── Compact task row (Team Overview) — no slot buttons ───────────────────────
function CompactTaskRow({ item, onDelete, currentWorkspace, isBoss }) {
  const st  = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium
  const due = item.due_date
    ? Math.round((new Date(item.due_date) - new Date()) / 86400000)
    : null
  const fromName = item.assigned_by && item.assigned_by !== item.workspace
    ? WS_NAMES[item.assigned_by] || item.assigned_by
    : null
  const canDelete = item.workspace === currentWorkspace || isBoss || item.assigned_by === currentWorkspace

  return (
    <div className="group flex items-center gap-2 py-2 px-3 hover:bg-sand-50 rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-sand-800 leading-snug truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {item.priority && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${st}`}>
              {PRIORITY_LABELS[item.priority]}
            </span>
          )}
          {due !== null && due <= 3 && (
            <span className={`text-[9px] font-semibold ${due < 0 ? 'text-red-500' : due === 0 ? 'text-orange-500' : 'text-amber-500'}`}>
              {due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Due today' : `${due}d`}
            </span>
          )}
          {fromName && (
            <span className="text-[9px] text-blush-400 italic">from {fromName}</span>
          )}
        </div>
      </div>
      {canDelete && (
        <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0">
          <Trash2 className="w-3 h-3"/>
        </button>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function KeyPrioritiesPage({ workspace = 'shaniah' }) {
  const [tab, setTab]           = useState('team')
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [showAddFor, setShowAddFor] = useState(null)  // workspace string for team list add
  const [editItem, setEditItem] = useState(null)

  const isBoss = BOSS.includes(workspace)

  useEffect(() => { load() }, [workspace])

  async function load() {
    setLoading(true)
    try {
      const items = await getAllPriorityItems()
      setAllItems(items)
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  // Derived state
  const teamActive = allItems.filter(i => i.status === 'active')
  const myItems    = allItems.filter(i => i.workspace === workspace)
  const myBacklog  = myItems.filter(i => i.status === 'backlog')

  const teamMap = {}
  for (const w of WORKSPACES) teamMap[w] = { 1: null, 2: null, 3: null }
  for (const item of teamActive) {
    if (item.slot && teamMap[item.workspace]) teamMap[item.workspace][item.slot] = item
  }

  function activeSlotsFor(ws) {
    return teamActive.filter(i => i.workspace === ws).map(i => i.slot)
  }

  function backlogFor(ws) {
    return allItems.filter(i => i.workspace === ws && i.status === 'backlog')
  }

  // Add task to any workspace; assigned_by = current workspace
  async function handleAddTask(fields) {
    const targetWs = fields.workspace || workspace
    try {
      const saved = await addPriorityItem({
        workspace:   targetWs,
        assigned_by: workspace,
        status:      'backlog',
        title:       fields.title,
        notes:       fields.notes,
        priority:    fields.priority,
        due_date:    fields.due_date,
      })
      setAllItems(p => [...p, saved])
      setShowAdd(false)
      setShowAddFor(null)
    } catch(e) { setErr(e.message) }
  }

  // Edit existing task
  async function handleEditTask(fields) {
    try {
      const updates = { title: fields.title, notes: fields.notes, priority: fields.priority, due_date: fields.due_date }
      await updatePriorityItem(editItem.id, updates)
      setAllItems(p => p.map(i => i.id === editItem.id ? { ...i, ...updates } : i))
      setEditItem(null)
    } catch(e) { setErr(e.message) }
  }

  // Self-assign backlog item to a priority slot
  async function handleAssignSlot(item, slot) {
    try {
      await updatePriorityItem(item.id, { status: 'active', slot })
      const updated = { ...item, status: 'active', slot }
      setAllItems(p => {
        // Any existing item in that slot for that workspace goes back to backlog
        const bumped = p.find(i => i.workspace === item.workspace && i.slot === slot && i.status === 'active' && i.id !== item.id)
        return p.map(i => {
          if (i.id === item.id) return updated
          if (bumped && i.id === bumped.id) return { ...i, status: 'backlog', slot: null }
          return i
        })
      })
    } catch(e) { setErr(e.message) }
  }

  // Boss assign from team overview
  async function handleBossAssign(item, slot) {
    try {
      await updatePriorityItem(item.id, { status: 'active', slot })
      const updated = { ...item, status: 'active', slot }
      setAllItems(p => {
        const bumped = p.find(i => i.workspace === item.workspace && i.slot === slot && i.status === 'active' && i.id !== item.id)
        return p.map(i => {
          if (i.id === item.id) return updated
          if (bumped && i.id === bumped.id) return { ...i, status: 'backlog', slot: null }
          return i
        })
      })
    } catch(e) { setErr(e.message) }
  }

  async function handleComplete(id) {
    try {
      await updatePriorityItem(id, { status: 'done' })
      setAllItems(p => p.filter(i => i.id !== id))
    } catch(e) { setErr(e.message) }
  }

  async function handleRemoveFromSlot(id) {
    try {
      await updatePriorityItem(id, { status: 'backlog', slot: null })
      setAllItems(p => p.map(i => i.id === id ? { ...i, status: 'backlog', slot: null } : i))
    } catch(e) { setErr(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deletePriorityItem(id)
      setAllItems(p => p.filter(i => i.id !== id))
    } catch(e) { setErr(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  const tabs = [
    { id: 'team', label: 'Team Overview' },
    { id: 'mine', label: 'My Tasks' },
  ]

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Key Priorities</h1>
          <p className="text-sand-400 text-sm mt-0.5">Week of {getWeekLabel()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-sand-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === t.id ? 'bg-white text-sand-900 shadow-sm' : 'text-sand-500 hover:text-sand-700'
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
        <div className="space-y-6">

          {/* Priority grid */}
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
                                {item.due_date && (
                                  <p className="text-[10px] text-sand-400 mt-0.5 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5"/>
                                    Due {new Date(item.due_date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                  </p>
                                )}
                              </div>
                              {(w === workspace || isBoss) && (
                                <div className="flex gap-1 opacity-0 group-hover/cell:opacity-100 transition-all shrink-0">
                                  <button onClick={() => handleComplete(item.id)} title="Mark done"
                                    className="text-sand-300 hover:text-emerald-500 transition-colors">
                                    <Check className="w-3.5 h-3.5"/>
                                  </button>
                                  <button onClick={() => handleRemoveFromSlot(item.id)} title="Move back to task list"
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

          {/* Per-person task lists */}
          <div>
            <h2 className="text-sm font-bold text-sand-700 mb-3">Team Task Lists</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WORKSPACES.map(w => {
                const tasks     = backlogFor(w)
                const isAddOpen = showAddFor === w
                return (
                  <div key={w} className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-sand-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blush-100 flex items-center justify-center text-xs font-bold text-blush-600 shrink-0">
                          {WS_NAMES[w][0]}
                        </div>
                        <span className="text-sm font-semibold text-sand-800">{WS_NAMES[w]}</span>
                        {w === workspace && <span className="text-[10px] text-blush-400 font-semibold">you</span>}
                        {tasks.length > 0 && (
                          <span className="text-[10px] text-sand-400 font-medium">{tasks.length}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setShowAddFor(isAddOpen ? null : w)}
                        className="flex items-center gap-1 text-xs font-semibold text-blush-600 hover:text-blush-700 bg-blush-50 border border-blush-200 hover:bg-blush-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3"/>Add
                      </button>
                    </div>

                    {isAddOpen && (
                      <div className="p-3">
                        <TaskForm
                          currentWorkspace={workspace}
                          allowPick={false}
                          onSave={fields => handleAddTask({ ...fields, workspace: w })}
                          onClose={() => setShowAddFor(null)}
                          title={`Add to ${WS_NAMES[w]}'s list`}
                        />
                      </div>
                    )}

                    <div className="divide-y divide-sand-50">
                      {tasks.length === 0 && !isAddOpen ? (
                        <p className="text-xs text-sand-300 text-center py-5 italic">No tasks yet</p>
                      ) : (
                        tasks.map(item => (
                          <CompactTaskRow
                            key={item.id}
                            item={item}
                            onDelete={handleDelete}
                            currentWorkspace={workspace}
                            isBoss={isBoss}
                          />
                        ))
                      )}
                    </div>

                    {/* Boss slot-assignment for other people's lists */}
                    {isBoss && w !== workspace && tasks.length > 0 && (
                      <div className="px-3 pb-3 pt-1">
                        <p className="text-[10px] text-sand-400 italic">Hover a task and use slot buttons on their My Tasks page</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Assign to any workspace (quick add with picker) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-sand-700">Assign a task to someone</h2>
              {!showAdd && (
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blush-600 hover:text-blush-700 bg-blush-50 border border-blush-200 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5"/> New task
                </button>
              )}
            </div>
            {showAdd && (
              <TaskForm
                currentWorkspace={workspace}
                allowPick={true}
                onSave={handleAddTask}
                onClose={() => setShowAdd(false)}
                title="Add task for team member"
              />
            )}
            {!showAdd && (
              <p className="text-xs text-sand-400">Use the <span className="font-semibold">+ Add</span> button on each person's list, or click "New task" to pick a person from a dropdown.</p>
            )}
          </div>
        </div>
      )}

      {/* ── MY TASKS ── */}
      {tab === 'mine' && (
        <div className="space-y-6">

          {/* Edit form */}
          {editItem && (
            <TaskForm
              initial={editItem}
              currentWorkspace={workspace}
              onSave={handleEditTask}
              onClose={() => setEditItem(null)}
              title="Edit Task"
            />
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
                          <button onClick={() => handleRemoveFromSlot(item.id)} title="Move back to task list"
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
                        Hover a task below and click <span className="font-semibold">{slot}</span> to make it your priority {slot}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* My task list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-sand-700">
                My Task List <span className="font-normal text-sand-400">({myBacklog.length})</span>
              </h2>
              <button onClick={() => { setShowAdd(true); setEditItem(null) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-blush-600 hover:text-blush-700 bg-blush-50 border border-blush-200 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5"/> Add Task
              </button>
            </div>

            {showAdd && (
              <div className="mb-4">
                <TaskForm
                  currentWorkspace={workspace}
                  onSave={fields => handleAddTask({ ...fields, workspace })}
                  onClose={() => setShowAdd(false)}
                  title="Add to My List"
                />
              </div>
            )}

            <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
              {myBacklog.length === 0 && !showAdd ? (
                <div className="text-center py-10">
                  <p className="text-sand-400 text-sm">Your task list is empty</p>
                  <button onClick={() => setShowAdd(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
                    Add your first task →
                  </button>
                </div>
              ) : (
                myBacklog.map(item => (
                  <BacklogRow
                    key={item.id}
                    item={item}
                    slotsOpen={[1,2,3].filter(s => !activeSlotsFor(workspace).includes(s))}
                    onAssign={handleAssignSlot}
                    onDelete={handleDelete}
                    onEdit={setEditItem}
                  />
                ))
              )}
            </div>
            <p className="text-xs text-sand-400 mt-2">
              Hover any task and click <span className="font-semibold text-sand-500">1</span>, <span className="font-semibold text-sand-500">2</span>, or <span className="font-semibold text-sand-500">3</span> to set it as that week's priority.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
