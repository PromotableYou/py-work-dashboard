import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// ─── TASKS ──────────────────────────────────────────────────────────────────
export async function getTasks() {
  const { data, error } = await supabase
    .from('wd_tasks')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addTask(task) {
  const { data, error } = await supabase
    .from('wd_tasks')
    .insert([task])
    .select()
    .single()
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
export async function getProjects() {
  const { data, error } = await supabase
    .from('wd_projects')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addProject(project) {
  const { data, error } = await supabase
    .from('wd_projects')
    .insert([project])
    .select()
    .single()
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

// ─── CALENDAR ────────────────────────────────────────────────────────────────
export async function getEvents() {
  const { data, error } = await supabase
    .from('wd_events')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

export async function addEvent(event) {
  const { data, error } = await supabase
    .from('wd_events')
    .insert([event])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('wd_events').delete().eq('id', id)
  if (error) throw error
}

// ─── IDEAS ───────────────────────────────────────────────────────────────────
export async function getIdeas() {
  const { data, error } = await supabase
    .from('wd_ideas')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addIdea(idea) {
  const { data, error } = await supabase
    .from('wd_ideas')
    .insert([idea])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIdea(id) {
  const { error } = await supabase.from('wd_ideas').delete().eq('id', id)
  if (error) throw error
}

// ─── BRAIN DUMP ──────────────────────────────────────────────────────────────
export async function getDumps() {
  const { data, error } = await supabase
    .from('wd_dumps')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addDump(content) {
  const { data, error } = await supabase
    .from('wd_dumps')
    .insert([{ content }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDump(id) {
  const { error } = await supabase.from('wd_dumps').delete().eq('id', id)
  if (error) throw error
}

// ─── TIMESHEET ───────────────────────────────────────────────────────────────
export async function getTimesheet() {
  const { data, error } = await supabase
    .from('wd_timesheet')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function addTimeEntry(entry) {
  const { data, error } = await supabase
    .from('wd_timesheet')
    .insert([entry])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTimeEntry(id) {
  const { error } = await supabase.from('wd_timesheet').delete().eq('id', id)
  if (error) throw error
}
