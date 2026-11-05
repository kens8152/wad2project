import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { makeMatchArtist } from '@/test/fixtures/matchArtists'

const backend = vi.hoisted(() => ({
  profile: null,
  profileError: null,
  createdAt: '2026-10-12T08:00:00Z',
}))

vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { created_at: backend.createdAt } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: backend.profile, error: backend.profileError }),
        }),
      }),
    }),
  },
}))
vi.mock('@/composables/useToast', () => ({ toast: vi.fn() }))
// recent activity comes from the notifications table
vi.mock('@/services/notificationsApi', () => {
  const at = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600000).toISOString()
  const rows = [
    { id: 'n1', type: 'reply', actor_name: 'Rosa Park', body: 'replied to your post "Synth set"', link: '/forum/post/p1', read_at: null, created_at: at(2) },
    { id: 'n2', type: 'mention', actor_name: 'Mei Xuan', body: 'mentioned you in a post: "New track"', link: '/forum/post/p2', read_at: null, created_at: at(5) },
    { id: 'n3', type: 'event', actor_name: null, body: 'New gig near you: Moon Carrot', link: '/events/mc', read_at: at(1), created_at: at(26) },
    { id: 'n4', type: 'event', actor_name: null, body: 'New gig near you: Krunkle', link: '/events/kr', read_at: at(1), created_at: at(50) },
    { id: 'n5', type: 'reply', actor_name: 'Joel', body: 'replied to your comment on "Synth set"', link: '/forum/post/p1', read_at: at(1), created_at: at(120) },
  ]
  return {
    getNotifications: async () => rows,
    getNotificationSettings: async () => null,
    saveNotificationSettings: async () => {},
    getEventsAddedSince: async () => [],
    addEventNotifications: async () => {},
    markNotificationRead: async () => {},
    markAllNotificationsRead: async () => {},
    deleteNotification: async () => {},
    deleteReadNotifications: async () => {},
    subscribeToNotifications: () => () => {},
  }
})
vi.mock('@/services/matchmakingApi', () => ({
  getFollowedArtists: vi.fn(),
  addFollowedArtist: vi.fn(),
  removeFollowedArtist: vi.fn(),
  getArtistDetails: vi.fn(),
  getLikedArtistIds: vi.fn(),
  removeLikedArtist: vi.fn(),
  resetMatchmaking: vi.fn(),
}))

const api = await import('@/services/matchmakingApi')
const { toast } = await import('@/composables/useToast')
const { useUserStore } = await import('@/stores/user')
const { default: ProfileView } = await import('../ProfileView.vue')

const ARTISTS = {
  krunkle: makeMatchArtist('krunkle', 'Krunkle', 'Indie Rock'),
  aiyna: makeMatchArtist('aiyna', 'ai.yna', 'Pop Music'),
  'loka-nada': makeMatchArtist('loka-nada', 'Loka Nada', 'Traditional'),
}

const PROFILE = {
  display_name: 'Kit Tan',
  genres: ['Indie Rock', 'Pop Music', 'Electronic', 'Hip-hop', 'Not A Real Genre'],
  favourite_songs: 'Glimmer — Krunkle\nMidnight Letters — Sherman Zhuo\n\n',
}

const Blank = { template: '<div />' }
const pinia = createPinia()
let wrapper
let router
let following
let liked

async function mountPage({ loggedIn = true, query = {} } = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'profile', component: ProfileView },
      { path: '/events/:id', name: 'event-detail', component: Blank },
      { path: '/profile/saved-artists', name: 'saved-artists', component: Blank },
      { path: '/profile/match-history', name: 'match-history', component: Blank },
      { path: '/:any(.*)*', component: Blank },
    ],
  })
  router.push({ path: '/profile', query })
  await router.isReady()

  setActivePinia(pinia)
  const store = useUserStore()
  store.isLoggedIn = loggedIn
  store.user.id = loggedIn ? 'user-1' : ''
  store.user.name = loggedIn ? 'Kit Tan' : 'Guest'
  store.user.initials = loggedIn ? 'KT' : ''

  wrapper = mount(ProfileView, {
    global: { plugins: [router, pinia], stubs: { teleport: true } },
    attachTo: document.body,
  })
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 200))
  await flushPromises()
}

