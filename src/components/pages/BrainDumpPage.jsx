import { useState, useEffect, useRef } from 'react'
import { Send, Trash2, Brain, AlertCircle, Mic, MicOff, FolderPlus, Check } from 'lucide-react'
import { getDumps, addDump, deleteDump, addProject } from '../../lib/supabase'

const PRIORITY_STYLES = {
  high:   'bg-red-500 border-red-500 text-white',
  medium: 'bg-amber-500 border-amber-500 text-white',
  low:    'bg-sand-400 border-sand-400 text-white',
}

// ─── Voice hook ───────────────────────────────────────────────────────────────
function useSpeech(onResult) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  function toggle() {
    if (!SR) { alert('Voice input requires Chrome or Safari.'); return }
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const rec = new SR()
    rec.lang = 'en-AU'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = e => {
      const transcript = Array.from(e.results)
        .slice(e.resultIndex)
        .map(r => r[0].transcript)
        .join(' ')
      onResult(transcript)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  return { listening, toggle, supported: !!SR }
}

// ─── Convert-to-project inline panel ─────────────────────────────────────────
function ConvertPanel({ defaultName, onConvert, onCancel }) {
  const [name, setName] = useState(defaultName)
  const [priority, setPriority] = useState('medium')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await onConvert(name.trim(), priority)
    setDone(true)
  }

  if (done) return (
    <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-semibold">
      <Check className="w-3.5 h-3.5" /> Project created! Find it in Tasks.
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-sand-100 pt-3">
      <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-widest">Make this a project</p>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 focus:outline-none focus:ring-2 focus:ring-blush-200"
        placeholder="Project name…"
        autoFocus
      />
      <div className="flex gap-1.5">
        {['high', 'medium', 'low'].map(p => (
          <button
            key={p} type="button"
            onClick={() => setPriority(p)}
            className={`flex-1 text-[11px] py-1.5 rounded-lg border font-semibold capitalize transition-colors ${
              priority === p ? PRIORITY_STYLES[p] : 'bg-white border-sand-200 text-sand-400 hover:border-sand-300'
            }`}
          >{p}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 text-xs text-sand-400 py-1.5 rounded-lg border border-sand-200 hover:bg-sand-50 transition-colors">Cancel</button>
        <button type="submit" className="flex-1 text-xs bg-blush-500 hover:bg-blush-600 text-white py-1.5 rounded-lg font-semibold transition-colors">Create Project</button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BrainDumpPage({ workspace = 'shaniah' }) {
  const [dumps, setDumps] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [convertingId, setConvertingId] = useState(null)

  const { listening, toggle: toggleMic } = useSpeech(transcript =>
    setText(prev => prev + (prev ? ' ' : '') + transcript)
  )

  useEffect(() => {
    getDumps(workspace)
      .then(setDumps)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      const saved = await addDump(text.trim(), workspace)
      setDumps(prev => [saved, ...prev])
      setText('')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await deleteDump(id); setDumps(prev => prev.filter(d => d.id !== id)) }
    catch (e) { setError(e.message) }
  }

  async function handleConvert(name, priority) {
    try { await addProject({ name, priority, done: false, notes: '' }) }
    catch (e) { setError(e.message) }
  }

  // Derive a sensible default project name from dump text
  function dumpToProjectName(content) {
    const firstLine = content.split('\n')[0].trim()
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '…' : firstLine
  }

  function formatTs(ts) {
    const d = new Date(ts)
    const now = new Date()
    const diffMins = Math.floor((now - d) / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
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
          <div className="relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(e) }}
              placeholder="What's on your mind? Dump it all here — tasks, thoughts, worries, ideas, reminders… or just hit the mic 🎙️"
              rows={5}
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-xl px-4 py-3 pr-12 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none resize-none leading-relaxed"
            />
            {/* Mic button */}
            <button
              type="button"
              onClick={toggleMic}
              className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                listening
                  ? 'bg-blush-500 text-white animate-pulse shadow-md'
                  : 'bg-sand-100 text-sand-400 hover:bg-blush-50 hover:text-blush-500'
              }`}
              title={listening ? 'Stop recording' : 'Dictate'}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {listening && (
            <p className="text-xs text-blush-500 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blush-400 rounded-full animate-pulse inline-block" />
              Listening… speak freely, tap mic to stop
            </p>
          )}

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
                <div className="flex items-center gap-1 shrink-0">
                  {/* Convert to project */}
                  <button
                    onClick={() => setConvertingId(convertingId === d.id ? null : d.id)}
                    className={`opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg ${
                      convertingId === d.id
                        ? 'opacity-100 text-blush-500 bg-blush-50'
                        : 'text-sand-300 hover:text-blush-500 hover:bg-blush-50'
                    }`}
                    title="Turn into a project"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-sand-400 mt-2">{formatTs(d.created_at)}</p>

              {/* Convert panel */}
              {convertingId === d.id && (
                <ConvertPanel
                  defaultName={dumpToProjectName(d.content)}
                  onConvert={handleConvert}
                  onCancel={() => setConvertingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
