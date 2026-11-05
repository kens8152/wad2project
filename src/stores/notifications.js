import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  addEventNotifications,
  deleteNotification,
  deleteReadNotifications,
  getEventsAddedSince,
  getNotifications,
  getNotificationSettings,
  markAllNotificationsRead,
  markNotificationRead,
  saveNotificationSettings,
  subscribeToNotifications,
} from '@/services/notificationsApi'
import { locationIfAllowed, nearbyGigNotifications } from '@/composables/useNearbyGigs'

// Each person's notifications come from the Supabase "notifications" table (see supabase/notifications.sql).
// Forum replies and mentions are added by the database itself (triggers in supabase/schema.sql);
// this store adds "new gigs near me" when you open the app, because only the browser knows where you are.

// setting name shown on the page -> column in the notification_settings table
export const SETTINGS = [
  { name: 'New gigs near me', column: 'gigs_near_me' },
  { name: 'Forum replies', column: 'forum_replies' },
  { name: 'Mentions', column: 'mentions' },
]

// database type -> the tab it shows under
const TYPE_LABELS = { reply: 'Replies', mention: 'Mentions', event: 'Events' }

// "just now", "5m ago", "3h ago", "2d ago", then the date
export function timeAgo(isoTime, now = Date.now()) {
  const minutes = Math.floor((now - new Date(isoTime).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return minutes + 'm ago'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + 'h ago'
  const days = Math.floor(hours / 24)
  if (days < 7) return days + 'd ago'
  return new Date(isoTime).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// a database row -> what the page shows
export function toListItem(row) {
  return {
    id: row.id,
    who: row.actor_name || '',
    text: row.body,
    time: timeAgo(row.created_at),
    createdAt: row.created_at,
    type: TYPE_LABELS[row.type],
    to: row.link || '/notifications',
    unread: !row.read_at,
  }
}

function allOn() {
  const settings = {}
  for (const setting of SETTINGS) settings[setting.name] = true
  return settings
}

export const useNotificationsStore = defineStore('notifications', () => {
  const userStore = useUserStore()

  const rows = ref([])
  const settings = ref(allOn())
  const settingNames = SETTINGS.map(setting => setting.name)
  const loading = ref(false)
  const error = ref('')

  // only the types the app knows about
  const known = computed(() => rows.value.filter(row => TYPE_LABELS[row.type]))
  const list = computed(() => known.value.map(toListItem))
  const unreadCount = computed(() => known.value.filter(row => !row.read_at).length)

  let currentUserId = ''
  let stopLive = null
  let loadVersion = 0

  async function refresh() {
    if (!currentUserId) return
    const version = loadVersion
    try {
      const data = await getNotifications()
      if (version === loadVersion) {
        rows.value = data
        error.value = ''
      }
    } catch (e) {
      if (version === loadVersion) error.value = 'Could not load your notifications.'
      console.error('Could not load notifications:', e)
    }
  }

  // New gigs since your last visit; the first visit only remembers the time, so old gigs do not flood in
  async function checkNewGigs(savedSettings) {
    const now = new Date().toISOString()
    const lastCheck = savedSettings?.last_events_check
    if (lastCheck && settings.value['New gigs near me']) {
      const events = await getEventsAddedSince(lastCheck)
      if (events.length) {
        const location = await locationIfAllowed()
        await addEventNotifications(nearbyGigNotifications(currentUserId, events, location))
      }
    }
    await saveNotificationSettings(currentUserId, { last_events_check: now })
  }

  async function start(userId) {
    stop()
    currentUserId = userId
    const version = ++loadVersion
    loading.value = true

    try {
      const saved = await getNotificationSettings()
      if (version !== loadVersion) return
      const next = allOn()
      if (saved) {
        for (const setting of SETTINGS) next[setting.name] = saved[setting.column] !== false
      }
      settings.value = next

      // this only adds rows; if it fails, the list still loads
      await checkNewGigs(saved).catch(e => console.warn('Could not check for new gigs:', e))
    } catch (e) {
      console.error('Could not load notification settings:', e)
    } finally {
      if (version === loadVersion) {
        await refresh()
        loading.value = false
      }
    }

    if (version !== loadVersion) return
    stopLive = subscribeToNotifications(userId, () => refresh())
    window.addEventListener('focus', refresh)
  }

  function stop() {
    loadVersion++
    if (stopLive) stopLive()
    stopLive = null
    window.removeEventListener('focus', refresh)
    currentUserId = ''
    rows.value = []
    settings.value = allOn()
    error.value = ''
    loading.value = false
  }

  // load when someone logs in, clear when they log out
  watch(
    () => (userStore.isLoggedIn ? userStore.user.id : ''),
    (userId) => {
      if (userId) start(userId)
      else stop()
    },
    { immediate: true },
  )

  // ---- managing the list (the page changes straight away, and goes back if saving fails) ----

  async function markRead(id) {
    const row = rows.value.find(item => item.id === id)
    if (!row || row.read_at) return
    row.read_at = new Date().toISOString()
    try {
      await markNotificationRead(id)
    } catch (e) {
      row.read_at = null
      console.error('Could not mark as read:', e)
    }
  }

  async function markAllRead() {
    const before = rows.value
    const now = new Date().toISOString()
    rows.value = rows.value.map(row => (row.read_at ? row : { ...row, read_at: now }))
    try {
      await markAllNotificationsRead()
    } catch (e) {
      rows.value = before
      throw e
    }
  }

  async function remove(id) {
    const before = rows.value
    rows.value = rows.value.filter(row => row.id !== id)
    try {
      await deleteNotification(id)
    } catch (e) {
      rows.value = before
      throw e
    }
  }

  async function clearRead() {
    const before = rows.value
    rows.value = rows.value.filter(row => !row.read_at)
    try {
      await deleteReadNotifications()
    } catch (e) {
      rows.value = before
      throw e
    }
  }

  async function toggleSetting(name) {
    const setting = SETTINGS.find(item => item.name === name)
    if (!setting || !currentUserId) return
    const value = !settings.value[name]
    settings.value = { ...settings.value, [name]: value }
    try {
      await saveNotificationSettings(currentUserId, { [setting.column]: value })
    } catch (e) {
      settings.value = { ...settings.value, [name]: !value }
      throw e
    }
  }

  return {
    list,
    unreadCount,
    settings,
    settingNames,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    remove,
    clearRead,
    toggleSetting,
  }
})
