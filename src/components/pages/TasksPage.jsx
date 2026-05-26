import { useState, useEffect, useRef } from 'react'
import {
  Plus, Check, Trash2, FileText, ChevronDown, ChevronUp,
  AlertCircle, Circle, GripVertical, X, RefreshCw,
  Timer, Pause, Play, RotateCcw, Palette, Calendar,
  LayoutList, LayoutGrid,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import {
  getProjects, addProject, updateProject, deleteProject,
  getSubtasks, addSubtask, updateSubtask, deleteSubtask,
  getRecurringTasks, addRecurringTask, deleteRecurringTask,
} from '../../lib/supabase'

// ─── Colours ──────────────────────────────────────────────────────────────────
const PROJECT_COLORS = [
  '#F0457A', '#F97316', '#EAB308', '#22C55E',
  '#3B82F6', '#8B5CF6', '#EC4899', '#64748B',
]

const PRIORITY_STYLES = {
  high:   { dot: 'bg-red-400',   badge: 'bg-red-50 text-red-600 border-red-200'    },
  medium: { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { dot: 'bg-sand-300',  badge: 'bg-sand-50 text-sand-500 border-sand-200'  },
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const FOCUS_KEY    = 'wd_today_focus'
const VIEW_KEY     = 'wd_tasks_view'
const REC_KEY      = 'wd_recurring_done'
const STREAK_KEY   = 'wd_streak'
function localISO(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const TODAY     = localISO()
const YESTERDAY = localISO(new Date(Date.now() - 86400000))

function getFocusIds() {
  try { return JSON.parse(localStorage.getItem(FOCUS_KEY) || '[]') } catch { return [] }
}
function saveFocusIds(ids) { localStorage.setItem(FOCUS_KEY, JSON.stringify(ids)) }

function getRecurringDone() {
  try {
    const d = JSON.parse(localStorage.getItem(REC_KEY) || '{}')
    return d.date === TODAY ? (d.ids || []) : []
  } catch { return [] }
}
function saveRecurringDone(ids) {
  localStorage.setItem(REC_KEY, JSON.stringify({ date: TODAY, ids }))
}

export function getStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"best":0,"lastDate":""}') }
  catch { return { current: 0, best: 0, lastDate: '' } }
}
export function bumpStreak() {
  const s = getStreak()
  if (s.lastDate === TODAY) return s
  const newCurrent = s.lastDate === YESTERDAY ? s.current + 1 : 1
  const updated = { current: newCurrent, best: Math.max(newCurrent, s.best), lastDate: TODAY }
  localStorage.setItem(STREAK_KEY, JSON.stringify(updated))
  return updated
}

// ─── Confetti helpers ─────────────────────────────────────────────────────────
function popConfetti(big = false) {
  const colors = ['#F0457A', '#F97316', '#FBBF24', '#34D399', '#60A5FA', '#8B5CF6']
  confetti({ particleCount: big ? 160 : 80, spread: big ? 110 : 70, origin: { y: 0.6 }, colors })
  if (big) setTimeout(() =>
    confetti({ particleCount: 80, spread: 130, origin: { x: 0.15, y: 0.75 }, colors }), 350)
}

// ─── Due date helpers ─────────────────────────────────────────────────────────
function dueBadge(dueDate) {
  if (!dueDate) return null
  const diff = Math.round((new Date(dueDate) - new Date(TODAY)) / 86400000)
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: 'bg-red-100 text-red-600 border-red-200' }
  if (diff === 0) return { label: 'Due today',  cls: 'bg-orange-100 text-orange-600 border-orange-200' }
  if (diff <= 3)  return { label: `${diff}d left`, cls: 'bg-amber-100 text-amber-600 border-amber-200' }
  return { label: `${diff}d left`, cls: 'bg-sand-100 text-sand-500 border-sand-200' }
}

// ─── Subtask row ──────────────────────────────────────────────────────────────
function SubtaskRow({ sub, onToggle, onDelete, inFocus }) {
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('subtask_id', sub.id); e.dataTransfer.effectAllowed = 'copy' }}
      className={`flex items-start gap-2 px-5 py-2.5 group hover:bg-sand-50 transition-colors cursor-grab active:cursor-grabbing ${sub.completed ? 'opacity-50' : ''}`}
    >
      <GripVertical className="w-3.5 h-3.5 text-sand-200 group-hover:text-sand-400 mt-0.5 shrink-0 transition-colors" />
      <button
        onClick={() => onToggle(sub)}
        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          sub.completed ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
        }`}
      >
        {sub.completed && <Check className="w-2.5 h-2.5 text-white" />}
      </button>
      <span className={`flex-1 text-sm leading-relaxed ${sub.completed ? 'line-through text-sand-400' : 'text-sand-700'}`}>
        {sub.text}
      </span>
      {inFocus && <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-blush-400" />}
      <button onClick={() => onDelete(sub.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Project panel ────────────────────────────────────────────────────────────
function ProjectPanel({ project, subtasks, focusIds, onToggle, onDelete, onUpdate, onAddSub, onToggleSub, onDeleteSub, onComplete }) {
  const [expanded, setExpanded]   = useState(true)
  const [newSub, setNewSub]       = useState('')
  const [showNotes, setShowNotes] = useState(!!project.notes)
  const [showColor, setShowColor] = useState(false)
  const [notes, setNotes]         = useState(project.notes || '')
  const notesTimer = useRef(null)

  const done  = subtasks.filter(s => s.completed).length
  const total = subtasks.length
  const pct   = total ? Math.round((done / total) * 100) : 0
  const priority = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.medium
  const accentColor = project.color || '#F0457A'
  const due = dueBadge(project.due_date)

  // Fire confetti when project hits 100%
  const prevPct = useRef(pct)
  useEffect(() => {
    if (pct === 100 && prevPct.current < 100 && total > 0) {
      popConfetti(true)
      onComplete?.()
    }
    prevPct.current = pct
  }, [pct])

  function handleNotes(val) {
    setNotes(val)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => onUpdate(project.id, { notes: val }), 700)
  }

  function submitSub(e) {
    e.preventDefault()
    if (!newSub.trim()) return
    onAddSub(project.id, newSub.trim())
    setNewSub('')
  }

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all hover:shadow-sm ${project.done ? 'opacity-60' : ''}`}
      style={{ borderColor: project.done ? undefined : accentColor + '55' }}
    >
      {/* Colour accent bar */}
      <div className="h-1" style={{ background: accentColor }} />

      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggle(project)}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors`}
            style={project.done ? { background: accentColor, borderColor: accentColor } : { borderColor: accentColor + '88' }}
          >
            {project.done && <Check className="w-3 h-3 text-white" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-bold text-base ${project.done ? 'line-through text-sand-400' : 'text-sand-900'}`}>
                {project.name}
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priority.badge}`}>
                {project.priority}
              </span>
              {due && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${due.cls}`}>
                  {due.label}
                </span>
              )}
            </div>

            {total > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-sand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: accentColor }}
                  />
                </div>
                <span className="text-xs text-sand-400 shrink-0">{done}/{total} · {pct}%</span>
              </div>
            )}
            {total === 0 && <p className="text-xs text-sand-300 mt-1">No tasks yet</p>}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Colour picker toggle */}
            <button
              onClick={() => setShowColor(!showColor)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sand-300 hover:text-sand-500 hover:bg-sand-50 transition-colors"
              title="Change colour"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowNotes(!showNotes)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${notes ? 'text-blush-400 bg-blush-50' : 'text-sand-300 hover:text-sand-500 hover:bg-sand-50'}`}>
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-400 transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button onClick={() => onDelete(project.id)}
              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-sand-300 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Colour picker */}
        {showColor && (
          <div className="mt-3 ml-8 flex items-center gap-2 flex-wrap">
            {PROJECT_COLORS.map(c => (
              <button key={c} type="button"
                onClick={() => { onUpdate(project.id, { color: c }); setShowColor(false) }}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: project.color === c ? '#1e293b' : 'transparent' }}
              />
            ))}
          </div>
        )}

        {/* Notes */}
        {showNotes && (
          <div className="mt-3 ml-8">
            <textarea value={notes} onChange={e => handleNotes(e.target.value)}
              placeholder="Notes, links, context…" rows={3}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200 resize-none leading-relaxed"
            />
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-sand-100">
          {subtasks.length === 0 && (
            <p className="text-sm text-sand-300 text-center py-5">No tasks yet — add one below</p>
          )}
          {subtasks.length > 0 && (
            <p className="text-[10px] text-sand-300 text-center pt-3 pb-1">Drag tasks → Today's Focus</p>
          )}

          {subtasks.filter(s => !s.completed).map(s => (
            <SubtaskRow key={s.id} sub={s} onToggle={onToggleSub} onDelete={onDeleteSub} inFocus={focusIds.includes(s.id)} />
          ))}
          {subtasks.filter(s => s.completed).map(s => (
            <SubtaskRow key={s.id} sub={s} onToggle={onToggleSub} onDelete={onDeleteSub} inFocus={focusIds.includes(s.id)} />
          ))}

          <form onSubmit={submitSub} className="flex items-center gap-2 px-5 py-3 border-t border-sand-50">
            <Circle className="w-4 h-4 text-sand-200 shrink-0" />
            <input value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Add a task…"
              className="flex-1 text-sm bg-transparent text-sand-800 placeholder-sand-300 focus:outline-none"
            />
            {newSub && (
              <button type="submit" className="text-xs text-white px-3 py-1 rounded-lg font-medium transition-colors"
                style={{ background: accentColor }}>Add</button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Kanban card ─────────────────────────────────────────────────────────────
function KanbanCard({ project, subtasks, onToggle, onDelete }) {
  const done  = subtasks.filter(s => s.completed).length
  const total = subtasks.length
  const pct   = total ? Math.round((done / total) * 100) : 0
  const priority   = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.medium
  const accentColor = project.color || '#F0457A'
  const due = dueBadge(project.due_date)

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('project_id', String(project.id)); e.dataTransfer.effectAllowed = 'move' }}
      className={`bg-white rounded-xl border border-sand-200 overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${project.done ? 'opacity-60' : ''}`}
    >
      <div className="h-1" style={{ background: accentColor }} />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            onClick={() => onToggle(project)}
            className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
            style={project.done ? { background: accentColor, borderColor: accentColor } : { borderColor: accentColor + '88' }}
          >
            {project.done && <Check className="w-2.5 h-2.5 text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-tight ${project.done ? 'line-through text-sand-400' : 'text-sand-900'}`}>
              {project.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${priority.badge}`}>
                {project.priority}
              </span>
              {due && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${due.cls}`}>
                  {due.label}
                </span>
              )}
            </div>
            {total > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex-1 h-1 bg-sand-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accentColor }} />
                </div>
                <span className="text-[10px] text-sand-400 shrink-0">{done}/{total}</span>
              </div>
            )}
          </div>
          <button onClick={() => onDelete(project.id)}
            className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Kanban board ─────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { id: 'todo',        label: 'To Do',       bg: 'bg-sand-50',     border: 'border-sand-200',    hdr: 'text-sand-600',    dot: 'bg-sand-400'    },
  { id: 'in_progress', label: 'In Progress', bg: 'bg-orange-50',   border: 'border-orange-200',  hdr: 'text-orange-700',  dot: 'bg-orange-400'  },
  { id: 'done',        label: 'Done',        bg: 'bg-emerald-50',  border: 'border-emerald-200', hdr: 'text-emerald-700', dot: 'bg-emerald-400' },
]

