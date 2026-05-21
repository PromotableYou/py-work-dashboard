import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Pin } from 'lucide-react'
import { getNotes, addNote, updateNote, deleteNote } from '../../lib/supabase'

const NOTE_COLORS = {
  white:  { card: 'bg-white border-sand-200',             dot: 'bg-white border-sand-400'      },
  yellow: { card: 'bg-amber-50 border-amber-200',         dot: 'bg-amber-200 border-amber-400' },
  pink:   { card: 'bg-blush-50 border-blush-200',         dot: 'bg-blush-200 border-blush-400' },
  green:  { card: 'bg-emerald-50 border-emerald-200',     dot: 'bg-emerald-200 border-emerald-400' },
  purple: { card: 'bg-purple-50 border-purple-200',       dot: 'bg-purple-200 border-purple-400'   },
  blue:   { card: 'bg-blue-50 border-blue-200',           dot: 'bg-blue-200 border-blue-400'   },
}

function NoteCard({ note, onUpdate, onDelete }) {
  const [title, setTitle]     = useState(note.title || '')
  const [content, setContent] = useState(note.content || '')
  const [hovered, setHovered] = useState(false)
  const saveTimer = useRef(null)
  const styles = NOTE_COLORS[note.color || 'white'] || NOTE_COLORS.white

  // Sync if note changes externally
  useEffect(() => { setTitle(note.title || '') }, [note.title])
  useEffect(() => { setContent(note.content || '') }, [note.content])

  function scheduleSave(updates) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onUpdate(note.id, updates), 700)
  }

  return (
    <div
      className={`relative rounded-2xl border-2 p-4 transition-all shadow-sm hover:shadow-md ${styles.card}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Toolbar — visible on hover */}
      <div className={`flex items-center justify-between mb-2 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        {/* Colour swatches */}
        <div className="flex gap-1.5 items-center">
          {Object.entries(NOTE_COLORS).map(([color, s]) => (
            <button
              key={color}
              title={color}
              onClick={() => onUpdate(note.id, { color })}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 ${s.dot} ${
                (note.color || 'white') === color ? 'scale-125 ring-1 ring-offset-1 ring-sand-400' : ''
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
            title={note.pinned ? 'Unpin' : 'Pin'}
            className={`p-1 rounded-lg transition-colors ${note.pinned ? 'text-blush-500 bg-blush-50' : 'text-sand-300 hover:text-sand-600 hover:bg-sand-100'}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1 rounded-lg text-sand-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {note.pinned && (
        <Pin className="absolute top-3 right-3 w-3 h-3 text-blush-400" />
      )}

      <input
        value={title}
        onChange={e => { setTitle(e.target.value); scheduleSave({ title: e.target.value, content }) }}
        placeholder="Title…"
        className="w-full text-sm font-bold text-sand-900 placeholder-sand-300 bg-transparent border-0 outline-none mb-2 leading-snug"
      />
      <textarea
        value={content}
        onChange={e => { setContent(e.target.value); scheduleSave({ title, content: e.target.value }) }}
        placeholder="Write something…"
        rows={5}
        className="w-full text-sm text-sand-700 placeholder-sand-300 bg-transparent border-0 outline-none resize-none leading-relaxed"
      />

      {/* Timestamp */}
      <p className={`text-[10px] text-sand-300 mt-2 transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        {new Date(note.updated_at || note.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

export default function NotesPage({ workspace = 'shaniah' }) {
  const [notes, setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    getNotes(workspace)
      .then(setNotes)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [workspace])

  async function handleAdd() {
    try {
      const saved = await addNote({ title: '', content: '', workspace, color: 'white', pinned: false })
      setNotes(prev => [saved, ...prev])
    } catch (e) { setError(e.message) }
  }

  async function handleUpdate(id, updates) {
    try {
      const saved = await updateNote(id, updates)
      setNotes(prev => prev.map(n => n.id === id ? saved : n))
    } catch (e) { setError(e.message) }
  }

  async function handleDelete(id) {
    try {
      await deleteNote(id)
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (e) { setError(e.message) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const pinned   = notes.filter(n => n.pinned)
  const unpinned = notes.filter(n => !n.pinned)

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-sand-900">Notes</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-blush-500 hover:bg-blush-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {notes.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sand-500 font-medium">No notes yet</p>
          <p className="text-sand-400 text-sm mt-1">Click "New Note" to get started</p>
        </div>
      )}

      {pinned.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-blush-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinned.map(note => (
              <NoteCard key={note.id} note={note} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest mb-3">Notes</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpinned.map(note => (
              <NoteCard key={note.id} note={note} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
