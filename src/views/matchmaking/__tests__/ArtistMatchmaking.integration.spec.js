import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { KRUNKLE, AIYNA, LOKA } from '@/test/fixtures/matchArtists'

vi.mock('@/services/supabase.js', () => ({ supabase: {} }))
vi.mock('@/services/supabase', () => ({ supabase: {} }))
vi.mock('@/composables/useToast', () => ({ toast: vi.fn() }))
vi.mock('@/services/matchmakingApi', () => ({
  getArtists: vi.fn(),
  getArtistDetails: vi.fn(),
  addSongs: vi.fn(),
  getTodaysArtistRows: vi.fn(),
  saveTodaysArtists: vi.fn(),
  setArtistAction: vi.fn(),
  removeArtistAction: vi.fn(),
  getSavedArtists: vi.fn(),
  addSavedArtist: vi.fn(),
  removeSavedArtist: vi.fn(),
}))

const api = await import('@/services/matchmakingApi')
const { toast } = await import('@/composables/useToast')
const { useUserStore } = await import('@/stores/user')
const { default: ArtistMatchmaking } = await import('../ArtistMatchmaking.vue')

const Blank = { template: '<div />' }
let wrapper

async function mountPage({ loggedIn = true } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/matchmaking', name: 'matchmaking', component: ArtistMatchmaking },
      { path: '/history', name: 'match-history', component: Blank },
      { path: '/profile', name: 'profile', component: Blank },
      { path: '/artists/:id', name: 'artist-detail', component: Blank },
      { path: '/login', component: Blank },
    ],
  })
  router.push('/matchmaking')
  await router.isReady()

  setActivePinia(createPinia())
  const store = useUserStore()
  if (loggedIn) {
    store.isLoggedIn = true
    store.user.id = 'user-1'
  }

  wrapper = mount(ArtistMatchmaking, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const currentName = () => wrapper.find('.card-title')?.text()
const button = (label) => wrapper.get(`button[aria-label="${label}"]`)

async function press(label) {
  await button(label).trigger('click')
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1000)
  await flushPromises()
}

async function waitForFinishScreen() {
  await vi.advanceTimersByTimeAsync(1000)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  api.getTodaysArtistRows.mockResolvedValue([])
  api.getArtists.mockResolvedValue([structuredClone(KRUNKLE), structuredClone(AIYNA), structuredClone(LOKA)])
  api.saveTodaysArtists.mockResolvedValue()
  api.setArtistAction.mockResolvedValue()
  api.removeArtistAction.mockResolvedValue()
  api.getSavedArtists.mockResolvedValue([])
  api.addSavedArtist.mockResolvedValue()
  api.removeSavedArtist.mockResolvedValue()
  api.addSongs.mockImplementation(async (artists) => artists)
  api.getArtistDetails.mockImplementation(async (ids) =>
    ids.map((id) => [KRUNKLE, AIYNA, LOKA].find((a) => a.id === id)).filter(Boolean).map((a) => structuredClone(a)),
  )
})

afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})

describe('Matchmaking: starting a session', () => {
  it('asks a guest to log in instead', async () => {
    await mountPage({ loggedIn: false })
    expect(wrapper.text()).toContain('Please log in to discover artists.')
    expect(api.getArtists).not.toHaveBeenCalled()
  })

  it('draws a new batch, saves it for today and shows the first artist', async () => {
    await mountPage()
    expect(api.saveTodaysArtists).toHaveBeenCalledWith(['krunkle', 'aiyna', 'loka-nada'])
    expect(currentName()).toBe('Krunkle')
  })

  it("continues today's batch instead of drawing a new one", async () => {
    api.getTodaysArtistRows.mockResolvedValue([
      { artist_id: 'krunkle', action: 'follow' },
      { artist_id: 'aiyna', action: null },
    ])
    await mountPage()
    expect(api.getArtists).not.toHaveBeenCalled()
    expect(currentName()).toBe('ai.yna')
    expect(wrapper.get('.liked-counter').text()).toContain('1 liked')
  })

  it('shows "seen every artist" when nobody is left to draw', async () => {
    api.getArtists.mockResolvedValue([])
    await mountPage()
    expect(wrapper.get('.finish-title').text()).toBe("You've seen every artist we have!")
  })

  it("lists the artist's songs to preview", async () => {
    await mountPage()
    expect(wrapper.text()).toContain('Krunkle song')
  })
})

