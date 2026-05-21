import { useState, useEffect, useRef } from 'react'
import { Plus, Check, Trash2, FileText, Star, ChevronDown, ChevronUp, AlertCircle, Tag } from 'lucide-react'
import {
  getTasks, addTask, updateTask, deleteTask,
  getProjects, addProject, updateProject, deleteProject,
  getSubtasks, addSubtask, updateSubtask, deleteSubtask,
} from '../../lib/supabase'

const TODAY = new Date().toISOString().slice(0, 10)

const PRIORITY_BADGE = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-sand-100 text-sand-600 border-sand-200',
}

const PRIORITY_DOT = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-sand-300',
}

// ─── Task row ──────────────────────────────────────────────────────────────
function TaskRow({ task, projects, onToggle, onDelete, onUpdate }) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')
  const timer = useRef(null)

  function handleNotes(val) {
    setNotes(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onUpdate(task.id, { notes: val }), 600)
  }

  const project = projects.find(p => p.id === task.project_id)

  return (
    <div className={`group border-b border-sand-50 last:border-0 transition-all ${task.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => onToggle(task)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            task.completed ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
          }`}
        >
          {task.completed && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className={`flex-1 text-sm ${task.completed ? 'line-through text-sand-400' : 'text-sand-800'}`}>{task.text}</span>
        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {project && (
            <span className="text-[10px] font-semibold bg-blush-50 text-blush-600 border border-blush-200 px-2 py-0.5 rounded-full">
              {project.name}
            </span>
          )}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-1 rounded transition-colors ${notes ? 'text-blush-400' : 'text-sand-300 hover:text-sand-500'}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1 rounded text-sand-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {project && (
          <span className="text-[10px] font-semibold bg-blush-50 text-blush-600 border border-blush-200 px-2 py-0.5 rounded-full group-hover:hidden">
            {project.name}
          </span>
        )}
      </div>
      {showNotes && (
        <div className="px-4 pb-3">
          <textarea
            value={notes}
            onChange={e => handleNotes(e.target.value)}
            placeholder="Add notes…"
            rows={2}
            className="w-full text-xs bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200 resize-none"
          />
        </div>
      )}
    </div>
  )
}

