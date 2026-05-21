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
export async function getTimelog() {
  const { data, error } = await supabase
    .from('wd_timelog').select('*').order('date', { ascending: true })
  if (error) throw error
  return data
}
export async function upsertTimelogRow(row) {
  const { data, error } = await supabase
    .from('wd_timelog').upsert([row], { onConflict: 'date' }).select().single()
  if (error) throw error
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
