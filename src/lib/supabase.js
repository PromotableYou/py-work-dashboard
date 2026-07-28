import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// ─── TASKS ───────────────────────────────────────────────────────────────────
export async function getTasks(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_tasks')
    .select('*')
    .eq('workspace', workspace)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
export async function addTask(task) {
  const { data, error } = await supabase
    .from('wd_tasks')
    .insert([{ ...task, project_id: task.project_id || null }])
    .select().single()
  if (error) throw error
  return data
}
export async function updateTask(id, updates) {
  const { error } = await supabase.from('wd_tasks').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteTask(id) {
  const { error } = await supabase.from('wd_tasks').delete().eq('id', id)
  if (error) throw error
}
export async function getAssignedTasks(workspace) {
  const { data, error } = await supabase
    .from('wd_tasks').select('*').eq('assigned_to', workspace)
    .order('created_at', { ascending: false })
  if (error) return [] // graceful if column doesn't exist yet
  return data
}
export async function addAssignedTask(task) {
  const { data, error } = await supabase
    .from('wd_tasks').insert([task]).select().single()
  if (error) throw error
  return data
}
export async function getUnreviewedVideos() {
  const { data, error } = await supabase
    .from('wd_session_checkins').select('*')
    .not('video_url', 'is', null)
    .neq('video_url', '')
    .eq('video_reviewed', false)
    .order('session_date', { ascending: false })
  if (error) return []
  return data
}
export async function markVideoReviewed(id) {
  const { error } = await supabase
    .from('wd_session_checkins').update({ video_reviewed: true }).eq('id', id)
  if (error) throw error
}

// ─── PROJECTS ────────────────────────────────────────────────────────────────
export async function getProjects(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_projects')
    .select('*')
    .eq('workspace', workspace)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
export async function addProject(project) {
  const { data, error } = await supabase
    .from('wd_projects').insert([project]).select().single()
  if (error) throw error
  return data
}
export async function updateProject(id, updates) {
  const { error } = await supabase.from('wd_projects').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteProject(id) {
  const { error } = await supabase.from('wd_projects').delete().eq('id', id)
  if (error) throw error
}

// ─── SUBTASKS ─────────────────────────────────────────────────────────────────
export async function getSubtasks(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_subtasks')
    .select('*')
    .eq('workspace', workspace)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
export async function addSubtask(subtask) {
  const { data, error } = await supabase
    .from('wd_subtasks').insert([subtask]).select().single()
  if (error) throw error
  return data
}
export async function updateSubtask(id, updates) {
  const { error } = await supabase.from('wd_subtasks').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteSubtask(id) {
  const { error } = await supabase.from('wd_subtasks').delete().eq('id', id)
  if (error) throw error
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
export async function getEvents() {
  const { data, error } = await supabase
    .from('wd_events').select('*').order('date', { ascending: true })
  if (error) throw error
  return data
}
export async function addEvent(event) {
  const { data, error } = await supabase
    .from('wd_events').insert([event]).select().single()
  if (error) throw error
  return data
}
export async function deleteEvent(id) {
  const { error } = await supabase.from('wd_events').delete().eq('id', id)
  if (error) throw error
}

// ─── IDEAS ────────────────────────────────────────────────────────────────────
export async function getIdeas(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_ideas').select('*')
    .eq('workspace', workspace)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addIdea(idea) {
  const { data, error } = await supabase
    .from('wd_ideas').insert([idea]).select().single()
  if (error) throw error
  return data
}
export async function deleteIdea(id) {
  const { error } = await supabase.from('wd_ideas').delete().eq('id', id)
  if (error) throw error
}

// ─── BRAIN DUMP ───────────────────────────────────────────────────────────────
export async function getDumps(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_dumps').select('*')
    .eq('workspace', workspace)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addDump(content, workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_dumps').insert([{ content, workspace }]).select().single()
  if (error) throw error
  return data
}
export async function deleteDump(id) {
  const { error } = await supabase.from('wd_dumps').delete().eq('id', id)
  if (error) throw error
}

// ─── RECURRING TASKS ──────────────────────────────────────────────────────────
export async function getRecurringTasks(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_recurring_tasks').select('*')
    .eq('workspace', workspace)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}
export async function addRecurringTask(text, workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_recurring_tasks')
    .insert([{ text, sort_order: Date.now(), workspace }])
    .select().single()
  if (error) throw error
  return data
}
export async function deleteRecurringTask(id) {
  const { error } = await supabase.from('wd_recurring_tasks').delete().eq('id', id)
  if (error) throw error
}

// ─── TIMELOG ──────────────────────────────────────────────────────────────────
export async function getTimelog(workspace = 'shaniah') {
  // Try workspace-filtered first; fall back to unfiltered if column not yet added
  const { data, error } = await supabase
    .from('wd_timelog').select('*').eq('workspace', workspace).order('date', { ascending: true })
  if (error) {
    const { data: all, error: e2 } = await supabase
      .from('wd_timelog').select('*').order('date', { ascending: true })
    if (e2) throw e2
    return all
  }
  return data
}
export async function upsertTimelogRow(row, workspace = 'shaniah') {
  const rowWithWs = { ...row, workspace }
  // Try with workspace column; fall back to original upsert if column not yet added
  const { data, error } = await supabase
    .from('wd_timelog').upsert([rowWithWs], { onConflict: 'date,workspace' }).select().single()
  if (error) {
    const { data: d2, error: e2 } = await supabase
      .from('wd_timelog').upsert([row], { onConflict: 'date' }).select().single()
    if (e2) throw e2
    return d2
  }
  return data
}
export async function deleteTimelogRow(id) {
  const { error } = await supabase.from('wd_timelog').delete().eq('id', id)
  if (error) throw error
}

// ─── MEETINGS ────────────────────────────────────────────────────────────────
export async function getMeetings(workspace = 'stacey') {
  const { data, error } = await supabase
    .from('wd_meetings').select('*')
    .eq('workspace', workspace)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}
export async function addMeeting(meeting) {
  const { data, error } = await supabase
    .from('wd_meetings').insert([meeting]).select().single()
  if (error) throw error
  return data
}
export async function updateMeeting(id, updates) {
  const { error } = await supabase.from('wd_meetings').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteMeeting(id) {
  const { error } = await supabase.from('wd_meetings').delete().eq('id', id)
  if (error) throw error
}

// ─── MEETING TASKS ────────────────────────────────────────────────────────────
export async function getMeetingTasks(meetingId) {
  const { data, error } = await supabase
    .from('wd_meeting_tasks').select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}
export async function addMeetingTask(meetingId, text) {
  const { data, error } = await supabase
    .from('wd_meeting_tasks').insert([{ meeting_id: meetingId, text, completed: false }]).select().single()
  if (error) throw error
  return data
}
export async function updateMeetingTask(id, updates) {
  const { data, error } = await supabase.from('wd_meeting_tasks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteMeetingTask(id) {
  const { error } = await supabase.from('wd_meeting_tasks').delete().eq('id', id)
  if (error) throw error
}

// ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────
export async function getTeamMembers() {
  const { data, error } = await supabase
    .from('wd_team_members').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data
}
export async function addTeamMember(member) {
  const { data, error } = await supabase
    .from('wd_team_members').insert([member]).select().single()
  if (error) throw error
  return data
}
export async function deleteTeamMember(id) {
  const { error } = await supabase.from('wd_team_members').delete().eq('id', id)
  if (error) throw error
}

// ─── TEAM HOURS ───────────────────────────────────────────────────────────────
export async function getTeamHours() {
  const { data, error } = await supabase
    .from('wd_team_hours').select('*').order('date', { ascending: true })
  if (error) throw error
  return data
}
export async function upsertTeamHourRow(row) {
  const { data, error } = await supabase
    .from('wd_team_hours')
    .upsert([row], { onConflict: 'person_name,date' })
    .select().single()
  if (error) throw error
  return data
}

// ─── QUICK LINKS ─────────────────────────────────────────────────────────────
export async function getQuickLinks(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_quick_links').select('*')
    .eq('workspace', workspace)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}
export async function addQuickLink(link) {
  const { data, error } = await supabase
    .from('wd_quick_links').insert([link]).select().single()
  if (error) throw error
  return data
}
export async function deleteQuickLink(id) {
  const { error } = await supabase.from('wd_quick_links').delete().eq('id', id)
  if (error) throw error
}

// ─── COACHES ─────────────────────────────────────────────────────────────────
export async function getCoaches() {
  const { data, error } = await supabase
    .from('wd_coaches').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data
}
export async function addCoach(coach) {
  const { data, error } = await supabase
    .from('wd_coaches').insert([coach]).select().single()
  if (error) throw error
  return data
}
export async function updateCoach(id, updates) {
  const { data, error } = await supabase.from('wd_coaches').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteCoach(id) {
  const { error } = await supabase.from('wd_coaches').delete().eq('id', id)
  if (error) throw error
}

// ─── COACH HOURS ──────────────────────────────────────────────────────────────
export async function getCoachHours() {
  const { data, error } = await supabase
    .from('wd_coach_hours').select('*').order('date', { ascending: true })
  if (error) throw error
  return data
}
export async function upsertCoachHourRow(row) {
  const { data, error } = await supabase
    .from('wd_coach_hours')
    .upsert([row], { onConflict: 'coach_name,date' })
    .select().single()
  if (error) throw error
  return data
}

// ─── NOTES ────────────────────────────────────────────────────────────────────
export async function getNotes(workspace = 'shaniah') {
  const { data, error } = await supabase
    .from('wd_notes').select('*')
    .eq('workspace', workspace)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addNote(note) {
  const { data, error } = await supabase
    .from('wd_notes').insert([note]).select().single()
  if (error) throw error
  return data
}
export async function updateNote(id, updates) {
  const { data, error } = await supabase
    .from('wd_notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteNote(id) {
  const { error } = await supabase.from('wd_notes').delete().eq('id', id)
  if (error) throw error
}

// ─── ROSTER ───────────────────────────────────────────────────────────────────
export async function getRoster(weekStart) {
  const { data, error } = await supabase
    .from('wd_roster').select('*')
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}
export async function upsertRosterRow(row) {
  const { data, error } = await supabase
    .from('wd_roster')
    .upsert([row], { onConflict: 'week_start,slot_label' })
    .select().single()
  if (error) throw error
  return data
}
export async function deleteRosterRow(id) {
  const { error } = await supabase.from('wd_roster').delete().eq('id', id)
  if (error) throw error
}

// ─── COACH LOGS ───────────────────────────────────────────────────────────────
export async function getUnapprovedCoachLogsCount() {
  // Only count unapproved logs within the current + previous pay period
  // Pay periods: 14-day fortnights anchored at 2025-01-06
  const anchor = new Date('2025-01-06')
  const now    = new Date()
  const diff   = Math.floor((now - anchor) / (1000 * 60 * 60 * 24 * 14))
  const periodStart = new Date(anchor)
  periodStart.setDate(anchor.getDate() + (diff - 1) * 14) // go back one extra period to catch recent pending
  const fromISO = periodStart.toISOString().slice(0, 10)

  const { count, error } = await supabase
    .from('wd_coach_logs')
    .select('*', { count: 'exact', head: true })
    .eq('approved', false)
    .gte('date', fromISO)
  if (error) return 0
  return count || 0
}
export async function getCoachLogs(coachName) {
  const { data, error } = await supabase
    .from('wd_coach_logs').select('*')
    .eq('coach_name', coachName)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}
export async function getAllCoachLogs() {
  const { data, error } = await supabase
    .from('wd_coach_logs').select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}
export async function addCoachLog(log) {
  const { data, error } = await supabase
    .from('wd_coach_logs').insert([log]).select().single()
  if (error) throw error
  return data
}
export async function upsertCoachLog(log) {
  const { data, error } = await supabase
    .from('wd_coach_logs')
    .upsert([log], { onConflict: 'coach_name,date' })
    .select().single()
  if (error) throw error
  return data
}
export async function updateCoachLog(id, updates) {
  const { data, error } = await supabase
    .from('wd_coach_logs').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function approveCoachLog(logId, { person_name, date, hours, coaching_hours, admin_hours }) {
  // Mark log as approved
  const { error: e1 } = await supabase
    .from('wd_coach_logs')
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq('id', logId)
  if (e1) throw e1

  // Ensure the coach exists in wd_team_members so they show as a row in the grid
  const { data: existing } = await supabase
    .from('wd_team_members')
    .select('id')
    .eq('name', person_name)
    .maybeSingle()
  if (!existing) {
    const colors = ['#f9a8d4','#fca5a5','#fdba74','#a5b4fc','#86efac','#7dd3fc']
    await supabase.from('wd_team_members').insert([{
      name: person_name,
      color: colors[Math.floor(Math.random() * colors.length)],
    }])
  }

  // Write total hours into team hours grid (split is stored in wd_coach_logs only)
  // Always prefer `hours` (the total the coach manually entered/confirmed)
  // and only fall back to coaching+admin sum if hours is absent
  const totalHours = parseFloat(hours) ||
    ((parseFloat(coaching_hours) || 0) + (parseFloat(admin_hours) || 0))
  const { error: e2 } = await supabase
    .from('wd_team_hours')
    .upsert([{ person_name, date, hours: totalHours, worked: true, type: 'Normal' }],
      { onConflict: 'person_name,date' })
  if (e2) throw e2
}
export async function unapproveCoachLog(logId, { person_name, date }) {
  // Unmark approval
  const { error: e1 } = await supabase
    .from('wd_coach_logs')
    .update({ approved: false, approved_at: null })
    .eq('id', logId)
  if (e1) throw e1
  // Remove from team hours
  const { error: e2 } = await supabase
    .from('wd_team_hours')
    .delete()
    .eq('person_name', person_name)
    .eq('date', date)
  if (e2) throw e2
}
export async function deleteCoachLog(id) {
  const { error } = await supabase.from('wd_coach_logs').delete().eq('id', id)
  if (error) throw error
}

// ─── ROSTER BLOCKS (drag-and-drop sessions) ───────────────────────────────────
export async function getRosterBlocks(weekStart) {
  const { data, error } = await supabase
    .from('wd_roster_blocks').select('*')
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}
export async function addRosterBlock(block) {
  const { data, error } = await supabase
    .from('wd_roster_blocks').insert([block]).select().single()
  if (error) throw error
  return data
}
export async function updateRosterBlock(id, updates) {
  const { data, error } = await supabase
    .from('wd_roster_blocks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteRosterBlock(id) {
  const { error } = await supabase.from('wd_roster_blocks').delete().eq('id', id)
  if (error) throw error
}

// ─── SESSION TYPES ────────────────────────────────────────────────────────────
export async function getSessionTypes() {
  const { data, error } = await supabase
    .from('wd_session_types').select('*').order('sort_order', { ascending: true })
  if (error) throw error
  return data
}
export async function addSessionType(st) {
  const { data, error } = await supabase
    .from('wd_session_types').insert([st]).select().single()
  if (error) throw error
  return data
}
export async function updateSessionType(id, updates) {
  const { data, error } = await supabase
    .from('wd_session_types').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteSessionType(id) {
  const { error } = await supabase.from('wd_session_types').delete().eq('id', id)
  if (error) throw error
}

// ─── SESSION CHECKINS ─────────────────────────────────────────────────────────
export async function getCoachRosterBlocks(coachName) {
  const { data, error } = await supabase
    .from('wd_roster_blocks').select('*').eq('coach_name', coachName)
  if (error) throw error
  return data
}
export async function getSessionCheckins(coachName) {
  const { data, error } = await supabase
    .from('wd_session_checkins').select('*').eq('coach_name', coachName)
    .order('session_date', { ascending: false })
  if (error) throw error
  return data
}
export async function upsertSessionCheckin(checkin) {
  const { data, error } = await supabase
    .from('wd_session_checkins')
    .upsert([checkin], { onConflict: 'coach_name,session_date,session_name' })
    .select().single()
  if (error) throw error
  return data
}
export async function uploadSessionVideo(file, coachName, sessionDate, sessionName) {
  const ext = file.name.split('.').pop()
  const safeName = sessionName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const path = `${coachName.toLowerCase()}/${sessionDate}/${safeName}.${ext}`
  const { data, error } = await supabase.storage
    .from('session-videos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('session-videos').getPublicUrl(data.path)
  return publicUrl
}

// Upload a video to Google Drive via Supabase Edge Functions.
// The browser uploads directly to Drive (no Supabase bandwidth used).
// onProgress(0-100) is called during the upload.
export async function uploadVideoToDrive(file, coachName, sessionDate, sessionName, onProgress) {
  // Show 0% immediately so the user knows something is happening
  onProgress?.(0)

  // Step 1 — get a resumable upload URL from the edge function
  const { data: initData, error: initError } = await supabase.functions.invoke('drive-init-upload', {
    body: {
      coachName,
      sessionDate,
      sessionName,
      fileName:    file.name,
      contentType: file.type || 'video/mp4',
      size:        file.size,
    },
  })
  if (initError) throw new Error(`Drive init: ${initError.message}`)
  if (!initData || typeof initData !== 'object') throw new Error(`Drive init: unexpected response`)
  if (initData.error) throw new Error(`Drive init: ${initData.error}`)
  if (!initData.uploadUrl) throw new Error(`Drive init: no upload URL returned`)
  const { uploadUrl } = initData

  // Step 2 — upload file directly to Drive from the browser
  const fileId = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText).id) }
        catch { reject(new Error('Could not parse Drive upload response')) }
      } else {
        reject(new Error(`Drive upload failed (${xhr.status}): ${xhr.responseText.slice(0, 200)}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during Drive upload'))
    xhr.send(file)
  })

  return `https://drive.google.com/file/d/${fileId}/view`
}

// ─── KEY PRIORITIES ───────────────────────────────────────────────────────────
export async function getAllPriorityItems() {
  const { data, error } = await supabase
    .from('wd_priorities').select('*')
    .neq('status', 'done')
    .order('workspace').order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}
export async function getMyPriorities(workspace) {
  const { data, error } = await supabase
    .from('wd_priorities').select('*')
    .eq('workspace', workspace).neq('status', 'done')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}
export async function getAllActivePriorities() {
  const { data, error } = await supabase
    .from('wd_priorities').select('*')
    .eq('status', 'active')
    .order('workspace').order('slot', { ascending: true })
  if (error) throw error
  return data || []
}
export async function getAllPendingPriorities() {
  const { data, error } = await supabase
    .from('wd_priorities').select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}
export async function addPriorityItem(item) {
  const { data, error } = await supabase
    .from('wd_priorities').insert([item]).select().single()
  if (error) throw error
  return data
}
export async function updatePriorityItem(id, updates) {
  const { error } = await supabase.from('wd_priorities').update(updates).eq('id', id)
  if (error) throw error
}
export async function deletePriorityItem(id) {
  const { error } = await supabase.from('wd_priorities').delete().eq('id', id)
  if (error) throw error
}

// ─── MARKETING CALENDAR ───────────────────────────────────────────────────────
export async function getMarketingEvents() {
  const { data, error } = await supabase
    .from('wd_marketing_calendar').select('*')
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}
export async function addMarketingEvent(event) {
  const { data, error } = await supabase
    .from('wd_marketing_calendar').insert([event]).select().single()
  if (error) throw error
  return data
}
export async function updateMarketingEvent(id, updates) {
  const { error } = await supabase.from('wd_marketing_calendar').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteMarketingEvent(id) {
  const { error } = await supabase.from('wd_marketing_calendar').delete().eq('id', id)
  if (error) throw error
}

// ─── SALES / COMMISSION ───────────────────────────────────────────────────────
export async function getMySales(workspace) {
  const { data, error } = await supabase
    .from('wd_sales').select('*')
    .eq('workspace', workspace)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}
export async function addSale(sale) {
  const { data, error } = await supabase
    .from('wd_sales').insert([sale]).select().single()
  if (error) throw error
  return data
}
export async function updateSale(id, updates) {
  const { error } = await supabase.from('wd_sales').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteSale(id) {
  const { error } = await supabase.from('wd_sales').delete().eq('id', id)
  if (error) throw error
}
