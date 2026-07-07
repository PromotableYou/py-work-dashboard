import { useState, useEffect, useRef } from 'react'
import { Video, Check, X, Upload, Plus, Trash2, Link, ExternalLink, CheckCircle2, Circle, FileText, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  getCoachRosterBlocks,
  getSessionCheckins,
  upsertSessionCheckin,
  uploadSessionVideo,
} from '../../../lib/supabase'

const PERSON_LABEL = { tanya: 'Tanya', tanaz: 'Tanaz', shaniah: 'Shaniah', stacey: 'Stacey', em: 'Em', william: 'William' }
const DAY_OFFSET   = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 }

const SESSION_QUESTIONS = {
  'Resume Room': ['What industry or role type are you targeting?', 'What feedback have you had on your resume so far?', 'What\'s the biggest section you\'re unsure about?'],
  'General Q&A': ['What\'s your biggest challenge right now in your job search?', 'What would be most helpful for you today?', 'Where are you currently in your search — just starting, active applying, or interviewing?'],
  'Senior Exec Room': ['What level are you targeting and what\'s your current title?', 'What\'s the biggest gap you see between where you are and where you want to be?', 'How are you positioning yourself differently at exec level?'],
  'Role Clarity & USP': ['How would you describe your USP in one sentence right now?', 'What roles are you seeing yourself in — and is there any overlap or conflict in that list?', 'What do people consistently come to you for?'],
  'Interview Prep & Roleplay': ['Do you have any interviews coming up — if so, what stage?', 'Which question types do you find hardest to answer?', 'What story are you most confident telling about your career so far?'],
  'Early Access & Recruiter Strategy': ['Are you currently reaching out to recruiters — if so, what\'s your approach?', 'What does your LinkedIn look like — open to work, headline, summary?', 'Which companies are on your target list?'],
  'Evening Q&A': ['What\'s blocked your progress most this week?', 'What would make next week feel like a win?', 'Is there anything you tried that didn\'t work — let\'s troubleshoot it.'],
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function blockToDate(block) {
  return addDays(new Date(block.week_start + 'T00:00:00'), DAY_OFFSET[block.day_key] ?? 0)
}
function friendlyDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}
function checkinKey(date, name) { return `${date}||${name}` }

function parseSessionMinutes(timeStr) {
  if (!timeStr) return null
  const m = timeStr.trim().toLowerCase().replace(/\s/g,'').match(/^(\d+):?(\d*)([ap]m)$/)
  if (!m) return null
  let h = parseInt(m[1]); const mins = m[2] ? parseInt(m[2]) : 0
  if (m[3]==='pm' && h<12) h+=12; if (m[3]==='am' && h===12) h=0
  return h*60+mins
}
function isSessionPast(block) {
  const blockISO = toISO(blockToDate(block))
  const todayISO = toISO(new Date())
  if (blockISO < todayISO) return true
  if (blockISO > todayISO) return false
  const sessionMins = parseSessionMinutes(block.time)
  const nowMins = new Date().getHours()*60 + new Date().getMinutes()
  if (sessionMins===null) return nowMins >= 13*60
  return nowMins > sessionMins + 30
}

// ─── Follow-up item ───────────────────────────────────────────────────────────
function FollowUpRow({ item, onChange, onDelete }) {
  return (
    <div className="group flex items-center gap-2 py-1">
      <button onClick={() => onChange({ ...item, done: !item.done })} className="shrink-0">
        {item.done ? <CheckCircle2 className="w-4 h-4 text-green-500"/> : <Circle className="w-4 h-4 text-sand-300"/>}
      </button>
      <span className={`flex-1 text-sm ${item.done ? 'line-through text-sand-400' : 'text-sand-700'}`}>{item.text}</span>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 transition-opacity">
        <Trash2 className="w-3.5 h-3.5"/>
      </button>
    </div>
  )
}

