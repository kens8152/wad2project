import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEventsStore } from '@/stores/events'
import { useArtistProfile } from '../useArtistProfile'
import { STORE_EVENTS } from '@/test/fixtures/artistEvents'

beforeEach(() => {
  setActivePinia(createPinia())
  useEventsStore().events = STORE_EVENTS
})

describe('useArtistProfile', () => {
  it('finds the artist from the url id', () => {
    const { artist } = useArtistProfile(ref('krunkle'))
    expect(artist.value.name).toBe('Krunkle')
  })

  it('returns null for an artist that does not exist', () => {
    const { artist, upcomingEvents, pastEvents } = useArtistProfile(ref('nobody'))
    expect(artist.value).toBeNull()
    expect(upcomingEvents.value).toEqual([])
    expect(pastEvents.value).toEqual([])
  })

  it('lists upcoming events soonest first', () => {
    const { upcomingEvents } = useArtistProfile(ref('fallingislands'))
    expect(upcomingEvents.value.map((e) => e.dayOffset)).toEqual([0, 4])
  })

  it('lists past events most recent first, including the sample past events', () => {
    const { pastEvents } = useArtistProfile(ref('lullaboy'))
    const offsets = pastEvents.value.map((e) => e.dayOffset)
    expect(offsets).toContain(-10)
    expect(offsets).toEqual([...offsets].sort((a, b) => b - a))
    expect(offsets.every((d) => d < 0)).toBe(true)
  })

  it('puts upcoming events before past ones in the portfolio', () => {
    const { portfolio, upcomingEvents, pastEvents } = useArtistProfile(ref('lullaboy'))
    expect(portfolio.value).toEqual([...upcomingEvents.value, ...pastEvents.value])
  })

  it('loads the bio for a known artist', () => {
    const { profile } = useArtistProfile(ref('fallingislands'))
    expect(profile.value.bio).toContain('Falling Islands')
  })

  it('gives an empty profile when no bio exists', () => {
    const { profile } = useArtistProfile(ref('nobody'))
    expect(profile.value).toEqual({ bio: '', socials: {} })
  })

  it('updates when the url changes to another artist', () => {
    const id = ref('krunkle')
    const { artist } = useArtistProfile(id)
    id.value = 'lullaboy'
    expect(artist.value.name).toBe('Lullaboy')
  })
})
