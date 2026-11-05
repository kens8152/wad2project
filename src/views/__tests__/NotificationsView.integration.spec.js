import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

const db = vi.hoisted(() => ({ rows: [], settings: null, saved: [] }))

vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))
vi.mock('@/composables/useToast', () => ({ toast: vi.fn() }))
vi.mock('@/composables/useNearbyGigs', () => ({ locationIfAllowed: async () => null, nearbyGigNotifications: () => [] }))
vi.mock('@/services/notificationsApi', () => ({
  getNotifications: vi.fn(async () => db.rows.map((row) => ({ ...row }))),
  getNotificationSettings: vi.fn(async () => db.settings),
  saveNotificationSettings: vi.fn(async (userId, changes) => db.saved.push(changes)),
  getEventsAddedSince: vi.fn(async () => []),
  addEventNotifications: vi.fn(async () => {}),
  markNotificationRead: vi.fn(async () => {}),
  markAllNotificationsRead: vi.fn(async () => {}),
  deleteNotification: vi.fn(async () => {}),
  deleteReadNotifications: vi.fn(async () => {}),
  subscribeToNotifications: vi.fn(() => () => {}),
}))

const api = await import('@/services/notificationsApi')
const { toast } = await import('@/composables/useToast')
const { useUserStore } = await import('@/stores/user')
const { default: NotificationsView } = await import('../NotificationsView.vue')

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()
const ROWS = [
  { id: 'r1', type: 'reply', actor_name: 'Rosa', body: 'replied to your post "Synth set"', link: '/forum/post/p1', read_at: null, created_at: hoursAgo(1) },
  { id: 'm1', type: 'mention', actor_name: 'Mei', body: 'mentioned you in a post: "Gig buddies?"', link: '/forum/post/p2', read_at: null, created_at: hoursAgo(3) },
  { id: 'u1', type: 'upvote', actor_name: 'Joel', body: 'upvoted your post "Synth set"', link: '/forum/post/p1', read_at: hoursAgo(1), created_at: hoursAgo(5) },
  { id: 'd1', type: 'downvote', actor_name: 'Ravi', body: 'downvoted your post "Synth set"', link: '/forum/post/p1', read_at: null, created_at: hoursAgo(8) },
  { id: 'e1', type: 'event', actor_name: null, body: 'New gig near you: Moon Carrot at TinBox', link: '/events/mc', read_at: hoursAgo(1), created_at: hoursAgo(30) },
]

const Blank = { template: '<div />' }
let wrapper
let router