const tab = (label) => wrapper.findAll('[role="tab"]').find((t) => t.text().startsWith(label))
const stat = (label) => wrapper.findAll('.spec').find((c) => c.get('dt').text() === label).get('dd').text()
const openTab = async (label) => {
  await tab(label).trigger('click')
  await flushPromises()
}

beforeAll(() => {
  localStorage.setItem('riffle.savedEvents:user-1', JSON.stringify(['fallingislands-battlebox', 'evanturetime-clarke-quay']))
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  backend.profile = structuredClone(PROFILE)
  backend.profileError = null
  following = ['krunkle', 'aiyna']
  liked = ['loka-nada']
  api.getFollowedArtists.mockImplementation(async () => following.map((id) => ({ artist_id: id })))
  api.getLikedArtistIds.mockImplementation(async () => [...liked])
  api.getArtistDetails.mockImplementation(async (ids) => ids.map((id) => ARTISTS[id]).filter(Boolean))
  api.removeFollowedArtist.mockImplementation(async (id) => (following = following.filter((f) => f !== id)))
  api.addFollowedArtist.mockResolvedValue()
  api.removeLikedArtist.mockImplementation(async (id) => (liked = liked.filter((l) => l !== id)))
  api.resetMatchmaking.mockImplementation(async () => (liked = []))
})

afterEach(() => wrapper?.unmount())

describe('Profile: who you are', () => {
  it('asks a guest to log in', async () => {
    await mountPage({ loggedIn: false })
    expect(wrapper.text()).toContain('Please log in to manage your preferences.')
  })

  it('invites a new user without a profile to start onboarding', async () => {
    backend.profile = null
    await mountPage()
    expect(wrapper.get('h2').text()).toBe('Build your taste profile')
    expect(wrapper.findAll('a').some((a) => a.attributes('href') === '/onboarding')).toBe(true)
  })

  it('shows the name, initials, handle, area and join date', async () => {
    await mountPage()
    expect(wrapper.get('h1').text()).toBe('Kit Tan')
    expect(wrapper.get('.masthead__avatar').text()).toBe('KT')
    const meta = wrapper.get('.masthead__meta').text()
    expect(meta).toContain('@kittan')
    expect(meta).toContain('Bras Basah')
    expect(meta).toContain('Joined October 2026')
  })

  it('shows the first three genre tags and can show the rest', async () => {
    await mountPage()
    const tags = () => wrapper.findAll('.masthead__tags span.chip').map((t) => t.text())
    expect(tags()).toEqual(['#indie-rock', '#pop-music', '#electronic'])

    await wrapper.get('.chip--button').trigger('click')

    expect(tags()).toEqual(['#indie-rock', '#pop-music', '#electronic', '#hip-hop'])
    expect(wrapper.get('.chip--button').text()).toBe('Show less')
  })

  it('ignores genres that are not on the list', async () => {
    await mountPage()
    expect(wrapper.text()).not.toContain('not-a-real-genre')
  })

  it('counts followed artists, saved events, songs and genres', async () => {
    await mountPage()
    expect(stat('Following')).toBe('2')
    expect(stat('Saved events')).toBe('2')
    expect(stat('Favourite songs')).toBe('2')
    expect(stat('Genres')).toBe('4')
  })

  it('"Edit profile" goes to onboarding', async () => {
    await mountPage()
    await wrapper.findAll('button').find((b) => b.text().includes('Edit profile')).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/onboarding')
  })

  it('shows an error when the profile cannot be loaded', async () => {
    backend.profileError = new Error('timeout')
    await mountPage()
    expect(wrapper.get('[role="alert"]').text()).toBe('Your preferences could not be loaded: timeout')
  })

  it('shows the latest notifications as recent activity', async () => {
    await mountPage()
    expect(wrapper.findAll('.activity-row')).toHaveLength(4)
    expect(wrapper.text()).toContain('Rosa Park')
  })
})

