import { useState, useEffect, useRef } from 'react'
import { Video, Check, X, Upload, Plus, Trash2, Link, ExternalLink, CheckCircle2, Circle } from 'lucide-react'
import {
  getCoachRosterBlocks,
  getSessionCheckins,
  upsertSessionCheckin,
  uploadSessionVideo,
} from '../../../lib/supabase'

const PERSON_LABEL = { tanya: 'Tanya', tanaz: 'Tanaz', shaniah: 'Shaniah', stacey: 'Stacey', em: 'Em', william: 'William' }
const DAY_OFFSET   = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 }
const DAY_FULL     = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' }

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function blockToDate(block) {
  const ws = new Date(block.week_start + 'T00:00:00')
  return addDays(ws, DAY_OFFSET[block.day_key] ?? 0)
}
function parseSessionMinutes(timeStr) {
  if (!timeStr) return null
  const clean = timeStr.trim().toLowerCase().replace(/\s/g, '')
  const m = clean.match(/^(\d+):?(\d*)([ap]m)$/)
  if (!m) return null
  let h = parseInt(m[1])
  const mins = m[2] ? parseInt(m[2]) : 0
  if (m[3] === 'pm' && h < 12) h += 12
  if (m[3] === 'am' && h === 12) h = 0
  return h * 60 + mins
}

function isSessionPast(block) {
  const blockISO = toISO(blockToDate(block))
  const todayISO = toISO(new Date())
  if (blockISO < todayISO) return true
  if (blockISO > todayISO) return false
  // Same day — check if session time has passed (allow 30 min buffer)
  const sessionMins = parseSessionMinutes(block.time)
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  if (sessionMins === null) return nowMins >= 13 * 60 // no time: assume past after 1pm
  return nowMins > sessionMins + 30
}

function friendlyDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}
function checkinKey(date, name) { return `${date}||${name}` }

