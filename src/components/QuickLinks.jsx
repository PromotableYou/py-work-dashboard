import { useState, useEffect } from 'react'
import { Plus, X, ExternalLink } from 'lucide-react'
import { getQuickLinks, addQuickLink, deleteQuickLink } from '../lib/supabase'

const SUGGESTED_EMOJIS = ['🔗', '📧', '📊', '📅', '💬', '📁', '🎯', '⚡', '🛠️', '📝', '💰', '👥']

export default function QuickLinks({ workspace = 'shaniah' }) {
  const [links, setLinks] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', emoji: '🔗' })
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    getQuickLinks(workspace).then(setLinks).catch(() => {})
  }, [workspace])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) return
    let url = form.url.trim()
    if (!url.startsWith('http')) url = 'https://' + url
    const saved = await addQuickLink({
      name: form.name.trim(),
      url,
      emoji: form.emoji,
      workspace,
      position: links.length,
    })
    setLinks(prev => [...prev, saved])
    setForm({ name: '', url: '', emoji: '🔗' })
    setShowForm(false)
  }

  async function handleDelete(id) {
    await deleteQuickLink(id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sand-900 text-sm">Quick Links</h2>
        <div className="flex items-center gap-1">
          {links.length > 0 && (
            <button
              onClick={() => setEditing(e => !e)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${editing ? 'bg-sand-100 border-sand-300 text-sand-700' : 'border-sand-200 text-sand-400 hover:text-sand-600'}`}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
          <button
            onClick={() => setShowForm(s => !s)}
            className="w-7 h-7 rounded-lg bg-sand-100 hover:bg-blush-50 hover:text-blush-500 text-sand-400 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 p-3 bg-sand-50 rounded-xl border border-sand-200">
          <div className="flex gap-2">
            {/* Emoji picker */}
            <div className="relative">
              <button
                type="button"
                className="w-10 h-10 rounded-lg border border-sand-200 bg-white text-lg flex items-center justify-center hover:border-sand-300 transition-colors"
                onClick={() => {}}
              >
                {form.emoji}
              </button>
            </div>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Link name…"
              autoFocus
              className="flex-1 text-sm bg-white border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
            />
          </div>
          {/* Emoji quick-pick */}
          <div className="flex gap-1 flex-wrap">
            {SUGGESTED_EMOJIS.map(e => (
              <button
                key={e} type="button"
                onClick={() => setForm(f => ({ ...f, emoji: e }))}
                className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-colors ${form.emoji === e ? 'bg-blush-100 ring-1 ring-blush-300' : 'hover:bg-sand-100'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            placeholder="URL (e.g. activecampaign.com)"
            className="w-full text-sm bg-white border border-sand-200 rounded-lg px-3 py-2 text-sand-800 placeholder-sand-400 focus:ring-2 focus:ring-blush-200 focus:outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-sand-400 px-3 py-1.5">Cancel</button>
            <button type="submit" className="text-xs bg-blush-500 hover:bg-blush-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">Add</button>
          </div>
        </form>
      )}

      {links.length === 0 && !showForm ? (
        <p className="text-xs text-sand-400 text-center py-4">
          No quick links yet — add your most-used tools above
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {links.map(link => (
            <div key={link.id} className="relative group">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-sand-50 hover:bg-blush-50 border border-sand-200 hover:border-blush-200 text-sand-700 hover:text-blush-700 text-sm font-medium px-3 py-2 rounded-xl transition-all"
              >
                <span className="text-base leading-none">{link.emoji}</span>
                <span>{link.name}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </a>
              {editing && (
                <button
                  onClick={() => handleDelete(link.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
