import { useState, useEffect, useRef } from 'react'
import { Plus, Check, Trash2, Star, AlertCircle, ChevronDown, ChevronUp, FileText, GripVertical } from 'lucide-react'
import {
  getTasks, addTask, updateTask, deleteTask,
  getProjects, addProject, updateProject, deleteProject,
  getSubtasks, addSubtask, updateSubtask, deleteSubtask,
} from '../../lib/supabase'

const TODAY = new Date().toISOString().slice(0, 10)

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Draggable Task Item ──────────────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete, onUpdate, draggable, onDragStart }) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')
  const saveTimer = useRef(null)

  function handleNotesChange(val) {
    setNotes(val)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onUpdate(task.id, { notes: val }), 600)
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`group rounded-xl border transition-all ${
        task.completed ? 'opacity-50 bg-sand-50 border-sand-100' : 'bg-white border-sand-200 hover:border-sand-300'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {draggable && (
          <GripVertical className="w-3.5 h-3.5 text-sand-300 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <button
          onClick={() => onToggle(task)}
          className={`mt-0.5 w-4.5 h-4.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            task.completed ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className={`flex-1 text-sm leading-relaxed ${task.completed ? 'line-through text-sand-400' : 'text-sand-800'}`}>
          {task.text}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {onUpdate && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`opacity-0 group-hover:opacity-100 transition-all p-1 rounded ${
                (task.notes || notes) ? 'opacity-100 text-blush-400' : 'text-sand-300 hover:text-sand-500'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all p-1 rounded">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {showNotes && (
        <div className="px-3 pb-3 pt-0">
          <textarea
            value={notes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Add notes…"
            rows={2}
            className="w-full text-xs bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200 resize-none leading-relaxed"
          />
        </div>
      )}
    </div>
  )
}

// ─── Add Task Input ───────────────────────────────────────────────────────────
function AddTaskInput({ onAdd, placeholder = 'Add a task…', asType = 'daily' }) {
  const [text, setText] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({ text: text.trim(), type: asType, date: asType === 'daily' ? TODAY : null, completed: false, notes: '' })
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:border-blush-300 transition-all"
      />
      <button type="submit" className="w-8 h-8 bg-blush-500 hover:bg-blush-600 text-white rounded-lg flex items-center justify-center transition-colors shrink-0">
        <Plus className="w-4 h-4" />
      </button>
    </form>
  )
}

// ─── Project Card with subtasks ───────────────────────────────────────────────
function ProjectCard({ project, subtasks, onToggle, onDelete, onAddSub, onToggleSub, onDeleteSub, onUpdateProject }) {
  const [expanded, setExpanded] = useState(true)
  const [newSub, setNewSub] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(project.notes || '')
  const notesTimer = useRef(null)

  const done = subtasks.filter(s => s.completed).length
  const total = subtasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  const PRIORITY_STYLES = {
    high:   'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low:    'bg-sand-100 text-sand-600 border-sand-200',
  }

  function handleNotesChange(val) {
    setNotes(val)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => onUpdateProject(project.id, { notes: val }), 600)
  }

  function submitSub(e) {
    e.preventDefault()
    if (!newSub.trim()) return
    onAddSub(project.id, newSub.trim())
    setNewSub('')
  }

  return (
    <div className={`rounded-2xl border transition-all ${project.done ? 'opacity-50 border-sand-100' : 'border-sand-200 hover:border-sand-300 hover:shadow-sm'}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <button
              onClick={() => onToggle(project)}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                project.done ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
              }`}
            >
              {project.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold text-sm ${project.done ? 'line-through text-sand-400' : 'text-sand-900'}`}>
                {project.name}
              </p>
              {total > 0 && (
                <p className="text-xs text-sand-400 mt-0.5">{done}/{total} tasks · {pct}%</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.medium}`}>
              {project.priority}
            </span>
            <button onClick={() => setExpanded(!expanded)} className="w-6 h-6 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-400 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onDelete(project.id)} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-sand-300 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-1.5 bg-sand-100 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-blush-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Expanded: notes + subtasks */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-sand-100 pt-3">
          {/* Notes */}
          <div>
            <button
              onClick={() => setEditingNotes(!editingNotes)}
              className="flex items-center gap-1 text-xs text-sand-400 hover:text-sand-600 transition-colors"
            >
              <FileText className="w-3 h-3" />
              {notes ? 'Edit notes' : 'Add project notes'}
            </button>
            {(editingNotes || notes) && (
              <textarea
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Project notes, links, context…"
                rows={2}
                className="mt-1.5 w-full text-xs bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200 resize-none"
              />
            )}
          </div>

          {/* Subtasks */}
          <div className="space-y-1">
            {subtasks.map(s => (
              <div key={s.id} className={`flex items-center gap-2 group py-1.5 px-2 rounded-lg ${s.completed ? 'opacity-50' : 'hover:bg-sand-50'}`}>
                <button
                  onClick={() => onToggleSub(s)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    s.completed ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
                  }`}
                >
                  {s.completed && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <span className={`flex-1 text-xs ${s.completed ? 'line-through text-sand-400' : 'text-sand-700'}`}>{s.text}</span>
                <button onClick={() => onDeleteSub(s.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add subtask */}
          <form onSubmit={submitSub} className="flex items-center gap-2">
            <input
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              placeholder="Add a task to this project…"
              className="flex-1 text-xs bg-sand-50 border border-sand-100 rounded-lg px-3 py-1.5 text-sand-800 placeholder-sand-300 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
            <button type="submit" className="w-7 h-7 bg-sand-200 hover:bg-blush-100 hover:text-blush-600 text-sand-600 rounded-lg flex items-center justify-center transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Drop Zone ─────────────────────────────────────────────────────────────────
function TaskDropZone({ onDrop }) {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop() }}
      className={`border-2 border-dashed rounded-xl py-3 text-center text-xs transition-all ${
        over ? 'border-blush-400 bg-blush-50 text-blush-500' : 'border-sand-200 text-sand-300'
      }`}
    >
      {over ? 'Drop here' : 'Drag tasks here'}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TodayPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draggedTask, setDraggedTask] = useState(null)
  const [newProject, setNewProject] = useState({ name: '', notes: '', priority: 'high' })
  const [showAddProject, setShowAddProject] = useState(false)

  useEffect(() => {
    Promise.all([getTasks(), getProjects(), getSubtasks()])
      .then(([t, p, s]) => { setTasks(t); setProjects(p); setSubtasks(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dailyTasks = tasks.filter(t => t.type === 'daily' && t.date === TODAY)
  const weeklyTasks = tasks.filter(t => t.type === 'weekly')
  const wipTasks = tasks.filter(t => t.type === 'wip')
  const doneToday = dailyTasks.filter(t => t.completed).length
  const activeProjects = projects.filter(p => !p.done)

  // ── Task CRUD ──
  async function handleAddTask(taskData) {
    try {
      const saved = await addTask(taskData)
      setTasks(prev => [...prev, saved])
    } catch (e) { setError(e.message) }
  }

  async function handleToggleTask(task) {
    try {
      await updateTask(task.id, { completed: !task.completed })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
    } catch (e) { setError(e.message) }
  }

  async function handleUpdateTask(id, updates) {
    try {
      await updateTask(id, updates)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteTask(id) {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (e) { setError(e.message) }
  }

  // ── Drag: move weekly → today ──
  async function moveToToday() {
    if (!draggedTask) return
    const updates = { type: 'daily', date: TODAY }
    try {
      await updateTask(draggedTask.id, updates)
      setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, ...updates } : t))
    } catch (e) { setError(e.message) }
    setDraggedTask(null)
  }

  // ── Drag: move today → weekly ──
  async function moveToWeek() {
    if (!draggedTask) return
    const updates = { type: 'weekly', date: null }
    try {
      await updateTask(draggedTask.id, updates)
      setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, ...updates } : t))
    } catch (e) { setError(e.message) }
    setDraggedTask(null)
  }

  // ── Project CRUD ──
  async function handleAddProject(e) {
    e.preventDefault()
    if (!newProject.name.trim()) return
    try {
      const saved = await addProject({ ...newProject, done: false })
      setProjects(prev => [...prev, saved])
      setNewProject({ name: '', notes: '', priority: 'high' })
      setShowAddProject(false)
    } catch (e) { setError(e.message) }
  }

  async function handleToggleProject(project) {
    try {
      await updateProject(project.id, { done: !project.done })
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, done: !p.done } : p))
    } catch (e) { setError(e.message) }
  }

  async function handleUpdateProject(id, updates) {
    try {
      await updateProject(id, updates)
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteProject(id) {
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
      setSubtasks(prev => prev.filter(s => s.project_id !== id))
    } catch (e) { setError(e.message) }
  }

  // ── Subtask CRUD ──
  async function handleAddSubtask(projectId, text) {
    try {
      const saved = await addSubtask({ project_id: projectId, text, completed: false })
      setSubtasks(prev => [...prev, saved])
    } catch (e) { setError(e.message) }
  }

  async function handleToggleSubtask(sub) {
    try {
      await updateSubtask(sub.id, { completed: !sub.completed })
      setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s))
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteSubtask(id) {
    try {
      await deleteSubtask(id)
      setSubtasks(prev => prev.filter(s => s.id !== id))
    } catch (e) { setError(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <p className="text-sand-400 text-sm font-medium">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold text-sand-900 mt-0.5">{greeting()}, Shaniah</h1>
        {dailyTasks.length > 0 && (
          <p className="text-sm text-sand-400 mt-1">
            {doneToday} of {dailyTasks.length} tasks done today
            {doneToday === dailyTasks.length && dailyTasks.length > 0 && ' 🎉'}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Tasks */}
        <div className="lg:col-span-2 space-y-4">

          {/* Today + This Week side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Today's Tasks */}
            <div className="bg-white border border-sand-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blush-100 rounded-lg flex items-center justify-center">
                  <Check className="w-4 h-4 text-blush-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-sand-900 text-sm">Today</h2>
                  {dailyTasks.length > 0 && (
                    <div className="h-1 bg-sand-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blush-400 rounded-full transition-all"
                        style={{ width: `${(doneToday / dailyTasks.length) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 min-h-[60px]">
                {dailyTasks.length === 0 && (
                  <p className="text-xs text-sand-300 py-2 text-center">Nothing yet</p>
                )}
                {dailyTasks.map(t => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onUpdate={handleUpdateTask}
                    draggable
                    onDragStart={() => setDraggedTask(t)}
                  />
                ))}
              </div>

              {draggedTask?.type === 'daily' && (
                <div className="mt-2">
                  <TaskDropZone onDrop={moveToWeek} />
                  <p className="text-[10px] text-sand-400 text-center mt-1">drop to move to this week</p>
                </div>
              )}

              <AddTaskInput onAdd={handleAddTask} placeholder="Add to today…" asType="daily" />
            </div>

            {/* This Week */}
            <div className="bg-white border border-sand-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-sand-900 text-sm">This Week</h2>
                  <p className="text-[10px] text-sand-400">Drag to Today when ready</p>
                </div>
              </div>

              <div className="space-y-1.5 min-h-[60px]">
                {weeklyTasks.length === 0 && (
                  <p className="text-xs text-sand-300 py-2 text-center">Nothing planned yet</p>
                )}
                {weeklyTasks.map(t => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onUpdate={handleUpdateTask}
                    draggable
                    onDragStart={() => setDraggedTask(t)}
                  />
                ))}
              </div>

              {draggedTask?.type === 'weekly' && (
                <div className="mt-2">
                  <TaskDropZone onDrop={moveToToday} />
                  <p className="text-[10px] text-sand-400 text-center mt-1">drop to move to today</p>
                </div>
              )}

              <AddTaskInput onAdd={handleAddTask} placeholder="Add to this week…" asType="weekly" />
            </div>
          </div>

          {/* Work In Progress */}
          <div className="bg-white border border-sand-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h2 className="font-semibold text-sand-900 text-sm">Work in Progress</h2>
                <p className="text-[10px] text-sand-400">Chip away at these when you get a sec</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {wipTasks.length === 0 && (
                <p className="text-xs text-sand-300 py-2 text-center">Nothing in progress</p>
              )}
              {wipTasks.map(t => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                  onUpdate={handleUpdateTask}
                />
              ))}
            </div>
            <AddTaskInput onAdd={handleAddTask} placeholder="Add something you're chipping away at…" asType="wip" />
          </div>
        </div>

        {/* Right: Projects */}
        <div className="space-y-4">
          <div className="bg-white border border-sand-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-sand-900 text-sm">Projects</h2>
                  <p className="text-[10px] text-sand-400">{activeProjects.length} active</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProject(!showAddProject)}
                className="w-7 h-7 bg-sand-100 hover:bg-sand-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4 text-sand-600" />
              </button>
            </div>

            {showAddProject && (
              <form onSubmit={handleAddProject} className="mb-4 p-3 bg-sand-50 rounded-xl space-y-2 border border-sand-200">
                <input
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  placeholder="Project name…"
                  className="w-full text-sm bg-white border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
                />
                <div className="flex gap-1.5">
                  {['high', 'medium', 'low'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewProject(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 text-xs py-1.5 rounded-lg border font-medium capitalize transition-colors ${
                        newProject.priority === p
                          ? p === 'high' ? 'bg-red-100 border-red-300 text-red-700'
                          : p === 'medium' ? 'bg-amber-100 border-amber-300 text-amber-700'
                          : 'bg-sand-200 border-sand-300 text-sand-700'
                          : 'bg-white border-sand-200 text-sand-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button type="submit" className="w-full bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Add Project
                </button>
              </form>
            )}

            <div className="space-y-3">
              {activeProjects.length === 0 && (
                <p className="text-sm text-sand-400 text-center py-4">No active projects</p>
              )}
              {activeProjects
                .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))
                .map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    subtasks={subtasks.filter(s => s.project_id === p.id)}
                    onToggle={handleToggleProject}
                    onDelete={handleDeleteProject}
                    onAddSub={handleAddSubtask}
                    onToggleSub={handleToggleSubtask}
                    onDeleteSub={handleDeleteSubtask}
                    onUpdateProject={handleUpdateProject}
                  />
                ))
              }
            </div>

            {projects.filter(p => p.done).length > 0 && (
              <p className="text-xs text-sand-400 text-center mt-3">
                {projects.filter(p => p.done).length} completed project{projects.filter(p => p.done).length > 1 ? 's' : ''} hidden
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
