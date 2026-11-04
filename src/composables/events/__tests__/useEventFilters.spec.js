import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { useEventFilters, MAX_DISTANCE_KM, DEFAULT_DISTANCE_KM, WEEK_DAYS } from '../useEventFilters'

let filters

beforeAll(async () => {
  filters = useEventFilters()
  await filters.init()
})

beforeEach(() => {
  filters.reset()
  filters.sort.value = 'soonest'
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useEventFilters: default results', () => {
  it('loads events from the catalog', () => {
    expect(filters.events.value.length).toBeGreaterThan(0)
    expect(filters.results.value.length).toBeGreaterThan(0)
  })

  it('only shows upcoming events within the next week', () => {
    for (const e of filters.results.value) {
      expect(e.dayOffset).toBeGreaterThanOrEqual(0)
      expect(e.dayOffset).toBeLessThan(WEEK_DAYS)
    }
  })

  it(`only shows events within ${DEFAULT_DISTANCE_KM} km by default`, () => {
    for (const e of filters.results.value) {
      expect(e.distanceKm).toBeLessThanOrEqual(DEFAULT_DISTANCE_KM)
    }
  })

  it('starts with no active filters', () => {
    expect(filters.activeCount.value).toBe(0)
    expect(filters.isDirty.value).toBe(false)
  })
})

describe('useEventFilters: draft vs applied', () => {
  it('does not change the results until Apply is pressed', () => {
    const before = filters.results.value.length
    const genreId = filters.results.value[0].genreId

    filters.toggleGenre(genreId)

    expect(filters.isDirty.value).toBe(true)
    expect(filters.results.value).toHaveLength(before)
  })

  it('filters by genre after Apply', () => {
    const genreId = filters.results.value[0].genreId

    filters.toggleGenre(genreId)
    filters.apply()

    expect(filters.isDirty.value).toBe(false)
    expect(filters.results.value.length).toBeGreaterThan(0)
    expect(filters.results.value.every((e) => e.genreId === genreId)).toBe(true)
    expect(filters.activeCount.value).toBe(1)
  })

  it('ticking a genre twice turns it off again', () => {
    const genreId = filters.results.value[0].genreId
    filters.toggleGenre(genreId)
    filters.toggleGenre(genreId)
    expect(filters.draft.genres).toEqual([])
    expect(filters.isDirty.value).toBe(false)
  })

  it('Reset clears every filter', () => {
    filters.toggleGenre(filters.results.value[0].genreId)
    filters.draft.distance = 5
    filters.apply()

    filters.reset()

    expect(filters.applied.genres).toEqual([])
    expect(filters.applied.distance).toBe(DEFAULT_DISTANCE_KM)
    expect(filters.activeCount.value).toBe(0)
  })
})

describe('useEventFilters: search', () => {
  it('applies the search text after a short pause, without pressing Apply', () => {
    vi.useFakeTimers()
    const headliner = filters.results.value[0].headliner.name

    filters.setQuery(headliner)
    expect(filters.applied.q).toBe('')

    vi.advanceTimersByTime(200)

    expect(filters.applied.q).toBe(headliner)
    expect(filters.results.value.length).toBeGreaterThan(0)
    expect(filters.results.value.every((e) => e.searchText.includes(headliner.toLowerCase()))).toBe(true)
  })

  it('shows nothing for a search that matches no event', () => {
    vi.useFakeTimers()
    filters.setQuery('zzzz-no-such-event')
    vi.advanceTimersByTime(200)
    expect(filters.results.value).toHaveLength(0)
  })
})

describe('useEventFilters: distance', () => {
  it(`treats ${MAX_DISTANCE_KM} km as "no limit"`, () => {
    const nearby = filters.results.value.length
    filters.draft.distance = MAX_DISTANCE_KM
    filters.apply()
    expect(filters.results.value.length).toBeGreaterThanOrEqual(nearby)
  })

  it('a smaller distance never shows events further away', () => {
    filters.draft.distance = 3
    filters.apply()
    expect(filters.results.value.every((e) => e.distanceKm <= 3)).toBe(true)
  })
})

describe('useEventFilters: sorting', () => {
  const isSortedBy = (list, key) => list.every((e, i) => i === 0 || list[i - 1][key] <= e[key])

  it('sorts by earliest start time by default', () => {
    expect(isSortedBy(filters.results.value, 'startsAt')).toBe(true)
  })

  it('sorts by price, low to high', () => {
    filters.sort.value = 'price'
    expect(isSortedBy(filters.results.value, 'price')).toBe(true)
  })

  it('sorts by nearest venue', () => {
    filters.sort.value = 'nearest'
    expect(isSortedBy(filters.results.value, 'distanceKm')).toBe(true)
  })

  it('sorts by most people going', () => {
    filters.sort.value = 'popular'
    const going = filters.results.value.map((e) => e.going)
    expect(going).toEqual([...going].sort((a, b) => b - a))
  })
})

describe('useEventFilters: deep links', () => {
  it('?artist= shows only that artist\'s events', () => {
    const artistId = filters.results.value[0].headliner.id

    filters.applyQuery({ artist: artistId })

    expect(filters.applied.artists).toEqual([artistId])
    expect(filters.results.value.every((e) => e.artistIds.includes(artistId))).toBe(true)
  })

  it('?venue= shows every upcoming event at that venue, ignoring distance', () => {
    const venueId = filters.events.value.find((e) => e.dayOffset >= 0).venueId

    filters.applyQuery({ venue: venueId })

    expect(filters.applied.distance).toBe(MAX_DISTANCE_KM)
    expect(filters.results.value.length).toBeGreaterThan(0)
    expect(filters.results.value.every((e) => e.venueId === venueId)).toBe(true)
  })

  it('ignores a query with no filters in it', () => {
    filters.applyQuery({ page: '2' })
    expect(filters.activeCount.value).toBe(0)
  })
})
