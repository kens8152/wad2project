import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { STORE_EVENTS } from '@/test/fixtures/artistEvents'

const ROWS = {
  fallingislands: {
    id: 'fallingislands',
    name: 'FallingIslands',
    tag: 'synthwave',
    bio: 'Falling Islands crafts shimmering synthwave soundscapes.',
    hometown: 'Queenstown',
    formed: 2017,
    socials: { spotify: 'https://open.spotify.com' },
    image_url: null,
    tracks: [],
    genre: { name: 'Electronic', color: '#0f9d8a' },
  },
  krunkle: { id: 'krunkle', name: 'Krunkle', tag: 'funk', genre: { name: 'Indie Rock', color: '#f0452f' } },
  lullaboy: { id: 'lullaboy', name: 'Lullaboy', tag: null, genre: null },
}

const single = vi.fn()

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (column, id) => ({ maybeSingle: () => single(id) }),
      }),
    }),
  },
}))

const { useEventsStore } = await import('@/stores/events')
const { useArtistProfile } = await import('../useArtistProfile')

beforeEach(() => {
  setActivePinia(createPinia())
  useEventsStore().events = STORE_EVENTS
  single.mockReset()
  single.mockImplementation(async (id) =>
    ROWS[id] ? { data: ROWS[id], error: null } : { data: null, error: null },
  )
})

async function load(id) {
  const result = useArtistProfile(ref(id))
  await flushPromises()
  return result
}

describe('useArtistProfile', () => {
  it('starts loading and finds the artist from the url id', async () => {
    const result = useArtistProfile(ref('krunkle'))
    expect(result.profileLoading.value).toBe(true)
    await flushPromises()
    expect(result.profileLoading.value).toBe(false)
    expect(result.artist.value.name).toBe('Krunkle')
  })

  it('fills in defaults for missing fields', async () => {
    const { artist } = await load('lullaboy')
    expect(artist.value.tag).toBe('')
    expect(artist.value.image).toBe('/images/Artists/lullaboy.svg')
    expect(artist.value.genre).toEqual({ name: 'Unknown', color: '#6c757d' })
    expect(artist.value.tracks).toEqual([])
  })

  it('returns no artist and no error for an artist that does not exist', async () => {
    const { artist, profileError, upcomingEvents, pastEvents } = await load('nobody')
    expect(artist.value).toBeNull()
    expect(profileError.value).toBe('')
    expect(upcomingEvents.value).toEqual([])
    expect(pastEvents.value).toEqual([])
  })

  it('passes on the message when Supabase fails', async () => {
    single.mockResolvedValueOnce({ data: null, error: new Error('offline') })
    const { artist, profileError } = await load('krunkle')
    expect(artist.value).toBeNull()
    expect(profileError.value).toBe('offline')
  })

  it('lists upcoming events soonest first', async () => {
    const { upcomingEvents } = await load('fallingislands')
    expect(upcomingEvents.value.map((e) => e.dayOffset)).toEqual([0, 4])
  })

  it('lists past events most recent first', async () => {
    const { pastEvents } = await load('lullaboy')
    const offsets = pastEvents.value.map((e) => e.dayOffset)
    expect(offsets).toContain(-10)
    expect(offsets).toEqual([...offsets].sort((a, b) => b - a))
    expect(offsets.every((d) => d < 0)).toBe(true)
  })

  it('puts upcoming events before past ones in the portfolio', async () => {
    const { portfolio, upcomingEvents, pastEvents } = await load('lullaboy')
    expect(portfolio.value).toEqual([...upcomingEvents.value, ...pastEvents.value])
  })

  it('loads the bio, socials and year formed', async () => {
    const { profile } = await load('fallingislands')
    expect(profile.value.bio).toContain('Falling Islands')
    expect(profile.value.socials.spotify).toBe('https://open.spotify.com')
    expect(profile.value.formed).toBe(2017)
  })

  it('gives an empty profile when the artist cannot be found', async () => {
    const { profile } = await load('nobody')
    expect(profile.value).toEqual({ bio: '', socials: {}, formed: '' })
  })

  it('updates when the url changes to another artist', async () => {
    const id = ref('krunkle')
    const { artist } = useArtistProfile(id)
    await flushPromises()
    id.value = 'lullaboy'
    await nextTick()
    await flushPromises()
    expect(artist.value.name).toBe('Lullaboy')
  })
})
