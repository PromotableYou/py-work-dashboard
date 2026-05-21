import { useState, useEffect } from 'react'
import { Send, Trash2, Brain, AlertCircle } from 'lucide-react'
import { getDumps, addDump, deleteDump } from '../../lib/supabase'

export default function BrainDumpPage() {
  const [dumps, setDumps] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDumps()
      .then(setDumps)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      const saved = await addDump(text.trim())
      setDumps(prev => [saved, ...prev])
      setText('')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await deleteDump(id)
      setDumps(prev => prev.filter(d => d.id !== id))
    } catch (e) { setError(e.message) }
  }

  function formatTs(ts) {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-sand-900">Brain Dump</h1>
        <p className="text-sand-400 text-sm mt-0.5">Get it out of your head and onto the page</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Input */}
      <div className="bg-white border border-sand-200 rounded-2xl p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.metaKey) handleSubmit(e)
            }}
            placeholder="What's on your mind? Dump it all here — tasks, thoughts, worries, ideas, reminders…"
            rows={5}
            className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-sand-400">⌘ + Enter to save</p>
            <button
              type="submit"
              disabled={saving || !text.trim()}
              className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 disabled:bg-sand-200 disabled:text-sand-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Dump it'}
            </button>
          </div>
        </form>
      </div>

      {/* Previous dumps */}
      {dumps.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">Your brain dump history will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-sand-400 uppercase tracking-wide">Previous dumps</p>
          {dumps.map(d => (
            <div key={d.id} className="bg-white border border-sand-200 rounded-2xl px-5 py-4 group hover:border-sand-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-sand-700 leading-relaxed flex-1 whitespace-pre-wrap">{d.content}</p>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-sand-400 mt-2">{formatTs(d.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