describe('Matchmaking: swiping', () => {
  it('Like saves a "follow", counts it and shows the next artist', async () => {
    await mountPage()
    await press('Like')

    expect(api.setArtistAction).toHaveBeenCalledWith('krunkle', 'follow')
    expect(wrapper.get('.liked-counter').text()).toContain('1 liked')
    expect(currentName()).toBe('ai.yna')
  })

  it('Skip saves a "skip" and shows the next artist', async () => {
    await mountPage()
    await press('Skip')

    expect(api.setArtistAction).toHaveBeenCalledWith('krunkle', 'skip')
    expect(wrapper.find('.liked-counter').exists()).toBe(false)
    expect(currentName()).toBe('ai.yna')
  })

  it('"Not sure yet" removes the card without liking or skipping', async () => {
    await mountPage()
    await wrapper.get('.unsure-btn').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)

    expect(api.removeArtistAction).toHaveBeenCalledWith('krunkle')
    expect(api.setArtistAction).not.toHaveBeenCalled()
    expect(currentName()).toBe('ai.yna')
  })

  it('keeps the same artist and explains when the swipe cannot be saved', async () => {
    api.setArtistAction.mockRejectedValue(new Error('offline'))
    await mountPage()
    await press('Like')

    expect(currentName()).toBe('Krunkle')
    expect(toast).toHaveBeenCalledWith('Could not complete this action. Please try again.')
  })

  it('Save bookmarks the artist and flips the button to Unsave', async () => {
    await mountPage()
    await button('Save').trigger('click')
    await flushPromises()

    expect(api.addSavedArtist).toHaveBeenCalledWith('krunkle')
    expect(button('Unsave').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Saved Krunkle')
  })

  it('marks artists that were saved earlier', async () => {
    api.getSavedArtists.mockResolvedValue([{ artist_id: 'krunkle' }])
    await mountPage()
    expect(button('Unsave').exists()).toBe(true)
  })
})

describe('Matchmaking: finishing', () => {
  it('after the last card shows the summary with what was liked and skipped', async () => {
    await mountPage()
    await press('Like')
    await press('Skip')
    await press('Like')
    await waitForFinishScreen()

    expect(wrapper.get('.finish-title').text()).toBe('Your taste profile just got sharper')
    const stats = wrapper.findAll('.finish-stat strong').map((s) => s.text())
    expect(stats).toEqual(['2', '1', '2'])
    expect(wrapper.findAll('.finish-artist strong').map((s) => s.text())).toEqual(['Krunkle', 'Loka Nada'])
    expect(toast).toHaveBeenCalledWith('Taste profile updated: 2 liked artists added')
  })

  it('has no button to leave the batch early', async () => {
    await mountPage()
    expect(wrapper.find('button[aria-label="Skip the rest"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Skip the rest')
  })

  it('says so when nobody was liked', async () => {
    await mountPage()
    await press('Skip')
    await press('Skip')
    await press('Skip')
    await waitForFinishScreen()

    expect(wrapper.get('.finish-sub').text()).toContain('You did not like anyone this round')
  })

  it('"Get a new batch" (debug) starts again with fresh artists', async () => {
    await mountPage()
    await press('Skip')
    await press('Skip')
    await press('Skip')
    await waitForFinishScreen()
    api.getArtists.mockResolvedValue([structuredClone(LOKA)])

    await wrapper.findAll('button').find((b) => b.text().includes('Get a new batch')).trigger('click')
    await flushPromises()

    expect(currentName()).toBe('Loka Nada')
    expect(api.saveTodaysArtists).toHaveBeenLastCalledWith(['loka-nada'])
  })
})