async function mountPage({ loggedIn = true } = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/notifications', component: NotificationsView },
      { path: '/:any(.*)*', component: Blank },
    ],
  })
  router.push('/notifications')
  await router.isReady()

  setActivePinia(createPinia())
  const user = useUserStore()
  user.isLoggedIn = loggedIn
  user.user.id = loggedIn ? 'me' : ''

  wrapper = mount(NotificationsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const lines = () => wrapper.findAll('.notification-line').map((l) => l.text())
const tab = (label) => wrapper.findAll('[role="tab"]').find((t) => t.text().startsWith(label))
const button = (label) => wrapper.findAll('button').find((b) => b.text().includes(label))
const toggle = (name) => wrapper.get(`input[aria-label="${name}"]`)

beforeEach(() => {
  vi.clearAllMocks()
  db.rows = structuredClone(ROWS)
  db.settings = null
  db.saved = []
})

afterEach(() => wrapper?.unmount())

describe('Notifications page', () => {
  it('asks a guest to log in', async () => {
    await mountPage({ loggedIn: false })
    expect(wrapper.text()).toContain('to see your notifications')
    expect(api.getNotifications).not.toHaveBeenCalled()
  })

  it('lists your notifications, newest first, with the unread count', async () => {
    await mountPage()
    expect(lines()).toEqual([
      'Rosa replied to your post "Synth set"',
      'Mei mentioned you in a post: "Gig buddies?"',
      'Joel upvoted your post "Synth set"',
      'Ravi downvoted your post "Synth set"',
      'New gig near you: Moon Carrot at TinBox',
    ])
    expect(wrapper.get('.notifications-head p').text()).toBe('3 unread')
    expect(wrapper.findAll('.unread-dot')).toHaveLength(3)
  })

  it('has a tab for each kind of notification', async () => {
    await mountPage()
    expect(wrapper.findAll('[role="tab"]').map((t) => t.text().replace(/\d+$/, '').trim())).toEqual([
      'All',
      'Unread',
      'Mentions',
      'Replies',
      'Votes',
      'Events',
    ])
  })

  it('the Votes tab shows upvotes and downvotes with their arrows', async () => {
    await mountPage()
    await tab('Votes').trigger('click')
    expect(lines()).toEqual(['Joel upvoted your post "Synth set"', 'Ravi downvoted your post "Synth set"'])
    expect(wrapper.findAll('.vote-icon.is-up')).toHaveLength(1)
    expect(wrapper.findAll('.vote-icon.is-down')).toHaveLength(1)
  })

  it('the Unread, Mentions, Replies and Events tabs filter the list', async () => {
    await mountPage()
    await tab('Unread').trigger('click')
    expect(lines()).toHaveLength(3)
    await tab('Mentions').trigger('click')
    expect(lines()).toEqual(['Mei mentioned you in a post: "Gig buddies?"'])
    await tab('Replies').trigger('click')
    expect(lines()).toEqual(['Rosa replied to your post "Synth set"'])
    await tab('Events').trigger('click')
    expect(lines()).toEqual(['New gig near you: Moon Carrot at TinBox'])
  })

  it('opening a notification marks it read and goes to its forum post', async () => {
    await mountPage()
    await wrapper.findAll('.notification-row')[0].trigger('click')
    await flushPromises()
    expect(api.markNotificationRead).toHaveBeenCalledWith('r1')
    expect(router.currentRoute.value.path).toBe('/forum/post/p1')
  })

  it('"Mark all as read" clears the unread count', async () => {
    await mountPage()
    await button('Mark all as read').trigger('click')
    await flushPromises()
    expect(api.markAllNotificationsRead).toHaveBeenCalled()
    expect(wrapper.get('.notifications-head p').text()).toBe('You are all caught up')
    expect(toast).toHaveBeenCalledWith('All caught up')
  })

  it('the × removes one notification', async () => {
    await mountPage()
    await wrapper.findAll('button[aria-label="Remove notification"]')[1].trigger('click')
    await flushPromises()
    expect(api.deleteNotification).toHaveBeenCalledWith('m1')
    expect(lines()).not.toContain('Mei mentioned you in a post: "Gig buddies?"')
  })

  it('"Clear read" removes only the read ones', async () => {
    await mountPage()
    await button('Clear read').trigger('click')
    await flushPromises()
    expect(api.deleteReadNotifications).toHaveBeenCalled()
    expect(lines()).toHaveLength(3)
    expect(button('Clear read').attributes('disabled')).toBeDefined()
  })

  it('puts the list back and says so when removing fails', async () => {
    api.deleteNotification.mockRejectedValueOnce(new Error('offline'))
    await mountPage()
    await wrapper.findAll('button[aria-label="Remove notification"]')[0].trigger('click')
    await flushPromises()
    expect(lines()).toHaveLength(5)
    expect(toast).toHaveBeenCalledWith('Could not remove it, try again')
  })

  it('shows a switch for each setting, all on by default', async () => {
    await mountPage()
    const names = wrapper.findAll('.setting-switch').map((s) => s.attributes('aria-label'))
    expect(names).toEqual(['New gigs near me', 'Forum replies', 'Mentions', 'Post votes'])
    expect(wrapper.findAll('.setting-switch').every((s) => s.element.checked)).toBe(true)
  })

  it('switching off post votes saves it', async () => {
    await mountPage()
    await toggle('Post votes').trigger('change')
    await flushPromises()
    expect(db.saved).toContainEqual({ post_votes: false })
    expect(toggle('Post votes').element.checked).toBe(false)
  })

  it('shows your saved settings', async () => {
    db.settings = { mentions: false, post_votes: false, last_events_check: hoursAgo(1) }
    await mountPage()
    expect(toggle('Mentions').element.checked).toBe(false)
    expect(toggle('Post votes').element.checked).toBe(false)
    expect(toggle('Forum replies').element.checked).toBe(true)
  })

  it('shows an empty state when there is nothing', async () => {
    db.rows = []
    await mountPage()
    expect(wrapper.text()).toContain('Nothing here yet.')
  })

  it('shows an error with a retry button when the list cannot load', async () => {
    api.getNotifications.mockRejectedValueOnce(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await mountPage()
    expect(wrapper.text()).toContain('Could not load your notifications.')

    await button('Try again').trigger('click')
    await flushPromises()
    expect(lines()).toHaveLength(5)
  })
})
