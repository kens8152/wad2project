import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { EVENT_JSON } from '@/test/fixtures/artistEvents'
import { makeMatchArtist } from '@/test/fixtures/matchArtists'

vi.mock('@/services/supabase.js', () => ({ supabase: {} }))
vi.mock('@/services/supabase', () => ({ supabase: {} }))
vi.mock('@/services/eventsApi', () => ({ getEventData: vi.fn() }))
vi.mock('@/services/matchmakingApi', () => ({
  getArtistDetails: vi.fn(),
  getSavedArtists: vi.fn(),
  addSavedArtist: vi.fn(),
  removeSavedArtist: vi.fn(),
}))

const api = await import('@/services/matchmakingApi')
const { getEventData } = await import('@/services/eventsApi')
const { useUserStore } = await import('@/stores/user')
const { default: SavedArtistsView } = await import('../SavedArtistsView.vue')

const ARTISTS = [
  makeMatchArtist('krunkle', 'Krunkle', 'Indie Rock'),
  makeMatchArtist('lullaboy', 'Lullaboy', 'Pop Music'),
  makeMatchArtist('quiet-one', 'Quiet One', 'Ambient'),
]

const Blank = { template: '<div />' }
let wrapper
let router

async function mountPage({ loggedIn = true } = {}) {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/saved', name: 'saved-artists', component: SavedArtistsView },
      { path: '/profile', name: 'profile', component: Blank },
      { path: '/artists/:id', name: 'artist-detail', component: Blank },
      { path: '/login', component: Blank },
    ],
  })
  router.push('/saved')
  await router.isReady()
  setActivePinia(createPinia())
  if (loggedIn) {
    const store = useUserStore()
    store.isLoggedIn = true
    store.user.id = 'user-1'
  }
  wrapper = mount(SavedArtistsView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const names = () => wrapper.findAll('.artist-card h3').map((h) => h.text())

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(getEventData).mockResolvedValue(structuredClone(EVENT_JSON))
  api.getSavedArtists.mockResolvedValue([
    { artist_id: 'lullaboy', saved_at: '2026-11-04T10:00:00Z' },
    { artist_id: 'krunkle', saved_at: '2026-11-02T10:00:00Z' },
    { artist_id: 'quiet-one', saved_at: '2026-11-03T10:00:00Z' },
  ])
  api.getArtistDetails.mockImplementation(async (ids) => ids.map((id) => ARTISTS.find((a) => a.id === id)))
  api.removeSavedArtist.mockResolvedValue()
})

afterEach(() => wrapper?.unmount())

describe('Saved artists page: search + sort + artist cards', () => {
  it('asks a guest to log in', async () => {
    await mountPage({ loggedIn: false })
    expect(wrapper.text()).toContain('Please log in to see your saved artists.')
  })

  it('shows every saved artist, most recently saved first, with a count', async () => {
    await mountPage()
    expect(names()).toEqual(['Lullaboy', 'Quiet One', 'Krunkle'])
    expect(wrapper.text()).toContain('3 artists saved')
  })

  it('fills in upcoming events from the events data, and still shows artists with no events', async () => {
    await mountPage()
    const krunkle = wrapper.findAll('.artist-card').find((c) => c.text().includes('Krunkle'))
    const quiet = wrapper.findAll('.artist-card').find((c) => c.text().includes('Quiet One'))
    expect(krunkle.text()).toContain('1 upcoming event')
    expect(krunkle.text()).toContain('Next:')
    expect(quiet.text()).toContain('0 upcoming events')
  })

  it('searches by genre as well as name', async () => {
    await mountPage()
    await wrapper.get('input[type="search"]').setValue('pop')
    expect(names()).toEqual(['Lullaboy'])
  })

  it('says when no saved artist matches the search', async () => {
    await mountPage()
    await wrapper.get('input[type="search"]').setValue('zzz')
    expect(wrapper.text()).toContain('No saved artists match "zzz".')
  })

  it('sorts by name when chosen', async () => {
    await mountPage()
    await wrapper.get('button[aria-haspopup="listbox"]').trigger('click')
    await wrapper.findAll('[role="option"] button').find((b) => b.text().includes('Name')).trigger('click')
    expect(names()).toEqual(['Krunkle', 'Lullaboy', 'Quiet One'])
  })

  it('the bookmark unsaves the artist and removes the card', async () => {
    await mountPage()
    await wrapper.findAll('button[aria-label="Remove from saved"]')[0].trigger('click')
    await flushPromises()
    expect(api.removeSavedArtist).toHaveBeenCalledWith('lullaboy')
    expect(names()).toEqual(['Quiet One', 'Krunkle'])
  })

  it('clicking a card opens the artist', async () => {
    await mountPage()
    await wrapper.findAll('.artist-card')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/artists/lullaboy')
  })

  it('shows an empty state when nothing is saved', async () => {
    api.getSavedArtists.mockResolvedValue([])
    await mountPage()
    expect(wrapper.text()).toContain('No saved artists yet')
  })

  it('shows an error when the saved list cannot load', async () => {
    api.getSavedArtists.mockRejectedValue(new Error('offline'))
    await mountPage()
    expect(wrapper.text()).toContain('Your saved artists could not be loaded. Please try again.')
  })
})
