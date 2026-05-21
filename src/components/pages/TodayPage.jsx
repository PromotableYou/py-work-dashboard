import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, ChevronRight, Star, Zap, AlertCircle } from 'lucide-react'
import {
  getTasks, addTask, updateTask, deleteTask,
  getProjects, addProject, updateProject, deleteProject,
} from '../../lib/supabase'

const TODAY = new Date().toISOString().slice(0, 10)

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Task Item ───────────────────────────────────────────────────────────────
function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={`flex items-start gap-3 py-2.5 group ${task.completed ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(task)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          task.completed
            ? 'bg-blush-400 border-blush-400'
            : 'border-sand-300 hover:border-blush-400'
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-white" />}
      </button>
      <span className={`flex-1 text-sm leading-relaxed ${task.completed ? 'line-through text-sand-400' : 'text-sand-800'}`}>
        {task.text}
        {task.added_by === 'boss' && (
          <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">from boss</span>
        )}
      </span>
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Add Task Input ───────────────────────────────────────────────────────────
function AddTaskInput({ onAdd, placeholder = 'Add a task…', asType = 'daily', fromBoss = false }) {
  const [text, setText] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd({ text: text.trim(), type: asType, date: asType === 'daily' ? TODAY : null, completed: false, added_by: fromBoss ? 'boss' : 'me' })
    setText('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 mt-3">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:border-blush-400 transition-all"
      />
      <button type="submit" className="w-8 h-8 bg-blush-500 hover:bg-blush-600 text-white rounded-lg flex items-center justify-center transition-colors shrink-0">
        <Plus className="w-4 h-4" />
      </button>
    </form>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onToggle, onDelete }) {
  const PRIORITY_STYLES = {
    high:   'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low:    'bg-sand-100 border-sand-200 text-sand-600',
  }

  return (
    <div className={`rounded-xl border p-4 group transition-all ${project.done ? 'opacity-50' : 'hover:shadow-sm'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggle(project)}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              project.done ? 'bg-blush-400 border-blush-400' : 'border-sand-300 hover:border-blush-400'
            }`}
          >
            {project.done && <Check className="w-3 h-3 text-white" />}
          </button>
          <div className="min-w-0">
            <p className={`font-medium text-sm ${project.done ? 'line-through text-sand-400' : 'text-sand-900'}`}>{project.name}</p>
            {project.notes && <p className="text-xs text-sand-500 mt-0.5 leading-relaxed">{project.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.medium}`}>
            {project.priority}
          </span>
          <button onClick={() => onDelete(project.id)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TodayPage() {
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBossInput, setShowBossInput] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', notes: '', priority: 'high' })
  const [showAddProject, setShowAddProject] = useState(false)

  useEffect(() => {
    Promise.all([getTasks(), getProjects()])
      .then(([t, p]) => { setTasks(t); setProjects(p) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dailyTasks = tasks.filter(t => t.type === 'daily' && t.date === TODAY)
  const quickTasks = tasks.filter(t => t.type === 'quick' && !t.completed)
  const doneCount = dailyTasks.filter(t => t.completed).length
  const activeProjects = projects.filter(p => !p.done)

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

  async function handleDeleteTask(id) {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (e) { setError(e.message) }
  }

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

  async function handleDeleteProject(id) {
    try {
      await deleteProject(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (e) { setError(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <p className="text-sand-400 text-sm font-medium">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="text-2xl font-bold text-sand-900 mt-0.5">{greeting()}, Shaniah</h1>
        {dailyTasks.length > 0 && (
          <p className="text-sm text-sand-500 mt-1">
            {doneCount} of {dailyTasks.length} tasks done today
            {doneCount === dailyTasks.length && dailyTasks.length > 0 && ' 🎉'}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column: Daily tasks + Quick wins */}
        <div className="lg:col-span-2 space-y-5">

          {/* Daily Tasks */}
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-warm-100 rounded-lg flex items-center justify-center">
                  <Check className="w-4 h-4 text-blush-600" />
                </div>
                <h2 className="font-semibold text-sand-900">Today's Tasks</h2>
              </div>
              <button
                onClick={() => setShowBossInput(!showBossInput)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  showBossInput ? 'bg-amber-100 border-amber-300 text-amber-700' : 'border-sand-200 text-sand-500 hover:border-sand-400'
                }`}
              >
                {showBossInput ? '— Boss mode' : '+ Boss add'}
              </button>
            </div>

            {/* Progress bar */}
            {dailyTasks.length > 0 && (
              <div className="h-1.5 bg-sand-100 rounded-full mt-3 mb-1 overflow-hidden">
                <div
                  className="h-full bg-blush-400 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / dailyTasks.length) * 100}%` }}
                />
              </div>
            )}

            <div className="divide-y divide-sand-50 mt-2">
              {dailyTasks.length === 0 && (
                <p className="text-sm text-sand-400 py-4 text-center">No tasks yet — add one below</p>
              )}
              {dailyTasks.map(t => (
                <TaskItem key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
              ))}
            </div>

            <AddTaskInput onAdd={handleAddTask} placeholder="Add today's task…" asType="daily" />
            {showBossInput && (
              <div className="mt-2 pt-2 border-t border-amber-100">
                <p className="text-xs text-amber-600 font-medium mb-1">Boss adding task:</p>
                <AddTaskInput onAdd={handleAddTask} placeholder="Boss: add a task for Shaniah…" asType="daily" fromBoss />
              </div>
            )}
          </div>

          {/* Quick Wins */}
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-sand-900">Quick Wins</h2>
                <p className="text-xs text-sand-400">Things to do when you have a sec</p>
              </div>
            </div>
            <div className="divide-y divide-sand-50">
              {quickTasks.length === 0 && (
                <p className="text-sm text-sand-400 py-4 text-center">Nothing queued up</p>
              )}
              {quickTasks.map(t => (
                <TaskItem key={t.id} task={t} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
              ))}
            </div>
            <AddTaskInput onAdd={handleAddTask} placeholder="Add a quick win…" asType="quick" />
          </div>
        </div>

        {/* Right column: High Priority Projects */}
        <div className="space-y-5">
          <div className="bg-white border border-sand-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-sand-900">Projects</h2>
                  <p className="text-xs text-sand-400">{activeProjects.length} active</p>
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
                  className="w-full text-sm bg-white border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200"
                />
                <input
                  value={newProject.notes}
                  onChange={e => setNewProject(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notes (optional)…"
                  className="w-full text-sm bg-white border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200"
                />
                <div className="flex gap-2">
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
                          : 'bg-white border-sand-200 text-sand-500'
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

            <div className="space-y-2">
              {activeProjects.length === 0 && (
                <p className="text-sm text-sand-400 py-4 text-center">No active projects</p>
              )}
              {activeProjects
                .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - ({ high: 0, medium: 1, low: 2 }[b.priority])))
                .map(p => (
                  <ProjectCard key={p.id} project={p} onToggle={handleToggleProject} onDelete={handleDeleteProject} />
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
