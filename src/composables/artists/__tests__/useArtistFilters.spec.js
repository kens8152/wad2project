import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useArtistsStore } from '@/stores/artists'
import { useArtistFilters } from '../useArtistFilters'
import { cloneArtists } from '@/test/fixtures/artists'

let filters

beforeEach(() => {
  setActivePinia(createPinia())
  useArtistsStore().artists = cloneArtists()
  filters = useArtistFilters()
  filters.resetFilters()
  filters.sortBy.value = 'events'
})

const names = () => filters.filteredArtists.value.map((a) => a.name)

describe('useArtistFilters: the list', () => {
  it('lists every artist once, most events first by default', () => {
    expect(names()).toEqual(['FallingIslands', 'Lullaboy', 'Krunkle'])
  })

  it('says how many artists are performing', () => {
    expect(filters.subtitle.value).toBe('3 artists performing near you')
  })

  it('starts with no active filters', () => {
    expect(filters.activeCount.value).toBe(0)
    expect(filters.isDirty.value).toBe(false)
  })

  it('offers each genre with a count', () => {
    expect(filters.genreOptions.value.map((g) => g.name)).toEqual(['Electronic', 'Indie Rock', 'Pop Music'])
    expect(filters.genreOptions.value.find((g) => g.name === 'Electronic').count).toBe(1)
  })
})

describe('useArtistFilters: search', () => {
  it('finds artists by part of their name, ignoring case', () => {
    filters.searchText.value = 'KRUN'
    expect(names()).toEqual(['Krunkle'])
  })

  it('uses the singular in the subtitle and quotes the search', () => {
    filters.searchText.value = 'krunkle'
    expect(filters.subtitle.value).toBe('1 artist matching "krunkle"')
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

describe('useArtistFilters: genre checkboxes', () => {
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

  it('shows artists from any ticked genre', () => {
    filters.draftGenres.value.push('Electronic', 'Indie Rock')
    filters.applyFilters()
    expect(names()).toEqual(['FallingIslands', 'Krunkle'])
  })

  it('combines genre and search', () => {
    filters.draftGenres.value.push('Pop Music', 'Indie Rock')
    filters.applyFilters()
    filters.searchText.value = 'lulla'
    expect(names()).toEqual(['Lullaboy'])
    expect(filters.activeCount.value).toBe(2)
  })

  it('shows nothing when no artist matches', () => {
    filters.draftGenres.value.push('Indie Rock')
    filters.applyFilters()
    filters.searchText.value = 'lulla'
    expect(names()).toHaveLength(0)
    expect(filters.subtitle.value).toBe('0 artists matching "lulla"')
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
  it('sorts by name', () => {
    filters.sortBy.value = 'name'
    expect(names()).toEqual(['FallingIslands', 'Krunkle', 'Lullaboy'])
  })

  it('sorts by the soonest upcoming event, with no event last', () => {
    filters.sortBy.value = 'soonest'
    expect(names()).toEqual(['FallingIslands', 'Krunkle', 'Lullaboy'])
  })

  it('keeps the chosen sort and search when the page comes back', () => {
    filters.sortBy.value = 'name'
    filters.searchText.value = 'krun'
    const again = useArtistFilters()
    expect(again.sortBy.value).toBe('name')
    expect(again.searchText.value).toBe('krun')
  })
})
