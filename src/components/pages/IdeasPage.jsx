import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Lightbulb, Tag, AlertCircle, Mic, MicOff, FolderPlus, Check } from 'lucide-react'
import { getIdeas, addIdea, deleteIdea, addProject } from '../../lib/supabase'

const CARD_COLORS = [
  'bg-warm-50 border-warm-200',
  'bg-amber-50 border-amber-200',
  'bg-purple-50 border-purple-200',
  'bg-blue-50 border-blue-200',
  'bg-emerald-50 border-emerald-200',
  'bg-pink-50 border-pink-200',
]

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
      <Check className="w-3.5 h-3.5" /> Project created!
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-white/60 pt-3">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full text-xs bg-white/70 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 focus:outline-none focus:ring-2 focus:ring-blush-200"
        placeholder="Project name…"
        autoFocus
      />
      <div className="flex gap-1.5">
        {['high', 'medium', 'low'].map(p => (
          <button
            key={p} type="button"
            onClick={() => setPriority(p)}
            className={`flex-1 text-[10px] py-1.5 rounded-lg border font-semibold capitalize transition-colors ${
              priority === p ? PRIORITY_STYLES[p] : 'bg-white border-sand-200 text-sand-400'
            }`}
          >{p}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 text-[11px] text-sand-400 py-1.5 rounded-lg border border-sand-200 bg-white/70">Cancel</button>
        <button type="submit" className="flex-1 text-[11px] bg-blush-500 hover:bg-blush-600 text-white py-1.5 rounded-lg font-semibold transition-colors">Create Project</button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function IdeasPage({ workspace = 'shaniah' }) {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({ title: '', body: '', tag: '', color: 0 })
  const [convertingId, setConvertingId] = useState(null)

  const { listening, toggle: toggleMic } = useSpeech(transcript =>
    setForm(f => ({ ...f, body: f.body + (f.body ? ' ' : '') + transcript }))
  )

  useEffect(() => {
    getIdeas(workspace)
      .then(setIdeas)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const allTags = ['All', ...new Set(ideas.map(i => i.tag).filter(Boolean))]
  const filtered = filter === 'All' ? ideas : ideas.filter(i => i.tag === filter)

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      const saved = await addIdea({ title: form.title, body: form.body, tag: form.tag, color: form.color, workspace })
      setIdeas(prev => [saved, ...prev])
      setForm({ title: '', body: '', tag: '', color: 0 })
      setShowForm(false)
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    try { await deleteIdea(id); setIdeas(prev => prev.filter(i => i.id !== id)) }
    catch (e) { setError(e.message) }
  }

  async function handleConvert(ideaId, name, priority) {
    try {
      await addProject({ name, priority, done: false, notes: '' })
    } catch (e) { setError(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-warm-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sand-900">Creative Ideas</h1>
          <p className="text-sand-400 text-sm mt-0.5">{ideas.length} idea{ideas.length !== 1 ? 's' : ''} captured</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-warm-500 hover:bg-warm-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Idea
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-sand-200 rounded-2xl p-5">
          <h2 className="font-semibold text-sand-900 mb-3">Capture an idea</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Idea title…"
              autoFocus
              className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
            />
            {/* Body + mic */}
            <div className="relative">
              <textarea
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                placeholder="Describe the idea… (optional, or use the mic 🎙️)"
                rows={3}
                className="w-full text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2.5 pr-11 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={toggleMic}
                className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  listening ? 'bg-blush-500 text-white animate-pulse' : 'bg-sand-100 text-sand-400 hover:bg-blush-50 hover:text-blush-500'
                }`}
                title={listening ? 'Stop recording' : 'Dictate'}
              >
                {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            </div>
            {listening && (
              <p className="text-xs text-blush-500 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blush-400 rounded-full animate-pulse inline-block" />
                Listening… speak now
              </p>
            )}
            <div className="flex gap-3">
              <input
                value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                placeholder="Tag (e.g. Marketing, Content)…"
                className="flex-1 text-sm bg-sand-50 border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-warm-300 focus:outline-none"
              />
              <div className="flex gap-1.5 items-center">
                {CARD_COLORS.map((_, i) => (
                  <button
                    key={i} type="button"
                    onClick={() => setForm(f => ({ ...f, color: i }))}
                    className={`w-5 h-5 rounded-full border ${CARD_COLORS[i]} ${form.color === i ? 'ring-2 ring-offset-1 ring-sand-500' : ''}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-sand-500 hover:text-sand-700 px-3 py-2">Cancel</button>
              <button type="submit" className="text-sm bg-warm-500 hover:bg-warm-600 text-white px-4 py-2 rounded-xl font-medium transition-colors">Save Idea</button>
            </div>
          </form>
        </div>
      )}

      {/* Tag filters */}
      {allTags.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {allTags.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                filter === t ? 'bg-warm-500 border-warm-500 text-white' : 'border-sand-200 text-sand-600 hover:border-sand-400 bg-white'
              }`}
            >{t}</button>
          ))}
        </div>
      )}

      {/* Ideas grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-400 text-sm">No ideas yet — capture your first one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(idea => (
            <div key={idea.id} className={`rounded-2xl border p-4 group hover:shadow-sm transition-all ${CARD_COLORS[idea.color || 0]}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sand-900 text-sm leading-snug flex-1">{idea.title}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Convert to project */}
                  <button
                    onClick={() => setConvertingId(convertingId === idea.id ? null : idea.id)}
                    className={`opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg ${
                      convertingId === idea.id ? 'opacity-100 text-blush-500 bg-blush-50' : 'text-sand-400 hover:text-blush-500 hover:bg-white/70'
                    }`}
                    title="Turn into a project"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(idea.id)}
                    className="opacity-0 group-hover:opacity-100 text-sand-400 hover:text-red-500 transition-all p-1 rounded-lg hover:bg-white/70"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {idea.body && <p className="text-xs text-sand-600 mt-2 leading-relaxed">{idea.body}</p>}

              <div className="flex items-center justify-between mt-3">
                {idea.tag ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-sand-500 bg-white/70 px-2 py-0.5 rounded-full border border-sand-200">
                    <Tag className="w-2.5 h-2.5" />{idea.tag}
                  </span>
                ) : <span />}
                <p className="text-[10px] text-sand-400">
                  {new Date(idea.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              {/* Convert panel */}
              {convertingId === idea.id && (
                <ConvertPanel
                  defaultName={idea.title}
                  onConvert={(name, priority) => handleConvert(idea.id, name, priority)}
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
