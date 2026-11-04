import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { KRUNKLE, AIYNA, LOKA } from '@/test/fixtures/matchArtists'

vi.mock('@/services/supabase.js', () => ({ supabase: {} }))
vi.mock('@/services/supabase', () => ({ supabase: {} }))
vi.mock('@/composables/useToast', () => ({ toast: vi.fn() }))
vi.mock('@/services/matchmakingApi', () => ({
  getMatchHistory: vi.fn(),
  getArtistDetails: vi.fn(),
  changeMatchAction: vi.fn(),
  undoMatchAction: vi.fn(),
  getSavedArtists: vi.fn(),
  addSavedArtist: vi.fn(),
  removeSavedArtist: vi.fn(),
}))

const api = await import('@/services/matchmakingApi')
const { toast } = await import('@/composables/useToast')
const { useUserStore } = await import('@/stores/user')
const { default: MatchHistoryView } = await import('../MatchHistoryView.vue')

const Blank = { template: '<div />' }
let wrapper

async function mountPage({ loggedIn = true } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/history', name: 'match-history', component: MatchHistoryView },
      { path: '/matchmaking', name: 'matchmaking', component: Blank },
      { path: '/profile', name: 'profile', component: Blank },
      { path: '/artists/:id', name: 'artist-detail', component: Blank },
      { path: '/login', component: Blank },
    ],
  })
  router.push('/history')
  await router.isReady()
  setActivePinia(createPinia())
  if (loggedIn) {
    const store = useUserStore()
    store.isLoggedIn = true
    store.user.id = 'user-1'
  }
  wrapper = mount(MatchHistoryView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const names = () => wrapper.findAll('.history-card a').map((a) => a.text())
const card = (name) => wrapper.findAll('.history-card').find((c) => c.text().includes(name))
const clickText = async (scope, text) => {
  await scope.findAll('button').find((b) => b.text().includes(text)).trigger('click')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  api.getMatchHistory.mockResolvedValue([
    { artist_id: 'krunkle', action: 'follow', created_at: '2026-11-03T10:00:00Z' },
    { artist_id: 'aiyna', action: 'skip', created_at: '2026-11-04T10:00:00Z' },
    { artist_id: 'loka-nada', action: 'follow', created_at: '2026-11-01T10:00:00Z' },
  ])
  api.getArtistDetails.mockImplementation(async (ids) =>
    ids.map((id) => [KRUNKLE, AIYNA, LOKA].find((a) => a.id === id)).filter(Boolean),
  )
  api.getSavedArtists.mockResolvedValue([])
  api.changeMatchAction.mockResolvedValue()
  api.undoMatchAction.mockResolvedValue()
  api.addSavedArtist.mockResolvedValue()
  api.removeSavedArtist.mockResolvedValue()
})

afterEach(() => wrapper?.unmount())

describe('Match history', () => {
  it('asks a guest to log in', async () => {
    await mountPage({ loggedIn: false })
    expect(wrapper.text()).toContain('Please log in to see your artist matchmaking history.')
    expect(api.getMatchHistory).not.toHaveBeenCalled()
  })

  it('shows every swipe, newest first', async () => {
    await mountPage()
    expect(names()).toEqual(['ai.yna', 'Krunkle', 'Loka Nada'])
  })

  it('labels each swipe as Liked or Skipped', async () => {
    await mountPage()
    expect(card('Krunkle').text()).toContain('Liked')
    expect(card('ai.yna').text()).toContain('Skipped')
  })

  it('the Liked filter shows only liked artists', async () => {
    await mountPage()
    await clickText(wrapper.get('[aria-label="Filter history"]'), 'Liked')
    expect(names()).toEqual(['Krunkle', 'Loka Nada'])
  })

  it('the Skipped filter shows only skipped artists', async () => {
    await mountPage()
    await clickText(wrapper.get('[aria-label="Filter history"]'), 'Skipped')
    expect(names()).toEqual(['ai.yna'])
  })

  it('sorts by name when chosen', async () => {
    await mountPage()
    await wrapper.get('button[aria-haspopup="listbox"]').trigger('click')
    await wrapper.findAll('[role="option"] button').find((b) => b.text().includes('Name')).trigger('click')
    expect(names()).toEqual(['ai.yna', 'Krunkle', 'Loka Nada'].sort((a, b) => a.localeCompare(b)))
  })

  it('sorts oldest first when chosen', async () => {
    await mountPage()
    await wrapper.get('button[aria-haspopup="listbox"]').trigger('click')
    await wrapper.findAll('[role="option"] button').find((b) => b.text().includes('Oldest')).trigger('click')
    expect(names()).toEqual(['Loka Nada', 'Krunkle', 'ai.yna'])
  })

  it('"Like instead" turns a skip into a like', async () => {
    await mountPage()
    await clickText(card('ai.yna'), 'Like instead')

    expect(api.changeMatchAction).toHaveBeenCalledWith('aiyna', 'follow')
    expect(card('ai.yna').text()).toContain('Liked')
    expect(card('ai.yna').text()).toContain('Skip instead')
  })

  it('"Skip instead" turns a like into a skip', async () => {
    await mountPage()
    await clickText(card('Krunkle'), 'Skip instead')
    expect(api.changeMatchAction).toHaveBeenCalledWith('krunkle', 'skip')
    expect(card('Krunkle').text()).toContain('Skipped')
  })

  it('Undo removes the swipe so the artist can be matched again', async () => {
    await mountPage()
    await clickText(card('Krunkle'), 'Undo')

    expect(api.undoMatchAction).toHaveBeenCalledWith('krunkle')
    expect(names()).not.toContain('Krunkle')
    expect(toast).toHaveBeenCalledWith('Krunkle can show up in matchmaking again')
  })

  it('keeps the swipe and explains when Undo fails', async () => {
    api.undoMatchAction.mockRejectedValue(new Error('offline'))
    await mountPage()
    await clickText(card('Krunkle'), 'Undo')
    expect(names()).toContain('Krunkle')
    expect(toast).toHaveBeenCalledWith('Could not undo this swipe. Please try again.')
  })

  it('the bookmark saves an artist', async () => {
    await mountPage()
    await wrapper.get('button[aria-label="Save Krunkle"]').trigger('click')
    await flushPromises()
    expect(api.addSavedArtist).toHaveBeenCalledWith('krunkle')
    expect(wrapper.get('button[aria-label="Unsave Krunkle"]').attributes('aria-pressed')).toBe('true')
  })

  it('shows an empty state that links back to matchmaking', async () => {
    api.getMatchHistory.mockResolvedValue([])
    await mountPage()
    expect(wrapper.text()).toContain('Nothing here yet')
    expect(wrapper.findAll('a').some((a) => a.attributes('href') === '/matchmaking')).toBe(true)
  })

  it('shows an error with a Retry button that loads again', async () => {
    api.getMatchHistory.mockRejectedValueOnce(new Error('offline'))
    await mountPage()
    expect(wrapper.text()).toContain('Your match history could not be loaded')

    await clickText(wrapper, 'Retry')

    expect(names()).toHaveLength(3)
  })
})