// ─── Follow-up item row ────────────────────────────────────────────────────────
function FollowUpRow({ item, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <button onClick={() => onChange({ ...item, done: !item.done })} className="shrink-0">
        {item.done
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <Circle className="w-4 h-4 text-sand-300" />}
      </button>
      <span className={`flex-1 text-sm ${item.done ? 'line-through text-sand-400' : 'text-sand-700'}`}>
        {item.text}
      </span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-opacity">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Pre-session card (upcoming) ──────────────────────────────────────────────
function UpcomingCard({ block, checkin, onConfirm }) {
  const date    = toISO(blockToDate(block))
  const today   = toISO(new Date())
  const tomorrow = toISO(addDays(new Date(), 1))

  const label = date === tomorrow ? 'Tomorrow' : date === today ? 'Today' : friendlyDate(date)
  const confirmed = checkin?.will_attend

  return (
    <div className="bg-white border border-sand-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">{label}{block.time ? ` · ${block.time}` : ''}</p>
          <h3 className="font-semibold text-sand-900 text-sm mt-0.5">{block.session_name}</h3>
        </div>
        {confirmed === true  && <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Attending ✓</span>}
        {confirmed === false && <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">Not attending</span>}
      </div>

      {confirmed == null && (
        <div>
          <p className="text-xs text-sand-500 mb-2">Will you be attending this session?</p>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm(block, true)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Yes, I'll be there
            </button>
            <button
              onClick={() => onConfirm(block, false)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Can't make it
            </button>
          </div>
        </div>
      )}

      {confirmed != null && (
        <button
          onClick={() => onConfirm(block, null)}
          className="text-[10px] text-sand-400 hover:text-sand-600 underline"
        >
          Change response
        </button>
      )}
    </div>
  )
}

// ─── Post-session card (past) ─────────────────────────────────────────────────
function PastCard({ block, checkin, onUpdate, onVideoUpload, uploading }) {
  const [linkMode,   setLinkMode]   = useState(false)
  const [linkInput,  setLinkInput]  = useState('')
  const [newFollowUp, setNewFollowUp] = useState('')
  const [addingFU,   setAddingFU]   = useState(false)
  const fileRef = useRef(null)

  const date      = toISO(blockToDate(block))
  const attended  = checkin?.attended ?? null
  const videoUrl  = checkin?.video_url || ''
  const followUps = checkin?.follow_ups || []
  const allFUDone = followUps.length > 0 && followUps.every(f => f.done)

  async function toggleAttended() {
    await onUpdate(block, { attended: !attended })
  }

  async function saveLink() {
    if (!linkInput.trim()) return
    await onUpdate(block, { video_url: linkInput.trim() })
    setLinkMode(false)
    setLinkInput('')
  }

  async function addFollowUp() {
    if (!newFollowUp.trim()) return
    const updated = [...followUps, { id: Date.now().toString(), text: newFollowUp.trim(), done: false }]
    await onUpdate(block, { follow_ups: updated })
    setNewFollowUp('')
    setAddingFU(false)
  }

  async function updateFollowUp(idx, item) {
    const updated = followUps.map((f, i) => i === idx ? item : f)
    await onUpdate(block, { follow_ups: updated })
  }

  async function deleteFollowUp(idx) {
    const updated = followUps.filter((_, i) => i !== idx)
    await onUpdate(block, { follow_ups: updated })
  }

  const isComplete = attended && videoUrl && (followUps.length === 0 || allFUDone)

  return (
    <div className={`bg-white border rounded-2xl p-4 space-y-4 ${isComplete ? 'border-green-200' : 'border-sand-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">
            {friendlyDate(date)}{block.time ? ` · ${block.time}` : ''}
          </p>
          <h3 className="font-semibold text-sand-900 text-sm mt-0.5">{block.session_name}</h3>
        </div>
        {isComplete && (
          <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            Complete ✓
          </span>
        )}
      </div>

      {/* Attended */}
      <div>
        <button
          onClick={toggleAttended}
          className="flex items-center gap-2 w-full text-left"
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            attended ? 'bg-blush-500 border-blush-500' : 'border-sand-300'
          }`}>
            {attended && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className={`text-sm font-medium ${attended ? 'text-sand-900' : 'text-sand-500'}`}>
            I attended this session
          </span>
        </button>
      </div>

      {/* Video */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide">Session Recording</p>
        {videoUrl ? (
          <div className="flex items-center gap-2 bg-sand-50 rounded-xl px-3 py-2">
            <Video className="w-4 h-4 text-blush-400 shrink-0" />
            <a href={videoUrl} target="_blank" rel="noreferrer"
              className="text-sm text-blush-600 hover:text-blush-700 flex-1 truncate flex items-center gap-1">
              View recording <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <button onClick={() => onUpdate(block, { video_url: '' })}
              className="text-sand-300 hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!linkMode ? (
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sand-200 text-sand-600 hover:bg-sand-50 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading…' : 'Upload video'}
                </button>
                <button
                  onClick={() => setLinkMode(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sand-200 text-sand-600 hover:bg-sand-50 transition-colors"
                >
                  <Link className="w-3.5 h-3.5" /> Paste link
                </button>
                <input ref={fileRef} type="file" accept="video/*" className="hidden"
                  onChange={e => e.target.files[0] && onVideoUpload(block, e.target.files[0])} />
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={linkInput}
                  onChange={e => setLinkInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveLink(); if (e.key === 'Escape') setLinkMode(false) }}
                  placeholder="Paste Zoom, Loom or Drive link…"
                  className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"
                />
                <button onClick={saveLink} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm hover:bg-blush-600 transition-colors">
                  Save
                </button>
                <button onClick={() => setLinkMode(false)} className="px-3 py-2 text-sand-400 hover:text-sand-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-ups */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide">Follow-ups</p>
        {followUps.length === 0 && !addingFU && (
          <p className="text-xs text-sand-400 italic">No follow-ups yet</p>
        )}
        <div className="group space-y-0.5">
          {followUps.map((fu, i) => (
            <FollowUpRow
              key={fu.id || i}
              item={fu}
              onChange={item => updateFollowUp(i, item)}
              onDelete={() => deleteFollowUp(i)}
            />
          ))}
        </div>
        {addingFU ? (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              value={newFollowUp}
              onChange={e => setNewFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addFollowUp(); if (e.key === 'Escape') { setAddingFU(false); setNewFollowUp('') } }}
              placeholder="e.g. Send resources to Sarah…"
              className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"
            />
            <button onClick={addFollowUp} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm hover:bg-blush-600 transition-colors">
              Add
            </button>
            <button onClick={() => { setAddingFU(false); setNewFollowUp('') }} className="text-sand-400 hover:text-sand-600 px-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingFU(true)}
            className="flex items-center gap-1 text-xs text-sand-400 hover:text-sand-700 mt-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add follow-up
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SessionsPage({ workspace = 'tanya' }) {
  const coachName = PERSON_LABEL[workspace] || workspace
  const todayDate = new Date(); todayDate.setHours(0,0,0,0)
  const today     = toISO(todayDate)

  const [blocks,   setBlocks]   = useState([])
  const [checkins, setCheckins] = useState({})
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [uploading, setUploading] = useState({})

  useEffect(() => {
    Promise.all([getCoachRosterBlocks(coachName), getSessionCheckins(coachName)])
      .then(([rosterBlocks, checkinList]) => {
        const cutoff = addDays(todayDate, -14)
        const ceiling = addDays(todayDate, 14)
        const filtered = rosterBlocks.filter(b => {
          const d = blockToDate(b)
          return d >= cutoff && d <= ceiling
        })
        setBlocks(filtered)
        const map = {}
        checkinList.forEach(c => { map[checkinKey(c.session_date, c.session_name)] = c })
        setCheckins(map)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [coachName])

  function getCheckin(block) {
    return checkins[checkinKey(toISO(blockToDate(block)), block.session_name)]
  }

  async function handleConfirm(block, val) {
    const date = toISO(blockToDate(block))
    const key  = checkinKey(date, block.session_name)
    try {
      const saved = await upsertSessionCheckin({
        ...(checkins[key] || {}),
        coach_name: coachName, session_date: date,
        session_name: block.session_name, week_start: block.week_start,
        day_key: block.day_key, time: block.time || '',
        will_attend: val,
      })
      setCheckins(prev => ({ ...prev, [key]: saved }))
    } catch (e) { setError(e.message) }
  }

  async function handleUpdate(block, updates) {
    const date = toISO(blockToDate(block))
    const key  = checkinKey(date, block.session_name)
    try {
      const saved = await upsertSessionCheckin({
        ...(checkins[key] || {}),
        coach_name: coachName, session_date: date,
        session_name: block.session_name, week_start: block.week_start,
        day_key: block.day_key, time: block.time || '',
        ...updates,
      })
      setCheckins(prev => ({ ...prev, [key]: saved }))
    } catch (e) { setError(e.message) }
  }

  async function handleVideoUpload(block, file) {
    const date = toISO(blockToDate(block))
    const key  = checkinKey(date, block.session_name)
    setUploading(prev => ({ ...prev, [key]: true }))
    try {
      const url = await uploadSessionVideo(file, coachName, date, block.session_name)
      await handleUpdate(block, { video_url: url })
    } catch (e) { setError(e.message) }
    finally { setUploading(prev => ({ ...prev, [key]: false })) }
  }

  const upcoming = blocks
    .filter(b => !isSessionPast(b))
    .sort((a, b) => blockToDate(a) - blockToDate(b))

  const past = blocks
    .filter(b => isSessionPast(b))
    .sort((a, b) => blockToDate(b) - blockToDate(a))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-xl font-bold text-sand-900">My Sessions</h1>
        <p className="text-sand-400 text-sm mt-0.5">Your rostered coaching sessions</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Upcoming */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-sand-500 uppercase tracking-widest">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-sand-400 bg-white border border-sand-200 rounded-2xl px-4 py-6 text-center">
            No upcoming sessions in the next 2 weeks
          </p>
        ) : (
          upcoming.map(b => (
            <UpcomingCard
              key={`${b.id}`}
              block={b}
              checkin={getCheckin(b)}
              onConfirm={handleConfirm}
            />
          ))
        )}
      </div>

      {/* Past sessions */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-sand-500 uppercase tracking-widest">Recent Sessions</h2>
          {past.map(b => {
            const date = toISO(blockToDate(b))
            const key  = checkinKey(date, b.session_name)
            return (
              <PastCard
                key={b.id}
                block={b}
                checkin={getCheckin(b)}
                onUpdate={handleUpdate}
                onVideoUpload={handleVideoUpload}
                uploading={!!uploading[key]}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