describe('Profile: tabs', () => {
  it('opens on the Artists tab with a count on every tab', async () => {
    await mountPage()
    expect(tab('Artists').attributes('aria-selected')).toBe('true')
    const counts = wrapper.findAll('[role="tab"] .tab-count').map((c) => c.text())
    expect(counts).toEqual(['2', '1', '2', '2', '4'])
  })

  it('lists followed artists with links to their pages', async () => {
    await mountPage()
    const links = wrapper.findAll('.artist-tile a').map((a) => a.attributes('href'))
    expect(links).toEqual(['/artists/krunkle', '/artists/aiyna'])
  })

  it('unfollowing an artist removes them from the list', async () => {
    await mountPage()
    await wrapper.get('button[aria-label="Unfollow Krunkle"]').trigger('click')
    await flushPromises()
    expect(api.removeFollowedArtist).toHaveBeenCalledWith('krunkle')
    expect(wrapper.findAll('.artist-tile strong').map((s) => s.text())).toEqual(['ai.yna'])
  })

  it('opens on the Liked tab when matchmaking links here', async () => {
    await mountPage({ query: { tab: 'liked' } })
    expect(tab('Liked').attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('Artists you liked in matchmaking')
    expect(wrapper.text()).toContain('Loka Nada')
  })

  it('removing a liked artist updates the list and confirms', async () => {
    await mountPage({ query: { tab: 'liked' } })
    await wrapper.get('button[aria-label="Remove Loka Nada from liked artists"]').trigger('click')
    await flushPromises()
    expect(api.removeLikedArtist).toHaveBeenCalledWith('loka-nada')
    expect(toast).toHaveBeenCalledWith('Removed Loka Nada from your liked artists')
    expect(wrapper.text()).toContain('Start matchmaking')
  })

  it('lists saved events soonest first', async () => {
    await mountPage()
    await openTab('Events')
    const titles = wrapper.findAll('.event-row .row-text strong').map((s) => s.text())
    expect(titles[0]).toBe('Bass Bunker Sessions')
    expect(titles).toHaveLength(2)
  })

  it('splits favourite songs into title and artist', async () => {
    await mountPage()
    await openTab('Songs')
    const rows = wrapper.findAll('.song-rows li')
    expect(rows).toHaveLength(2)
    expect(rows[0].get('strong').text()).toBe('Glimmer')
    expect(rows[0].get('small').text()).toBe('Krunkle')
  })

  it('offers to add songs when there are none', async () => {
    backend.profile.favourite_songs = ''
    await mountPage()
    await openTab('Songs')
    expect(wrapper.text()).toContain('No favourite songs added yet.')
  })

  it('lists favourite genres on the Taste tab', async () => {
    await mountPage()
    await openTab('Taste')
    expect(wrapper.findAll('.genre-tag').map((g) => g.text())).toEqual(['Indie Rock', 'Pop Music', 'Electronic', 'Hip-hop'])
  })
})

describe('Profile: resetting the taste profile', () => {
  async function openDialog() {
    await mountPage({ query: { tab: 'liked' } })
    await wrapper.get('.reset-button').trigger('click')
    return wrapper.get('[role="alertdialog"]')
  }

  it('asks for confirmation first', async () => {
    const dialog = await openDialog()
    expect(dialog.get('h2').text()).toBe('Reset your taste profile?')
    expect(dialog.get('.reset-confirm').attributes('disabled')).toBeDefined()
  })

  it('"Keep my taste profile" closes the dialog without erasing anything', async () => {
    const dialog = await openDialog()
    await dialog.get('.reset-cancel').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(api.resetMatchmaking).not.toHaveBeenCalled()
  })

  it('erases liked artists once the user ticks "I understand"', async () => {
    const dialog = await openDialog()
    await dialog.get('input[type="checkbox"]').setValue(true)
    expect(dialog.get('.reset-confirm').attributes('disabled')).toBeUndefined()

    await dialog.get('.reset-confirm').trigger('click')
    await flushPromises()

    expect(api.resetMatchmaking).toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('Your taste profile was reset. Matchmaking starts fresh.')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(tab('Liked').get('.tab-count').text()).toBe('0')
  })

  it('keeps the liked artists and explains when the reset fails', async () => {
    api.resetMatchmaking.mockRejectedValue(new Error('offline'))
    const dialog = await openDialog()
    await dialog.get('input[type="checkbox"]').setValue(true)
    await dialog.get('.reset-confirm').trigger('click')
    await flushPromises()

    expect(toast).toHaveBeenCalledWith('Could not reset your taste profile. Please try again.')
    expect(tab('Liked').get('.tab-count').text()).toBe('1')
  })
})
