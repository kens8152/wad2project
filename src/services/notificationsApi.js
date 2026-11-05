import { supabase } from '@/services/supabase'

// List

export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, actor_name, body, link, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
  if (error) throw error
}

export async function deleteNotification(id) {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

export async function deleteReadNotifications() {
  const { error } = await supabase.from('notifications').delete().not('read_at', 'is', null)
  if (error) throw error
}

// Settings

export async function getNotificationSettings() {
  const { data, error } = await supabase.from('notification_settings').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function saveNotificationSettings(userId, changes) {
  const { error } = await supabase.from('notification_settings').upsert({ user_id: userId, ...changes }, { onConflict: 'user_id' })
  if (error) throw error
}

// New gigs near me

export async function getEventsAddedSince(time) {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, date_label, created_at, venue:venues(name, lat, lng)')
    .gt('created_at', time)
  if (error) throw error
  return data
}

export async function addEventNotifications(rows) {
  if (!rows.length) return
  const { error } = await supabase.from('notifications').upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
  if (error) throw error
}

// Live updates

export function subscribeToNotifications(userId, onChange) {
  const channel = supabase
    .channel('notifications:' + userId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