function getProjectStatus(p) {
  if (p.done) return 'done'
  return p.status || 'todo'
}

function KanbanBoard({ projects, subtasks, onToggle, onDelete, onMoveStatus }) {
  const [dragOver, setDragOver] = useState(null)

  function handleDrop(e, colId) {
    e.preventDefault()
    setDragOver(null)
    const projectId = e.dataTransfer.getData('project_id')
    if (!projectId) return
    onMoveStatus(projectId, colId)
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {KANBAN_COLS.map(col => {
        const colProjects = projects.filter(p => getProjectStatus(p) === col.id)
        const isOver = dragOver === col.id
        return (
          <div
            key={col.id}
            onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }}
            onDrop={e => handleDrop(e, col.id)}
            className={`rounded-2xl border-2 min-h-[260px] flex flex-col transition-colors ${isOver ? 'border-blush-300 bg-blush-50/60' : `${col.bg} ${col.border}`}`}
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
              <h3 className={`text-xs font-bold uppercase tracking-widest ${col.hdr}`}>{col.label}</h3>
              <span className="ml-auto text-xs font-semibold text-sand-400 bg-white rounded-full px-2 py-0.5 border border-sand-200">
                {colProjects.length}
              </span>
            </div>
            {/* Cards */}
            <div className="px-3 pb-3 space-y-2 flex-1">
              {colProjects.length === 0 && (
                <p className={`text-xs text-center py-10 transition-colors ${isOver ? 'text-blush-400 font-medium' : 'text-sand-300'}`}>
                  {isOver ? '✨ Drop here' : 'No projects'}
                </p>
              )}
              {colProjects.map(p => (
                <KanbanCard
                  key={p.id}
                  project={p}
                  subtasks={subtasks.filter(s => s.project_id === p.id)}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
              {isOver && colProjects.length > 0 && (
                <div className="border-2 border-dashed border-blush-300 rounded-xl py-3 text-center">
                  <p className="text-xs text-blush-400 font-medium">Drop here</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
const WORK_SECS  = 25 * 60
const BREAK_SECS = 5 * 60

function Pomodoro() {
  const [mode, setMode]     = useState('idle')   // idle | work | break
  const [secs, setSecs]     = useState(WORK_SECS)
  const [session, setSession] = useState(0)
  const interval = useRef(null)

  useEffect(() => {
    if (mode === 'idle') { clearInterval(interval.current); return }
    interval.current = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          clearInterval(interval.current)
          if (mode === 'work') {
            popConfetti()
            setSession(n => n + 1)
            setMode('break')
            setSecs(BREAK_SECS)
            // auto-start break
            interval.current = setInterval(() => setSecs(s2 => {
              if (s2 <= 1) { clearInterval(interval.current); setMode('idle'); setSecs(WORK_SECS); return 0 }
              return s2 - 1
            }), 1000)
          } else {
            setMode('idle')
            setSecs(WORK_SECS)
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval.current)
  }, [mode])

  function start() { setSecs(WORK_SECS); setMode('work') }
  function stop()  { clearInterval(interval.current); setMode('idle'); setSecs(WORK_SECS) }

  const mins = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss   = String(secs % 60).padStart(2, '0')

  if (mode === 'idle') return (
    <button onClick={start}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blush-50 hover:bg-blush-100 border border-blush-200 rounded-xl text-blush-600 text-xs font-semibold transition-colors">
      <Timer className="w-3.5 h-3.5" /> Start 25-min focus
    </button>
  )

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
      mode === 'work' ? 'bg-blush-50 border-blush-200' : 'bg-emerald-50 border-emerald-200'
    }`}>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${mode === 'work' ? 'text-blush-400' : 'text-emerald-500'}`}>
          {mode === 'work' ? '🍅 Focus' : '☕ Break'}{session > 0 && ` · ${session} done`}
        </p>
        <p className={`text-2xl font-mono font-bold leading-none mt-0.5 ${mode === 'work' ? 'text-blush-600' : 'text-emerald-600'}`}>
          {mins}:{ss}
        </p>
      </div>
      <button onClick={stop}
        className="w-8 h-8 rounded-xl bg-white border border-sand-200 flex items-center justify-center text-sand-400 hover:text-sand-600 transition-colors">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Notepad ──────────────────────────────────────────────────────────────────
function Notepad({ subtasks, onToggleSub, recurringTasks, onAddRecurring, onDeleteRecurring }) {
  const [focusIds, setFocusIds]   = useState(getFocusIds)
  const [recDone, setRecDone]     = useState(getRecurringDone)
  const [isDragOver, setDragOver] = useState(false)
  const [showEditRec, setEditRec] = useState(false)
  const [newRec, setNewRec]       = useState('')

  const focusSubs    = focusIds.map(id => subtasks.find(s => s.id === id)).filter(Boolean)
  const incomplete   = focusSubs.filter(s => !s.completed)
  const complete     = focusSubs.filter(s => s.completed)
  const recIncomplete = recurringTasks.filter(r => !recDone.includes(r.id))
  const recComplete   = recurringTasks.filter(r => recDone.includes(r.id))

  // Confetti when all focus tasks done
  const allFocusDone = focusSubs.length > 0 && focusSubs.every(s => s.completed)
  const prevAllDone  = useRef(false)
  useEffect(() => {
    if (allFocusDone && !prevAllDone.current) popConfetti()
    prevAllDone.current = allFocusDone
  }, [allFocusDone])

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const id = e.dataTransfer.getData('subtask_id')
    if (!id || focusIds.includes(id)) return
    const ids = [...focusIds, id]; setFocusIds(ids); saveFocusIds(ids)
  }
  function removeFromFocus(id) {
    const ids = focusIds.filter(i => i !== id); setFocusIds(ids); saveFocusIds(ids)
  }
  function toggleRec(id) {
    const ids = recDone.includes(id) ? recDone.filter(i => i !== id) : [...recDone, id]
    setRecDone(ids); saveRecurringDone(ids)
    if (!recDone.includes(id)) bumpStreak()
  }
  async function submitRec(e) {
    e.preventDefault()
    if (!newRec.trim()) return
    await onAddRecurring(newRec.trim())
    setNewRec('')
  }

  const totalToday   = recurringTasks.length + focusSubs.length
  const doneToday    = recComplete.length + complete.length

  return (
    <div className="bg-[#FFFDF7] border border-amber-200 rounded-2xl overflow-hidden shadow-sm sticky top-6 space-y-0">

      {/* Header */}
      <div className="px-5 py-4 border-b border-amber-100">
        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Today's Focus</p>
        <p className="text-sm text-sand-500 mt-0.5">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
        {totalToday > 0 && (
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blush-400 to-blush-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneToday / totalToday) * 100}%` }} />
            </div>
            <span className="text-xs text-amber-600 font-semibold shrink-0">{doneToday}/{totalToday}</span>
          </div>
        )}
      </div>

      {/* ── Daily recurring ── */}
      <div className="border-b border-amber-100">
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Daily</p>
          </div>
          <button onClick={() => setEditRec(!showEditRec)}
            className="text-[10px] text-sand-400 hover:text-sand-600 transition-colors">
            {showEditRec ? 'Done' : 'Edit'}
          </button>
        </div>

        {recurringTasks.length === 0 && !showEditRec && (
          <p className="text-xs text-sand-300 text-center pb-4">No daily tasks — add some below</p>
        )}

        {recIncomplete.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-5 py-2 group hover:bg-amber-50/50 transition-colors">
            <button onClick={() => toggleRec(r.id)}
              className="w-4 h-4 rounded border-2 border-amber-300 hover:border-blush-400 flex items-center justify-center shrink-0 transition-colors" />
            <span className="flex-1 text-sm text-sand-800">{r.text}</span>
            {showEditRec && (
              <button onClick={() => onDeleteRecurring(r.id)} className="text-sand-300 hover:text-red-400 transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {recComplete.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-5 py-2 group opacity-40">
            <button onClick={() => toggleRec(r.id)}
              className="w-4 h-4 rounded border-2 bg-blush-400 border-blush-400 flex items-center justify-center shrink-0">
              <Check className="w-2.5 h-2.5 text-white" />
            </button>
            <span className="flex-1 text-sm text-sand-600 line-through">{r.text}</span>
          </div>
        ))}

        {showEditRec && (
          <form onSubmit={submitRec} className="flex items-center gap-2 px-5 py-2.5 border-t border-amber-100">
            <input value={newRec} onChange={e => setNewRec(e.target.value)}
              placeholder="Add daily task…"
              className="flex-1 text-xs bg-transparent text-sand-800 placeholder-sand-400 focus:outline-none" />
            <button type="submit" className="w-6 h-6 bg-blush-500 text-white rounded-lg flex items-center justify-center">
              <Plus className="w-3 h-3" />
            </button>
          </form>
        )}
      </div>

      {/* ── Pinned focus tasks ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`min-h-[120px] transition-colors ${isDragOver ? 'bg-blush-50' : ''}`}
      >
        <div className="flex items-center justify-between px-5 py-2.5">
          <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">Pinned</p>
          {focusSubs.length > 0 && (
            <button onClick={() => { setFocusIds([]); saveFocusIds([]) }}
              className="text-[10px] text-sand-300 hover:text-sand-500 transition-colors">Clear</button>
          )}
        </div>

        {focusSubs.length === 0 && (
          <div className={`flex flex-col items-center justify-center pb-6 px-5 text-center transition-colors ${isDragOver ? 'opacity-100' : 'opacity-60'}`}>
            <p className={`text-xs font-medium ${isDragOver ? 'text-blush-500' : 'text-sand-400'}`}>
              {isDragOver ? '✨ Drop to pin' : 'Drag tasks here from projects'}
            </p>
          </div>
        )}

        {isDragOver && focusSubs.length > 0 && (
          <div className="mx-4 py-1.5 border-2 border-dashed border-blush-300 rounded-xl text-center mb-1">
            <p className="text-xs text-blush-400 font-medium">Drop to add</p>
          </div>
        )}

        <div className="divide-y divide-amber-100/60">
          {incomplete.map(s => (
            <div key={s.id} className="flex items-start gap-3 px-5 py-2.5 group hover:bg-amber-50/50 transition-colors">
              <button onClick={() => { onToggleSub(s); bumpStreak() }}
                className="mt-0.5 w-4 h-4 rounded border-2 border-amber-300 hover:border-blush-400 flex items-center justify-center shrink-0 transition-colors" />
              <span className="flex-1 text-sm text-sand-800 leading-relaxed">{s.text}</span>
              <button onClick={() => removeFromFocus(s.id)}
                className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-sand-500 transition-all shrink-0 mt-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {complete.map(s => (
            <div key={s.id} className="flex items-start gap-3 px-5 py-2.5 group opacity-40">
              <button onClick={() => onToggleSub(s)}
                className="mt-0.5 w-4 h-4 rounded border-2 bg-blush-400 border-blush-400 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-white" />
              </button>
              <span className="flex-1 text-sm text-sand-600 line-through leading-relaxed">{s.text}</span>
              <button onClick={() => removeFromFocus(s.id)}
                className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-sand-500 transition-all shrink-0 mt-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pomodoro ── */}
      <div className="px-5 py-4 border-t border-amber-100">
        <Pomodoro />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TasksPage({ workspace = 'shaniah' }) {
  const [projects, setProjects]       = useState([])
  const [subtasks, setSubtasks]       = useState([])
  const [recurring, setRecurring]     = useState([])
  const [focusIds, setFocusIds]       = useState(getFocusIds)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showAddProject, setShowAdd]  = useState(false)
  const [newProject, setNewProject]   = useState({ name: '', priority: 'medium', due_date: '', color: '#F0457A' })
  const [view, setView]               = useState(() => localStorage.getItem(VIEW_KEY) || 'list')

  useEffect(() => {
    Promise.all([getProjects(workspace), getSubtasks(workspace), getRecurringTasks(workspace)])
      .then(([p, s, r]) => { setProjects(p); setSubtasks(s); setRecurring(r) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activeProjects = projects
    .filter(p => !p.done)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))

  async function handleAddProject(e) {
    e.preventDefault()
    if (!newProject.name.trim()) return
    try {
      const s = await addProject({ ...newProject, due_date: newProject.due_date || null, done: false, notes: '', workspace })
      setProjects(p => [...p, s])
      setNewProject({ name: '', priority: 'medium', due_date: '', color: '#F0457A' })
      setShowAdd(false)
    } catch (e) { setError(e.message) }
  }
  async function handleToggleProject(project) {
    const nowDone = !project.done
    const statusVal = nowDone ? 'done' : 'todo'
    try {
      await updateProject(project.id, { done: nowDone, status: statusVal })
      setProjects(p => p.map(pr => pr.id === project.id ? { ...pr, done: nowDone, status: statusVal } : pr))
    } catch (e) { setError(e.message) }
  }
  async function handleUpdateProject(id, updates) {
    try {
      await updateProject(id, updates)
      setProjects(p => p.map(pr => pr.id === id ? { ...pr, ...updates } : pr))
    } catch (e) { setError(e.message) }
  }
  async function handleDeleteProject(id) {
    try {
      await deleteProject(id)
      setProjects(p => p.filter(pr => pr.id !== id))
      setSubtasks(p => p.filter(s => s.project_id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleAddSub(projectId, text) {
    try { const s = await addSubtask({ project_id: projectId, text, completed: false, workspace }); setSubtasks(p => [...p, s]) }
    catch (e) { setError(e.message) }
  }
  async function handleToggleSub(sub) {
    try {
      await updateSubtask(sub.id, { completed: !sub.completed })
      setSubtasks(p => p.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s))
      bumpStreak()
    } catch (e) { setError(e.message) }
  }
  async function handleDeleteSub(id) {
    try {
      await deleteSubtask(id)
      setSubtasks(p => p.filter(s => s.id !== id))
      const ids = getFocusIds().filter(i => i !== id); saveFocusIds(ids); setFocusIds(ids)
    } catch (e) { setError(e.message) }
  }

  async function handleAddRecurring(text) {
    try { const r = await addRecurringTask(text, workspace); setRecurring(p => [...p, r]) }
    catch (e) { setError(e.message) }
  }
  async function handleDeleteRecurring(id) {
    try { await deleteRecurringTask(id); setRecurring(p => p.filter(r => r.id !== id)) }
    catch (e) { setError(e.message) }
  }

  async function handleMoveStatus(projectId, newStatus) {
    const id = parseInt(projectId, 10) || projectId
    const nowDone = newStatus === 'done'
    try {
      await updateProject(id, { done: nowDone, status: newStatus })
      setProjects(p => p.map(pr => pr.id === id ? { ...pr, done: nowDone, status: newStatus } : pr))
      if (nowDone) popConfetti()
    } catch (e) { setError(e.message) }
  }

  function switchView(v) { setView(v); localStorage.setItem(VIEW_KEY, v) }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Tasks</h1>
          <p className="text-sand-400 text-sm mt-0.5">{activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-sand-100 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => switchView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'list' ? 'bg-white text-sand-800 shadow-sm' : 'text-sand-400 hover:text-sand-600'}`}
            >
              <LayoutList className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => switchView('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'kanban' ? 'bg-white text-sand-800 shadow-sm' : 'text-sand-400 hover:text-sand-600'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
          </div>
          <button onClick={() => setShowAdd(!showAddProject)}
            className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* ── Add project form (shared between views) ── */}
      {showAddProject && (
        <div className="bg-white border-2 border-blush-200 rounded-2xl p-5 space-y-3 mb-5">
          <h3 className="font-semibold text-sand-900 text-sm">New Project</h3>
          <form onSubmit={handleAddProject} className="space-y-3">
            <input value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              placeholder="Project name…" autoFocus
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
            <div className="flex gap-2">
              {['high', 'medium', 'low'].map(p => (
                <button key={p} type="button"
                  onClick={() => setNewProject(prev => ({ ...prev, priority: p }))}
                  className={`flex-1 text-xs py-2 rounded-xl border font-semibold capitalize transition-colors ${
                    newProject.priority === p
                      ? p === 'high' ? 'bg-red-500 border-red-500 text-white'
                      : p === 'medium' ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-sand-400 border-sand-400 text-white'
                      : 'bg-white border-sand-200 text-sand-400 hover:border-sand-300'
                  }`}>{p}</button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5 items-center">
                {PROJECT_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setNewProject(p => ({ ...p, color: c }))}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: newProject.color === c ? '#1e293b' : 'transparent' }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="w-3.5 h-3.5 text-sand-400 shrink-0" />
                <input type="date" value={newProject.due_date}
                  onChange={e => setNewProject(p => ({ ...p, due_date: e.target.value }))}
                  className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-1.5 text-sand-800 focus:outline-none focus:ring-2 focus:ring-blush-200"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 text-sm text-sand-500 py-2 rounded-xl border border-sand-200 hover:bg-sand-50 transition-colors">Cancel</button>
              <button type="submit"
                className="flex-1 text-sm bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-xl font-semibold transition-colors">Create Project</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Kanban view ── */}
      {view === 'kanban' && (
        <div>
          {projects.length === 0 && !showAddProject && (
            <div className="bg-white border border-sand-200 rounded-2xl px-5 py-16 text-center">
              <p className="text-sand-400 text-sm">No projects yet</p>
              <button onClick={() => setShowAdd(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
                Create your first project →
              </button>
            </div>
          )}
          {projects.length > 0 && (
            <KanbanBoard
              projects={projects}
              subtasks={subtasks}
              onToggle={handleToggleProject}
              onDelete={handleDeleteProject}
              onMoveStatus={handleMoveStatus}
            />
          )}
        </div>
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {activeProjects.length === 0 && !showAddProject && (
              <div className="bg-white border border-sand-200 rounded-2xl px-5 py-16 text-center">
                <p className="text-sand-400 text-sm">No projects yet</p>
                <button onClick={() => setShowAdd(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
                  Create your first project →
                </button>
              </div>
            )}

            {activeProjects.map(p => (
              <ProjectPanel key={p.id} project={p}
                subtasks={subtasks.filter(s => s.project_id === p.id)}
                focusIds={focusIds}
                onToggle={handleToggleProject}
                onDelete={handleDeleteProject}
                onUpdate={handleUpdateProject}
                onAddSub={handleAddSub}
                onToggleSub={handleToggleSub}
                onDeleteSub={handleDeleteSub}
              />
            ))}

            {projects.filter(p => p.done).length > 0 && (
              <p className="text-xs text-sand-400 text-center pt-2">
                {projects.filter(p => p.done).length} completed project{projects.filter(p => p.done).length > 1 ? 's' : ''} hidden
              </p>
            )}
          </div>

          <div>
            <Notepad
              subtasks={subtasks}
              onToggleSub={handleToggleSub}
              recurringTasks={recurring}
              onAddRecurring={handleAddRecurring}
              onDeleteRecurring={handleDeleteRecurring}
            />
          </div>
        </div>
      )}
    </div>
  )
}
