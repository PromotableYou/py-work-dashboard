import { useState, useEffect, useRef } from 'react'
import { Plus, Check, Trash2, FileText, ChevronDown, ChevronUp, AlertCircle, Circle } from 'lucide-react'
import {
  getTasks, addTask, updateTask, deleteTask,
  getProjects, addProject, updateProject, deleteProject,
  getSubtasks, addSubtask, updateSubtask, deleteSubtask,
} from '../../lib/supabase'

const TODAY = new Date().toISOString().slice(0, 10)

const PRIORITY_STYLES = {
  high:   { dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600 border-red-200'    },
  medium: { dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-600 border-amber-200' },
  low:    { dot: 'bg-sand-300',   badge: 'bg-sand-50 text-sand-500 border-sand-200'  },
}

// ─── Subtask row inside a project ─────────────────────────────────────────────
function SubtaskRow({ sub, onToggle, onDelete }) {
  return (
    <div className={`flex items-start gap-3 px-5 py-2.5 group hover:bg-sand-50 transition-colors ${sub.completed ? 'opacity-50' : ''}`}>
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
      <button
        onClick={() => onDelete(sub.id)}
        className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Project panel ─────────────────────────────────────────────────────────────
function ProjectPanel({ project, subtasks, onToggle, onDelete, onUpdate, onAddSub, onToggleSub, onDeleteSub }) {
  const [expanded, setExpanded] = useState(true)
  const [newSub, setNewSub] = useState('')
  const [showNotes, setShowNotes] = useState(!!project.notes)
  const [notes, setNotes] = useState(project.notes || '')
  const notesTimer = useRef(null)

  const done = subtasks.filter(s => s.completed).length
  const total = subtasks.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const priority = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.medium

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
    <div className={`bg-white border border-sand-200 rounded-2xl overflow-hidden transition-all hover:shadow-sm ${project.done ? 'opacity-60' : ''}`}>

      {/* Project header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Complete button */}
          <button
            onClick={() => onToggle(project)}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              project.done ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
            }`}
          >
            {project.done && <Check className="w-3 h-3 text-white" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`w-2 h-2 rounded-full shrink-0 ${priority.dot}`} />
              <h3 className={`font-bold text-base ${project.done ? 'line-through text-sand-400' : 'text-sand-900'}`}>
                {project.name}
              </h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priority.badge}`}>
                {project.priority}
              </span>
            </div>

            {/* Progress */}
            {total > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-sand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blush-400 to-blush-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-sand-400 shrink-0">{done}/{total}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                notes ? 'text-blush-400 bg-blush-50' : 'text-sand-300 hover:text-sand-500 hover:bg-sand-50'
              }`}
              title="Project notes"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-400 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-sand-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notes area */}
        {showNotes && (
          <div className="mt-3 ml-8">
            <textarea
              value={notes}
              onChange={e => handleNotes(e.target.value)}
              placeholder="Add project notes, links, context…"
              rows={3}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200 resize-none leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Task list */}
      {expanded && (
        <div className="border-t border-sand-100">
          {subtasks.length === 0 && (
            <p className="text-sm text-sand-300 text-center py-5">No tasks yet — add one below</p>
          )}

          {/* Incomplete tasks */}
          {subtasks.filter(s => !s.completed).map(s => (
            <SubtaskRow key={s.id} sub={s} onToggle={onToggleSub} onDelete={onDeleteSub} />
          ))}

          {/* Completed tasks (dimmed, below) */}
          {subtasks.filter(s => s.completed).map(s => (
            <SubtaskRow key={s.id} sub={s} onToggle={onToggleSub} onDelete={onDeleteSub} />
          ))}

          {/* Add task input */}
          <form onSubmit={submitSub} className="flex items-center gap-2 px-5 py-3 border-t border-sand-50">
            <Circle className="w-4 h-4 text-sand-200 shrink-0" />
            <input
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              placeholder="Add a task…"
              className="flex-1 text-sm bg-transparent text-sand-800 placeholder-sand-300 focus:outline-none"
            />
            {newSub && (
              <button type="submit" className="text-xs bg-blush-500 hover:bg-blush-600 text-white px-3 py-1 rounded-lg font-medium transition-colors">
                Add
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Notepad (today quick list) ────────────────────────────────────────────────
function Notepad({ tasks, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({ text: text.trim(), type: 'daily', date: TODAY, completed: false, notes: '', project_id: null })
    setText('')
  }

  const incomplete = tasks.filter(t => !t.completed)
  const complete = tasks.filter(t => t.completed)

  return (
    <div className="bg-[#FFFDF7] border border-amber-200 rounded-2xl overflow-hidden shadow-sm sticky top-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-amber-100">
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-widest">Today</p>
        <p className="text-sm text-sand-500 mt-0.5">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
        </p>
      </div>

      {/* Tasks — notepad style */}
      <div className="divide-y divide-amber-100/60 min-h-[200px]">
        {incomplete.length === 0 && complete.length === 0 && (
          <p className="text-sm text-sand-300 text-center py-8">Nothing yet today</p>
        )}
        {incomplete.map(t => (
          <div key={t.id} className="flex items-start gap-3 px-5 py-3 group hover:bg-amber-50/50 transition-colors">
            <button
              onClick={() => onToggle(t)}
              className="mt-0.5 w-4 h-4 rounded border-2 border-amber-300 hover:border-blush-400 flex items-center justify-center shrink-0 transition-colors"
            />
            <span className="flex-1 text-sm text-sand-800 leading-relaxed">{t.text}</span>
            <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {complete.map(t => (
          <div key={t.id} className="flex items-start gap-3 px-5 py-3 group opacity-40 hover:bg-amber-50/50 transition-colors">
            <button
              onClick={() => onToggle(t)}
              className="mt-0.5 w-4 h-4 rounded border-2 bg-blush-400 border-blush-400 flex items-center justify-center shrink-0"
            >
              <Check className="w-2.5 h-2.5 text-white" />
            </button>
            <span className="flex-1 text-sm text-sand-600 line-through leading-relaxed">{t.text}</span>
            <button onClick={() => onDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add input */}
      <form onSubmit={submit} className="border-t border-amber-100 px-5 py-3 flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add to today…"
          className="flex-1 text-sm bg-transparent text-sand-800 placeholder-sand-400 focus:outline-none"
        />
        <button type="submit" className="w-7 h-7 bg-blush-500 hover:bg-blush-600 text-white rounded-lg flex items-center justify-center transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', priority: 'high' })

  useEffect(() => {
    Promise.all([getTasks(), getProjects(), getSubtasks()])
      .then(([t, p, s]) => { setTasks(t); setProjects(p); setSubtasks(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const todayTasks = tasks.filter(t => t.type === 'daily' && t.date === TODAY)
  const activeProjects = projects
    .filter(p => !p.done)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))

  // ── Tasks ──
  async function handleAddTask(data) {
    try { const s = await addTask(data); setTasks(p => [...p, s]) }
    catch (e) { setError(e.message) }
  }
  async function handleToggleTask(task) {
    try {
      await updateTask(task.id, { completed: !task.completed })
      setTasks(p => p.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
    } catch (e) { setError(e.message) }
  }
  async function handleDeleteTask(id) {
    try { await deleteTask(id); setTasks(p => p.filter(t => t.id !== id)) }
    catch (e) { setError(e.message) }
  }

  // ── Projects ──
  async function handleAddProject(e) {
    e.preventDefault()
    if (!newProject.name.trim()) return
    try {
      const s = await addProject({ ...newProject, done: false, notes: '' })
      setProjects(p => [...p, s])
      setNewProject({ name: '', priority: 'high' })
      setShowAddProject(false)
    } catch (e) { setError(e.message) }
  }
  async function handleToggleProject(project) {
    try {
      await updateProject(project.id, { done: !project.done })
      setProjects(p => p.map(pr => pr.id === project.id ? { ...pr, done: !pr.done } : pr))
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

  // ── Subtasks ──
  async function handleAddSub(projectId, text) {
    try { const s = await addSubtask({ project_id: projectId, text, completed: false }); setSubtasks(p => [...p, s]) }
    catch (e) { setError(e.message) }
  }
  async function handleToggleSub(sub) {
    try {
      await updateSubtask(sub.id, { completed: !sub.completed })
      setSubtasks(p => p.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s))
    } catch (e) { setError(e.message) }
  }
  async function handleDeleteSub(id) {
    try { await deleteSubtask(id); setSubtasks(p => p.filter(s => s.id !== id)) }
    catch (e) { setError(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Tasks</h1>
          <p className="text-sand-400 text-sm mt-0.5">{activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddProject(!showAddProject)}
          className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Projects — left 2/3 */}
        <div className="lg:col-span-2 space-y-4">

          {/* Add project form */}
          {showAddProject && (
            <div className="bg-white border-2 border-blush-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-sand-900 text-sm">New Project</h3>
              <form onSubmit={handleAddProject} className="space-y-3">
                <input
                  value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                  placeholder="Project name…"
                  autoFocus
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
                      }`}
                    >{p}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddProject(false)} className="flex-1 text-sm text-sand-500 py-2 rounded-xl border border-sand-200 hover:bg-sand-50 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 text-sm bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-xl font-semibold transition-colors">Create Project</button>
                </div>
              </form>
            </div>
          )}

          {/* Project panels */}
          {activeProjects.length === 0 && !showAddProject && (
            <div className="bg-white border border-sand-200 rounded-2xl px-5 py-16 text-center">
              <p className="text-sand-400 text-sm">No projects yet</p>
              <button onClick={() => setShowAddProject(true)} className="text-blush-500 text-sm font-medium mt-2 hover:text-blush-600">
                Create your first project →
              </button>
            </div>
          )}

          {activeProjects.map(p => (
            <ProjectPanel
              key={p.id}
              project={p}
              subtasks={subtasks.filter(s => s.project_id === p.id)}
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

        {/* Notepad — right 1/3 */}
        <div>
          <Notepad
            tasks={todayTasks}
            onAdd={handleAddTask}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
          />
        </div>
      </div>
    </div>
  )
}
