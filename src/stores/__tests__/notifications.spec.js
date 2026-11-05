import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

// a small in-memory stand-in for the notifications tables
const db = vi.hoisted(() => ({ rows: [], settings: null, newEvents: [], added: [], saved: [] }))

vi.mock('@/services/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
}))
vi.mock('@/services/notificationsApi', () => ({
  getNotifications: vi.fn(async () => db.rows.map((row) => ({ ...row }))),
  getNotificationSettings: vi.fn(async () => db.settings),
  saveNotificationSettings: vi.fn(async (userId, changes) => db.saved.push(changes)),
  getEventsAddedSince: vi.fn(async () => db.newEvents),
  addEventNotifications: vi.fn(async (rows) => db.added.push(...rows)),
  markNotificationRead: vi.fn(async () => {}),
  markAllNotificationsRead: vi.fn(async () => {}),
  deleteNotification: vi.fn(async () => {}),
  deleteReadNotifications: vi.fn(async () => {}),
  subscribeToNotifications: vi.fn(() => () => {}),
}))
vi.mock('@/composables/useNearbyGigs', async (original) => ({
  ...(await original()),
  locationIfAllowed: vi.fn(async () => null),
}))

const api = await import('@/services/notificationsApi')
const nearby = await import('@/composables/useNearbyGigs')
const { useUserStore } = await import('@/stores/user')
const { useNotificationsStore, timeAgo, toListItem } = await import('@/stores/notifications')

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()

async function signedInStore() {
  setActivePinia(createPinia())
  const user = useUserStore()
  user.isLoggedIn = true
  user.user.id = 'me'
  const store = useNotificationsStore()
  await flushPromises()
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  db.rows = [
    { id: 'a', type: 'reply', actor_name: 'Rosa', body: 'replied to your post "Hi"', link: '/forum/post/p1', read_at: null, created_at: hoursAgo(2) },
    { id: 'b', type: 'event', actor_name: null, body: 'New gig near you: Moon Carrot', link: '/events/mc', read_at: hoursAgo(1), created_at: hoursAgo(30) },
  ]
  db.settings = null
  db.newEvents = []
  db.added = []
  db.saved = []
})

describe('notification rows', () => {
  it('turns a database row into what the page shows', () => {
    expect(toListItem(db.rows[0])).toMatchObject({ id: 'a', who: 'Rosa', type: 'Replies', to: '/forum/post/p1', unread: true, time: '2h ago' })
    expect(toListItem({ ...db.rows[1], link: null })).toMatchObject({ who: '', type: 'Events', to: '/notifications', unread: false })
  })

  it('writes times the short way', () => {
    const now = Date.parse('2026-11-05T12:00:00Z')
    expect(timeAgo('2026-11-05T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-11-05T11:45:00Z', now)).toBe('15m ago')
    expect(timeAgo('2026-11-05T09:00:00Z', now)).toBe('3h ago')
    expect(timeAgo('2026-11-03T12:00:00Z', now)).toBe('2d ago')
  })
})

describe('notifications store', () => {
  it('loads your notifications when you log in', async () => {
    const store = await signedInStore()
    expect(api.getNotifications).toHaveBeenCalled()
    expect(store.list.map((n) => n.id)).toEqual(['a', 'b'])
    expect(store.unreadCount).toBe(1)
    expect(api.subscribeToNotifications).toHaveBeenCalledWith('me', expect.any(Function))
  })

  it('reads saved settings, and leaves out types the app does not show', async () => {
    db.settings = { mentions: false, last_events_check: hoursAgo(1) }
    db.rows.push({ id: 'old', type: 'system', actor_name: null, body: 'Old digest', link: null, read_at: null, created_at: hoursAgo(50) })
    const store = await signedInStore()
    expect(store.settings).toEqual({ 'New gigs near me': true, 'Forum replies': true, Mentions: false })
    expect(store.list.map((n) => n.id)).toEqual(['a', 'b'])
    expect(store.unreadCount).toBe(1)
  })

  it('on the first visit only remembers the time, so old gigs do not flood in', async () => {
    await signedInStore()
    expect(api.getEventsAddedSince).not.toHaveBeenCalled()
    expect(db.saved[0]).toHaveProperty('last_events_check')
  })

  it('adds new gigs since the last visit', async () => {
    db.settings = { last_events_check: hoursAgo(24) }
    db.newEvents = [{ id: 'mc-new', title: 'Moon Carrot Live', date_label: 'Sat, 14 Nov', venue: { name: 'TinBox', lat: 1.2985, lng: 103.8508 } }]
    await signedInStore()
    expect(db.added).toEqual([
      expect.objectContaining({ user_id: 'me', type: 'event', link: '/events/mc-new', dedupe_key: 'event:mc-new', body: 'New gig: Moon Carrot Live at TinBox (Sat, 14 Nov)' }),
    ])
  })

  it('skips new gigs when "New gigs near me" is off', async () => {
    db.settings = { gigs_near_me: false, last_events_check: hoursAgo(24) }
    db.newEvents = [{ id: 'x', title: 'X', venue: null }]
    await signedInStore()
    expect(db.added).toEqual([])
  })

  it('marks one as read straight away and saves it', async () => {
    const store = await signedInStore()
    await store.markRead('a')
    expect(store.unreadCount).toBe(0)
    expect(api.markNotificationRead).toHaveBeenCalledWith('a')
  })

  it('removes a notification, and puts it back if that fails', async () => {
    const store = await signedInStore()
    await store.remove('a')
    expect(store.list.map((n) => n.id)).toEqual(['b'])

    api.deleteNotification.mockRejectedValueOnce(new Error('offline'))
    await expect(store.remove('b')).rejects.toThrow('offline')
    expect(store.list.map((n) => n.id)).toEqual(['b'])
  })

  it('clears the read ones', async () => {
    const store = await signedInStore()
    await store.clearRead()
    expect(store.list.map((n) => n.id)).toEqual(['a'])
    expect(api.deleteReadNotifications).toHaveBeenCalled()
  })

  it('saves a setting to its column', async () => {
    const store = await signedInStore()
    await store.toggleSetting('Mentions')
    expect(store.settings.Mentions).toBe(false)
    expect(api.saveNotificationSettings).toHaveBeenLastCalledWith('me', { mentions: false })
  })

  it('empties everything when you log out', async () => {
    const store = await signedInStore()
    useUserStore().isLoggedIn = false
    await flushPromises()
    expect(store.list).toEqual([])
    expect(store.unreadCount).toBe(0)
  })
})

describe('new gigs near me', () => {
  const tinbox = { id: 't', title: 'Near', venue: { name: 'TinBox', lat: 1.2985, lng: 103.8508 } }
  const changi = { id: 'c', title: 'Far', venue: { name: 'Changi', lat: 1.3644, lng: 103.9915 } }

  it(`keeps only gigs within ${nearby.NEAR_KM} km of you`, () => {
    const rows = nearby.nearbyGigNotifications('me', [tinbox, changi], { lat: 1.295, lng: 103.849 })
    expect(rows.map((r) => r.link)).toEqual(['/events/t'])
    expect(rows[0].body).toBe('New gig near you: Near at TinBox')
  })

  it('without your location, every new gig counts', () => {
    expect(nearby.nearbyGigNotifications('me', [tinbox, changi], null)).toHaveLength(2)
  })
})