// ─── Add task form ─────────────────────────────────────────────────────────
function AddTaskForm({ onAdd, projects, defaultType, defaultProjectId = null, placeholder }) {
  const [text, setText] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [showProject, setShowProject] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({
      text: text.trim(),
      type: defaultType,
      date: defaultType === 'daily' ? TODAY : null,
      completed: false,
      notes: '',
      project_id: projectId || null,
    })
    setText('')
    if (!defaultProjectId) setProjectId(null)
  }

  return (
    <form onSubmit={submit} className="px-4 pb-3 pt-2 border-t border-sand-100">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={placeholder || 'Add a task…'}
          className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
        />
        {!defaultProjectId && projects.length > 0 && (
          <button
            type="button"
            onClick={() => setShowProject(!showProject)}
            className={`p-2 rounded-lg border transition-colors ${projectId ? 'bg-blush-50 border-blush-200 text-blush-500' : 'border-sand-200 text-sand-400 hover:border-sand-300'}`}
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
        )}
        <button type="submit" className="w-8 h-8 bg-blush-500 hover:bg-blush-600 text-white rounded-lg flex items-center justify-center transition-colors shrink-0">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {showProject && !defaultProjectId && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setProjectId(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!projectId ? 'bg-blush-500 text-white border-blush-500' : 'border-sand-200 text-sand-500'}`}
          >
            No project
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProjectId(p.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${projectId === p.id ? 'bg-blush-500 text-white border-blush-500' : 'border-sand-200 text-sand-500'}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
    </form>
  )
}

// ─── Project card ──────────────────────────────────────────────────────────
function ProjectCard({ project, subtasks, onToggle, onDelete, onAddSub, onToggleSub, onDeleteSub, onUpdate }) {
  const [expanded, setExpanded] = useState(true)
  const [newSub, setNewSub] = useState('')
  const [notes, setNotes] = useState(project.notes || '')
  const [showNotes, setShowNotes] = useState(false)
  const timer = useRef(null)

  const done = subtasks.filter(s => s.completed).length
  const total = subtasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  function handleNotes(val) {
    setNotes(val)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onUpdate(project.id, { notes: val }), 600)
  }

  function submitSub(e) {
    e.preventDefault()
    if (!newSub.trim()) return
    onAddSub(project.id, newSub.trim())
    setNewSub('')
  }

  return (
    <div className={`bg-white border border-sand-200 rounded-2xl overflow-hidden transition-all hover:shadow-sm ${project.done ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={() => onToggle(project)}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                project.done ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
              }`}
            >
              {project.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-semibold text-sm ${project.done ? 'line-through text-sand-400' : 'text-sand-900'}`}>{project.name}</p>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[project.priority] || PRIORITY_BADGE.medium}`}>
                  {project.priority}
                </span>
              </div>
              {total > 0 && (
                <p className="text-xs text-sand-400 mt-0.5">{done}/{total} tasks · {pct}%</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${notes ? 'text-blush-400' : 'text-sand-300 hover:text-sand-500'}`}
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 rounded-lg hover:bg-sand-100 flex items-center justify-center text-sand-400 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onDelete(project.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-sand-300 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {total > 0 && (
          <div className="h-1.5 bg-sand-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blush-400 to-blush-500 rounded-full transition-all" style={{ width: `${Math.max(pct, total ? 2 : 0)}%` }} />
          </div>
        )}

        {showNotes && (
          <textarea
            value={notes}
            onChange={e => handleNotes(e.target.value)}
            placeholder="Project notes, links, context…"
            rows={2}
            className="mt-3 w-full text-xs bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-700 placeholder-sand-300 focus:outline-none focus:ring-2 focus:ring-blush-200 resize-none"
          />
        )}
      </div>

      {/* Subtasks */}
      {expanded && (
        <div className="border-t border-sand-100">
          {subtasks.length > 0 && (
            <div className="divide-y divide-sand-50">
              {subtasks.map(s => (
                <div key={s.id} className={`flex items-center gap-3 px-5 py-2.5 group ${s.completed ? 'opacity-50' : 'hover:bg-sand-50'}`}>
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
          )}
          <form onSubmit={submitSub} className="flex items-center gap-2 px-5 py-3">
            <input
              value={newSub}
              onChange={e => setNewSub(e.target.value)}
              placeholder="Add a task to this project…"
              className="flex-1 text-xs bg-sand-50 border border-sand-100 rounded-lg px-3 py-1.5 text-sand-800 placeholder-sand-300 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
            <button type="submit" className="w-7 h-7 bg-sand-100 hover:bg-blush-100 hover:text-blush-600 text-sand-600 rounded-lg flex items-center justify-center transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wipFilter, setWipFilter] = useState('all')
  const [newProject, setNewProject] = useState({ name: '', priority: 'high' })
  const [showAddProject, setShowAddProject] = useState(false)

  useEffect(() => {
    Promise.all([getTasks(), getProjects(), getSubtasks()])
      .then(([t, p, s]) => { setTasks(t); setProjects(p); setSubtasks(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const quickTasks = tasks.filter(t => t.type === 'daily' || t.type === 'weekly')
  const wipTasks = tasks.filter(t => t.type === 'wip')
  const activeProjects = projects.filter(p => !p.done)
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))

  const filteredWip = wipFilter === 'all'
    ? wipTasks
    : wipFilter === 'none'
    ? wipTasks.filter(t => !t.project_id)
    : wipTasks.filter(t => t.project_id === wipFilter)

  async function handleAddTask(taskData) {
    try { const saved = await addTask(taskData); setTasks(p => [...p, saved]) }
    catch (e) { setError(e.message) }
  }

  async function handleToggleTask(task) {
    try {
      await updateTask(task.id, { completed: !task.completed })
      setTasks(p => p.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
    } catch (e) { setError(e.message) }
  }

  async function handleUpdateTask(id, updates) {
    try { await updateTask(id, updates); setTasks(p => p.map(t => t.id === id ? { ...t, ...updates } : t)) }
    catch (e) { setError(e.message) }
  }

  async function handleDeleteTask(id) {
    try { await deleteTask(id); setTasks(p => p.filter(t => t.id !== id)) }
    catch (e) { setError(e.message) }
  }

  async function handleAddProject(e) {
    e.preventDefault()
    if (!newProject.name.trim()) return
    try {
      const saved = await addProject({ ...newProject, done: false, notes: '' })
      setProjects(p => [...p, saved])
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
    try { await updateProject(id, updates); setProjects(p => p.map(pr => pr.id === id ? { ...pr, ...updates } : pr)) }
    catch (e) { setError(e.message) }
  }

  async function handleDeleteProject(id) {
    try {
      await deleteProject(id)
      setProjects(p => p.filter(pr => pr.id !== id))
      setSubtasks(p => p.filter(s => s.project_id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleAddSubtask(projectId, text) {
    try { const saved = await addSubtask({ project_id: projectId, text, completed: false }); setSubtasks(p => [...p, saved]) }
    catch (e) { setError(e.message) }
  }

  async function handleToggleSubtask(sub) {
    try {
      await updateSubtask(sub.id, { completed: !sub.completed })
      setSubtasks(p => p.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s))
    } catch (e) { setError(e.message) }
  }

  async function handleDeleteSubtask(id) {
    try { await deleteSubtask(id); setSubtasks(p => p.filter(s => s.id !== id)) }
    catch (e) { setError(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-xl font-bold text-sand-900">Tasks</h1>
        <p className="text-sand-400 text-sm mt-0.5">
          {quickTasks.filter(t => !t.completed).length} quick tasks · {wipTasks.filter(t => !t.completed).length} in progress · {activeProjects.length} projects
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Quick to-do + WIP */}
        <div className="lg:col-span-2 space-y-5">

          {/* Quick to-do */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-sand-100 flex items-center gap-2">
              <Check className="w-4 h-4 text-blush-400" />
              <h2 className="font-semibold text-sand-900 text-sm">Quick To-Do</h2>
              <span className="text-xs text-sand-400 ml-auto">Today + this week</span>
            </div>
            {quickTasks.length > 0
              ? <div className="divide-y divide-sand-50">
                  {quickTasks.map(t => (
                    <TaskRow key={t.id} task={t} projects={projects} onToggle={handleToggleTask} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                  ))}
                </div>
              : <p className="text-sm text-sand-400 text-center py-6">Nothing here yet</p>
            }
            <div className="border-t border-sand-100">
              <AddTaskForm onAdd={handleAddTask} projects={[]} defaultType="daily" placeholder="Add a quick task for today…" />
            </div>
          </div>

          {/* WIP */}
          <div className="bg-white border border-sand-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-sand-100 flex items-center gap-2 flex-wrap">
              <Star className="w-4 h-4 text-purple-400" />
              <h2 className="font-semibold text-sand-900 text-sm">Work in Progress</h2>
              <div className="flex gap-1.5 ml-auto flex-wrap">
                <button
                  onClick={() => setWipFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${wipFilter === 'all' ? 'bg-blush-500 text-white border-blush-500' : 'border-sand-200 text-sand-500'}`}
                >All</button>
                <button
                  onClick={() => setWipFilter('none')}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${wipFilter === 'none' ? 'bg-blush-500 text-white border-blush-500' : 'border-sand-200 text-sand-500'}`}
                >No project</button>
                {activeProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setWipFilter(p.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${wipFilter === p.id ? 'bg-blush-500 text-white border-blush-500' : 'border-sand-200 text-sand-500'}`}
                  >{p.name}</button>
                ))}
              </div>
            </div>
            {filteredWip.length > 0
              ? <div className="divide-y divide-sand-50">
                  {filteredWip.map(t => (
                    <TaskRow key={t.id} task={t} projects={projects} onToggle={handleToggleTask} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                  ))}
                </div>
              : <p className="text-sm text-sand-400 text-center py-6">Nothing here</p>
            }
            <div className="border-t border-sand-100">
              <AddTaskForm onAdd={handleAddTask} projects={activeProjects} defaultType="wip" placeholder="Add something you're working on…" />
            </div>
          </div>
        </div>

        {/* Right: Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sand-900 text-sm">Projects</h2>
            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="flex items-center gap-1 text-xs text-blush-500 hover:text-blush-600 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> New project
            </button>
          </div>

          {showAddProject && (
            <form onSubmit={handleAddProject} className="bg-white border border-sand-200 rounded-2xl p-4 space-y-2">
              <input
                value={newProject.name}
                onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                placeholder="Project name…"
                className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-1.5">
                {['high', 'medium', 'low'].map(p => (
                  <button key={p} type="button"
                    onClick={() => setNewProject(prev => ({ ...prev, priority: p }))}
                    className={`flex-1 text-xs py-1.5 rounded-lg border font-medium capitalize transition-colors ${
                      newProject.priority === p
                        ? p === 'high' ? 'bg-red-100 border-red-300 text-red-700'
                        : p === 'medium' ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'bg-sand-200 border-sand-300 text-sand-700'
                        : 'bg-white border-sand-200 text-sand-400'
                    }`}
                  >{p}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddProject(false)} className="flex-1 text-xs text-sand-500 py-2 rounded-lg border border-sand-200 hover:bg-sand-50">Cancel</button>
                <button type="submit" className="flex-1 text-xs bg-blush-500 hover:bg-blush-600 text-white py-2 rounded-lg font-medium transition-colors">Add</button>
              </div>
            </form>
          )}

          {activeProjects.length === 0 && !showAddProject && (
            <div className="bg-white border border-sand-200 rounded-2xl px-4 py-8 text-center">
              <p className="text-sand-400 text-sm">No active projects</p>
            </div>
          )}

          {activeProjects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              subtasks={subtasks.filter(s => s.project_id === p.id)}
              onToggle={handleToggleProject}
              onDelete={handleDeleteProject}
              onAddSub={handleAddSubtask}
              onToggleSub={handleToggleSubtask}
              onDeleteSub={handleDeleteSubtask}
              onUpdate={handleUpdateProject}
            />
          ))}

          {projects.filter(p => p.done).length > 0 && (
            <p className="text-xs text-sand-400 text-center">{projects.filter(p => p.done).length} completed project{projects.filter(p => p.done).length > 1 ? 's' : ''} hidden</p>
          )}
        </div>
      </div>
    </div>
  )
}