// ─── Upcoming (pre-session) card ──────────────────────────────────────────────
function UpcomingCard({ block, checkin, onConfirm, onUpdate, onResourceUpload, uploadingResource }) {
  const date      = toISO(blockToDate(block))
  const tomorrow  = toISO(addDays(new Date(), 1))
  const today     = toISO(new Date())
  const confirmed = checkin?.will_attend
  const topic     = checkin?.topic || ''
  const resources = checkin?.resources || []
  const questions = checkin?.questions || []

  const [showPrep,    setShowPrep]    = useState(false)
  const [editTopic,   setEditTopic]   = useState(false)
  const [topicVal,    setTopicVal]    = useState(topic)
  const [linkMode,    setLinkMode]    = useState(false)
  const [linkName,    setLinkName]    = useState('')
  const [linkUrl,     setLinkUrl]     = useState('')
  const [newQuestion, setNewQuestion] = useState('')
  const [addingQ,     setAddingQ]     = useState(false)
  const fileRef = useRef(null)

  const label = date === today ? 'Today' : date === tomorrow ? 'Tomorrow' : friendlyDate(date)
  const suggestedQs = SESSION_QUESTIONS[block.session_name] || []

  async function saveTopic() {
    setEditTopic(false)
    if (topicVal.trim() !== topic) await onUpdate(block, { topic: topicVal.trim() })
  }
  async function addResource() {
    if (!linkUrl.trim()) return
    const updated = [...resources, { name: linkName.trim() || linkUrl, url: linkUrl.trim() }]
    await onUpdate(block, { resources: updated })
    setLinkName(''); setLinkUrl(''); setLinkMode(false)
  }
  async function removeResource(i) {
    await onUpdate(block, { resources: resources.filter((_,idx) => idx!==i) })
  }
  async function addQuestion(text) {
    if (!text.trim()) return
    const updated = [...questions, { id: Date.now().toString(), text: text.trim() }]
    await onUpdate(block, { questions: updated })
    setNewQuestion(''); setAddingQ(false)
  }
  async function removeQuestion(i) {
    await onUpdate(block, { questions: questions.filter((_,idx) => idx!==i) })
  }
  async function loadSuggested() {
    const existing = new Set(questions.map(q => q.text))
    const toAdd = suggestedQs.filter(q => !existing.has(q)).map(q => ({ id: Date.now().toString()+Math.random(), text: q }))
    await onUpdate(block, { questions: [...questions, ...toAdd] })
  }

  return (
    <div className={`bg-white border-2 rounded-2xl overflow-hidden ${confirmed===true ? 'border-green-300' : confirmed===false ? 'border-red-200' : 'border-blush-200'}`}>
      {/* Main info */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-bold text-sand-400 uppercase tracking-widest mb-1">{label}{block.time ? ` · ${block.time}` : ''}</p>
            <h2 className="text-xl font-bold text-sand-900">{block.session_name}</h2>
            {topic && <p className="text-sm text-blush-600 mt-1 font-medium">Topic: {topic}</p>}
          </div>
          {confirmed===true  && <span className="shrink-0 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">Attending ✓</span>}
          {confirmed===false && <span className="shrink-0 text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-3 py-1">Not attending</span>}
        </div>

        {/* Attendance confirmation */}
        {confirmed==null ? (
          <div>
            <p className="text-sm text-sand-500 mb-3">Will you be attending this session?</p>
            <div className="flex gap-2">
              <button onClick={() => onConfirm(block, true)}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors">
                <Check className="w-4 h-4"/> Yes, I'll be there
              </button>
              <button onClick={() => onConfirm(block, false)}
                className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors">
                <X className="w-4 h-4"/> Can't make it
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => onConfirm(block, null)} className="text-xs text-sand-400 hover:text-sand-600 underline">
            Change response
          </button>
        )}
      </div>

      {/* Prep section toggle */}
      <button
        onClick={() => setShowPrep(p => !p)}
        className="w-full flex items-center justify-between px-5 py-3 bg-sand-50 border-t border-sand-100 text-xs font-bold text-sand-500 uppercase tracking-widest hover:bg-sand-100 transition-colors"
      >
        Session Prep
        {showPrep ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
      </button>

      {showPrep && (
        <div className="p-5 space-y-5 border-t border-sand-100">
          {/* Topic */}
          <div>
            <p className="text-xs font-bold text-sand-500 uppercase tracking-wide mb-2">Session Topic</p>
            {editTopic ? (
              <div className="flex gap-2">
                <input autoFocus value={topicVal} onChange={e => setTopicVal(e.target.value)}
                  onBlur={saveTopic}
                  onKeyDown={e => { if (e.key==='Enter') saveTopic(); if (e.key==='Escape') { setEditTopic(false); setTopicVal(topic) } }}
                  placeholder="What's the focus for this session?"
                  className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"/>
                <button onClick={saveTopic} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm">Save</button>
              </div>
            ) : (
              <button onClick={() => setEditTopic(true)} className="w-full text-left text-sm text-sand-500 hover:text-sand-800 border border-dashed border-sand-200 hover:border-sand-300 rounded-xl px-3 py-2 transition-colors">
                {topic || 'Add a topic or focus for this session…'}
              </button>
            )}
          </div>

          {/* Resources */}
          <div>
            <p className="text-xs font-bold text-sand-500 uppercase tracking-wide mb-2">Resources</p>
            {resources.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5 bg-sand-50 rounded-xl px-3 py-2">
                <FileText className="w-4 h-4 text-blush-400 shrink-0"/>
                <a href={r.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-blush-600 hover:text-blush-700 truncate flex items-center gap-1">
                  {r.name} <ExternalLink className="w-3 h-3 shrink-0"/>
                </a>
                <button onClick={() => removeResource(i)} className="text-sand-300 hover:text-red-400"><X className="w-3.5 h-3.5"/></button>
              </div>
            ))}
            {linkMode ? (
              <div className="space-y-2">
                <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Resource name (optional)"
                  className="w-full text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"/>
                <div className="flex gap-2">
                  <input autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') addResource(); if (e.key==='Escape') setLinkMode(false) }}
                    placeholder="Paste link or Drive URL…"
                    className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"/>
                  <button onClick={addResource} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm">Add</button>
                  <button onClick={() => setLinkMode(false)} className="text-sand-400 hover:text-sand-600 px-2"><X className="w-4 h-4"/></button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} disabled={uploadingResource}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sand-200 text-sand-600 hover:bg-sand-50 transition-colors disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5"/> {uploadingResource ? 'Uploading…' : 'Upload file'}
                </button>
                <button onClick={() => setLinkMode(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sand-200 text-sand-600 hover:bg-sand-50 transition-colors">
                  <Link className="w-3.5 h-3.5"/> Add link
                </button>
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => e.target.files[0] && onResourceUpload(block, e.target.files[0])}/>
              </div>
            )}
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-sand-500 uppercase tracking-wide">Questions if it goes quiet</p>
              {suggestedQs.length > 0 && (
                <button onClick={loadSuggested} className="text-[10px] text-blush-500 hover:text-blush-700 font-medium">
                  Load suggested
                </button>
              )}
            </div>
            {questions.map((q, i) => (
              <div key={q.id||i} className="group flex items-start gap-2 mb-1.5 bg-sand-50 rounded-xl px-3 py-2">
                <HelpCircle className="w-4 h-4 text-sand-400 shrink-0 mt-0.5"/>
                <p className="flex-1 text-sm text-sand-700">{q.text}</p>
                <button onClick={() => removeQuestion(i)} className="opacity-0 group-hover:opacity-100 text-sand-300 hover:text-red-400 shrink-0 transition-opacity">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
            {addingQ ? (
              <div className="flex gap-2 mt-1">
                <input autoFocus value={newQuestion} onChange={e => setNewQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') addQuestion(newQuestion); if (e.key==='Escape') { setAddingQ(false); setNewQuestion('') } }}
                  placeholder="Add a question…"
                  className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"/>
                <button onClick={() => addQuestion(newQuestion)} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm">Add</button>
                <button onClick={() => { setAddingQ(false); setNewQuestion('') }} className="text-sand-400 px-2"><X className="w-4 h-4"/></button>
              </div>
            ) : (
              <button onClick={() => setAddingQ(true)}
                className="flex items-center gap-1 text-xs text-sand-400 hover:text-sand-700 mt-1 transition-colors">
                <Plus className="w-3.5 h-3.5"/> Add question
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Past session card ────────────────────────────────────────────────────────
function PastCard({ block, checkin, onUpdate, onVideoUpload, uploading }) {
  const [linkMode,    setLinkMode]    = useState(false)
  const [linkInput,   setLinkInput]   = useState('')
  const [newFollowUp, setNewFollowUp] = useState('')
  const [addingFU,    setAddingFU]    = useState(false)
  const fileRef = useRef(null)

  const date      = toISO(blockToDate(block))
  const attended  = checkin?.attended ?? null
  const videoUrl  = checkin?.video_url || ''
  const followUps = checkin?.follow_ups || []
  const isComplete = attended && videoUrl && (followUps.length===0 || followUps.every(f=>f.done))

  async function saveLink() {
    if (!linkInput.trim()) return
    await onUpdate(block, { video_url: linkInput.trim() })
    setLinkMode(false); setLinkInput('')
  }
  async function addFollowUp() {
    if (!newFollowUp.trim()) return
    await onUpdate(block, { follow_ups: [...followUps, { id: Date.now().toString(), text: newFollowUp.trim(), done: false }] })
    setNewFollowUp(''); setAddingFU(false)
  }
  async function updateFollowUp(idx, item) {
    await onUpdate(block, { follow_ups: followUps.map((f,i) => i===idx ? item : f) })
  }
  async function deleteFollowUp(idx) {
    await onUpdate(block, { follow_ups: followUps.filter((_,i) => i!==idx) })
  }

  return (
    <div className={`bg-white border rounded-2xl p-4 space-y-4 ${isComplete ? 'border-green-200' : 'border-sand-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold text-sand-400 uppercase tracking-widest">{friendlyDate(date)}{block.time ? ` · ${block.time}` : ''}</p>
          <h3 className="font-semibold text-sand-900 text-sm mt-0.5">{block.session_name}</h3>
          {checkin?.topic && <p className="text-xs text-blush-500 mt-0.5">Topic: {checkin.topic}</p>}
        </div>
        {isComplete && <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Complete ✓</span>}
      </div>

      {/* Attended */}
      <button onClick={() => onUpdate(block, { attended: !attended })} className="flex items-center gap-2 w-full text-left">
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${attended ? 'bg-blush-500 border-blush-500' : 'border-sand-300'}`}>
          {attended && <Check className="w-3 h-3 text-white"/>}
        </div>
        <span className={`text-sm font-medium ${attended ? 'text-sand-900' : 'text-sand-500'}`}>I attended this session</span>
      </button>

      {/* Video */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide">Session Recording</p>
        {videoUrl ? (
          <div className="flex items-center gap-2 bg-sand-50 rounded-xl px-3 py-2">
            <Video className="w-4 h-4 text-blush-400 shrink-0"/>
            <a href={videoUrl} target="_blank" rel="noreferrer" className="text-sm text-blush-600 hover:text-blush-700 flex-1 truncate flex items-center gap-1">
              View recording <ExternalLink className="w-3 h-3 shrink-0"/>
            </a>
            <button onClick={() => onUpdate(block, { video_url: '' })} className="text-sand-300 hover:text-red-400"><X className="w-3.5 h-3.5"/></button>
          </div>
        ) : linkMode ? (
          <div className="flex gap-2">
            <input autoFocus value={linkInput} onChange={e => setLinkInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') saveLink(); if (e.key==='Escape') setLinkMode(false) }}
              placeholder="Paste Zoom, Loom or Drive link…"
              className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"/>
            <button onClick={saveLink} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm">Save</button>
            <button onClick={() => setLinkMode(false)} className="text-sand-400 px-2"><X className="w-4 h-4"/></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sand-200 text-sand-600 hover:bg-sand-50 transition-colors disabled:opacity-50">
              <Upload className="w-3.5 h-3.5"/> {uploading ? 'Uploading…' : 'Upload video'}
            </button>
            <button onClick={() => setLinkMode(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-sand-200 text-sand-600 hover:bg-sand-50 transition-colors">
              <Link className="w-3.5 h-3.5"/> Paste link
            </button>
            <input ref={fileRef} type="file" accept="video/*" className="hidden"
              onChange={e => e.target.files[0] && onVideoUpload(block, e.target.files[0])}/>
          </div>
        )}
      </div>

      {/* Follow-ups */}
      <div>
        <p className="text-xs font-semibold text-sand-500 uppercase tracking-wide mb-1">Follow-ups</p>
        {followUps.length===0 && !addingFU && <p className="text-xs text-sand-400 italic">No follow-ups yet</p>}
        <div className="group space-y-0.5">
          {followUps.map((fu, i) => (
            <FollowUpRow key={fu.id||i} item={fu} onChange={item => updateFollowUp(i, item)} onDelete={() => deleteFollowUp(i)}/>
          ))}
        </div>
        {addingFU ? (
          <div className="flex gap-2 mt-2">
            <input autoFocus value={newFollowUp} onChange={e => setNewFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') addFollowUp(); if (e.key==='Escape') { setAddingFU(false); setNewFollowUp('') } }}
              placeholder="e.g. Send resources to Sarah…"
              className="flex-1 text-sm border border-sand-200 rounded-xl px-3 py-2 outline-none focus:border-blush-300"/>
            <button onClick={addFollowUp} className="px-3 py-2 bg-blush-500 text-white rounded-xl text-sm">Add</button>
            <button onClick={() => { setAddingFU(false); setNewFollowUp('') }} className="text-sand-400 px-2"><X className="w-4 h-4"/></button>
          </div>
        ) : (
          <button onClick={() => setAddingFU(true)} className="flex items-center gap-1 text-xs text-sand-400 hover:text-sand-700 mt-1">
            <Plus className="w-3.5 h-3.5"/> Add follow-up
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

  const [blocks,    setBlocks]    = useState([])
  const [checkins,  setCheckins]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [uploading, setUploading] = useState({})
  const [uploadingResource, setUploadingResource] = useState({})

  useEffect(() => {
    Promise.all([getCoachRosterBlocks(coachName), getSessionCheckins(coachName)])
      .then(([rosterBlocks, checkinList]) => {
        const cutoff  = addDays(todayDate, -14)
        const ceiling = addDays(todayDate, 14)
        setBlocks(rosterBlocks.filter(b => { const d = blockToDate(b); return d >= cutoff && d <= ceiling }))
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
        ...(checkins[key]||{}), coach_name: coachName,
        session_date: date, session_name: block.session_name,
        week_start: block.week_start, day_key: block.day_key,
        time: block.time||'', will_attend: val,
      })
      setCheckins(prev => ({ ...prev, [key]: saved }))
    } catch(e) { setError(e.message) }
  }

  async function handleUpdate(block, updates) {
    const date = toISO(blockToDate(block))
    const key  = checkinKey(date, block.session_name)
    try {
      const saved = await upsertSessionCheckin({
        ...(checkins[key]||{}), coach_name: coachName,
        session_date: date, session_name: block.session_name,
        week_start: block.week_start, day_key: block.day_key,
        time: block.time||'', ...updates,
      })
      setCheckins(prev => ({ ...prev, [key]: saved }))
    } catch(e) { setError(e.message) }
  }

  async function handleVideoUpload(block, file) {
    const date = toISO(blockToDate(block))
    const key  = checkinKey(date, block.session_name)
    setUploading(prev => ({ ...prev, [key]: true }))
    try {
      const url = await uploadSessionVideo(file, coachName, date, block.session_name)
      await handleUpdate(block, { video_url: url, video_reviewed: false })
    } catch(e) { setError(e.message) }
    finally { setUploading(prev => ({ ...prev, [key]: false })) }
  }

  async function handleResourceUpload(block, file) {
    const date = toISO(blockToDate(block))
    const key  = checkinKey(date, block.session_name)
    setUploadingResource(prev => ({ ...prev, [key]: true }))
    try {
      const url = await uploadSessionVideo(file, coachName, `${date}-resource`, block.session_name)
      const existing = checkins[key]?.resources || []
      await handleUpdate(block, { resources: [...existing, { name: file.name, url }] })
    } catch(e) { setError(e.message) }
    finally { setUploadingResource(prev => ({ ...prev, [key]: false })) }
  }

  const upcoming = blocks.filter(b => !isSessionPast(b)).sort((a,b) => blockToDate(a)-blockToDate(b))
  const past     = blocks.filter(b =>  isSessionPast(b)).sort((a,b) => blockToDate(b)-blockToDate(a))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-blush-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-sand-900">My Sessions</h1>
        <p className="text-sand-400 text-sm mt-0.5">Your rostered coaching sessions</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">

        {/* Past sessions — narrow left column */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-sand-500 uppercase tracking-widest">Recent Sessions</h2>
          {past.length === 0 ? (
            <p className="text-sm text-sand-400 bg-white border border-sand-200 rounded-2xl px-4 py-8 text-center">No recent sessions</p>
          ) : (
            past.map(b => {
              const key = checkinKey(toISO(blockToDate(b)), b.session_name)
              return (
                <PastCard key={b.id} block={b} checkin={getCheckin(b)}
                  onUpdate={handleUpdate} onVideoUpload={handleVideoUpload}
                  uploading={!!uploading[key]}
                />
              )
            })
          )}
        </div>

        {/* Upcoming — wide right column */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-xs font-bold text-sand-500 uppercase tracking-widest">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-sand-400 bg-white border border-sand-200 rounded-2xl px-4 py-8 text-center">No upcoming sessions in the next 2 weeks</p>
          ) : (
            upcoming.map(b => {
              const key = checkinKey(toISO(blockToDate(b)), b.session_name)
              return (
                <UpcomingCard key={b.id} block={b} checkin={getCheckin(b)}
                  onConfirm={handleConfirm} onUpdate={handleUpdate}
                  onResourceUpload={handleResourceUpload}
                  uploadingResource={!!uploadingResource[key]}
                />
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
