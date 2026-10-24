import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// Notifications are sample data for now (there is no backend for them yet).
// Which ones have been read, and the notification settings, are saved in the browser.
const READ_KEY = 'riffle.notifications.read'
const SETTINGS_KEY = 'riffle.notifications.settings'

// type is one of: Mentions, Follows, Events, Replies, System
const items = [
  { id: 1, who: 'Rosa Park', text: 'liked your comment on “Playing the full synth set at BattleBox”', time: '2h ago', type: 'Replies', to: '/forum' },
  { id: 2, who: 'Joel Tan', text: 'started following you', time: '4h ago', type: 'Follows', to: '/messages?c=joel-tan' },
  { id: 3, who: 'Mei Xuan', text: 'mentioned you in a post: “@you check out this new track!”', time: '1d ago', type: 'Mentions', to: '/forum' },
  { id: 4, who: '', text: 'New event added near you: “Sherman Zhuo: Midnight Letters” at Esplanade Annexe Studio', time: '1d ago', type: 'Events', to: '/events/sherman-zhuo-esplanade' },
  { id: 5, who: 'FallingIslands', text: 'replied to your comment: “Thanks for the support!”', time: '2d ago', type: 'Replies', to: '/forum' },
  { id: 6, who: 'Ravi S.', text: 'liked your post on “Best local R&B artists?”', time: '3d ago', type: 'Replies', to: '/forum' },
  { id: 7, who: '', text: 'Your weekly digest is ready! See this week’s top artists and events.', time: '5d ago', type: 'System', to: '/discover' },
]

// first time: the first three are unread
const startingRead = [4, 5, 6, 7]

const settingNames = ['New gigs near me', 'Artists I follow', 'Forum replies', 'Mentions', 'Follows', 'Weekly digest']

function readFromStorage(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    return saved === null ? fallback : saved
  } catch {
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private mode or full storage: keep working without saving
  }
}

export const useNotificationsStore = defineStore('notifications', () => {
  const readIds = ref(readFromStorage(READ_KEY, startingRead))

  const defaultSettings = {}
  for (const name of settingNames) {
    defaultSettings[name] = true
  }
  const settings = ref({ ...defaultSettings, ...readFromStorage(SETTINGS_KEY, {}) })

  const list = computed(() => items.map(item => ({ ...item, unread: !readIds.value.includes(item.id) })))
  const unreadCount = computed(() => list.value.filter(item => item.unread).length)

  function markRead(id) {
    if (readIds.value.includes(id)) return
    readIds.value = [...readIds.value, id]
    saveToStorage(READ_KEY, readIds.value)
  }

  function markAllRead() {
    readIds.value = items.map(item => item.id)
    saveToStorage(READ_KEY, readIds.value)
  }

  function toggleSetting(name) {
    settings.value = { ...settings.value, [name]: !settings.value[name] }
    saveToStorage(SETTINGS_KEY, settings.value)
  }

  return { list, unreadCount, settings, settingNames, markRead, markAllRead, toggleSetting }
})
