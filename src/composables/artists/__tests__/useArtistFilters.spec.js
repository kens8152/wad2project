import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEventsStore } from '@/stores/events'
import { useArtistFilters } from '../useArtistFilters'
import { STORE_EVENTS } from '@/test/fixtures/artistEvents'

let filters

beforeEach(() => {
  setActivePinia(createPinia())
  useEventsStore().events = STORE_EVENTS
  filters = useArtistFilters()
})

const names = () => filters.filteredArtists.value.map((a) => a.name)

describe('useArtistFilters: the list', () => {
  it('lists every artist once, A-Z by default', () => {
    expect(names()).toEqual(['FallingIslands', 'Krunkle', 'Lullaboy'])
  })

  it('says how many artists are performing', () => {
    expect(filters.subtitle.value).toBe('3 artists performing near you')
  })

  it('starts with no active filters', () => {
    expect(filters.activeCount.value).toBe(0)
    expect(filters.isDirty.value).toBe(false)
  })

  it('offers each genre and venue with a count', () => {
    expect(filters.genreOptions.value.map((g) => g.name)).toEqual(['Electronic', 'Indie Rock', 'Pop Music'])
    expect(filters.venueOptions.value.find((v) => v.name === 'TinBox').count).toBe(2)
  })
})

describe('useArtistFilters: search', () => {
  it('finds artists by part of their name, ignoring case', () => {
    filters.searchText.value = 'KRUN'
    expect(names()).toEqual(['Krunkle'])
  })

  it('uses the singular in the subtitle and quotes the search', () => {
    filters.searchText.value = 'krunkle'
    expect(filters.subtitle.value).toBe('1 artist matching “krunkle”')
  })

  it('counts the search as an active filter', () => {
    filters.searchText.value = 'luna'
    expect(filters.activeCount.value).toBe(1)
  })

  it('ignores spaces around the search text', () => {
    filters.searchText.value = '   '
    expect(names()).toHaveLength(3)
    expect(filters.activeCount.value).toBe(0)
  })

  it('clearSearch shows every artist again', () => {
    filters.searchText.value = 'krunkle'
    filters.clearSearch()
    expect(names()).toHaveLength(3)
  })
})

describe('useArtistFilters: genre and venue checkboxes', () => {
  it('does not change the list until Apply is pressed', () => {
    filters.draftGenres.value.push('Electronic')
    expect(filters.isDirty.value).toBe(true)
    expect(names()).toHaveLength(3)
  })

  it('shows only the ticked genre after Apply', () => {
    filters.draftGenres.value.push('Electronic')
    filters.applyFilters()
    expect(names()).toEqual(['FallingIslands'])
    expect(filters.isDirty.value).toBe(false)
    expect(filters.activeCount.value).toBe(1)
  })

  it('shows artists playing at any ticked venue', () => {
    filters.draftVenues.value.push('BattleBox', 'Kilo Lounge')
    filters.applyFilters()
    expect(names()).toEqual(['FallingIslands', 'Krunkle'])
  })

  it('combines genre, venue and search', () => {
    filters.draftVenues.value.push('TinBox')
    filters.draftGenres.value.push('Pop Music')
    filters.applyFilters()
    filters.searchText.value = 'lulla'
    expect(names()).toEqual(['Lullaboy'])
    expect(filters.activeCount.value).toBe(3)
  })

  it('shows nothing when no artist matches', () => {
    filters.draftGenres.value.push('Indie Rock')
    filters.draftVenues.value.push('TinBox')
    filters.applyFilters()
    expect(names()).toHaveLength(0)
    expect(filters.subtitle.value).toBe('0 artists performing near you')
  })

  it('Reset clears the search and every checkbox', () => {
    filters.searchText.value = 'x'
    filters.draftGenres.value.push('Electronic')
    filters.applyFilters()

    filters.resetFilters()

    expect(names()).toHaveLength(3)
    expect(filters.draftGenres.value).toEqual([])
    expect(filters.activeCount.value).toBe(0)
  })
})

describe('useArtistFilters: sorting', () => {
  it('sorts by most events', () => {
    filters.sortBy.value = 'events'
    expect(names()[0]).toBe('FallingIslands')
  })

  it('sorts by the soonest upcoming event', () => {
    filters.sortBy.value = 'soonest'
    expect(names()).toEqual(['FallingIslands', 'Krunkle', 'Lullaboy'])
  })
})
