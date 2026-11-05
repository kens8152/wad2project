import { describe, it, expect } from 'vitest'
import {
  toggleInList,
  getNextEvent,
  buildArtists,
  buildGenreOptions,
  buildVenueOptions,
  hasAny,
  sortArtists,
} from '../artists'

const POP = { id: 'pop', name: 'Pop', color: '#f0f' }
const ROCK = { id: 'rock', name: 'Rock', color: '#f00' }

function makeEvent(id, { genre = POP, venue = 'TinBox', dayOffset = 1, artists = [] } = {}) {
  return { id, genre, venue: { name: venue }, dayOffset, artists }
}

const EVENTS = [
  makeEvent('e1', {
    genre: POP,
    venue: 'TinBox',
    dayOffset: 5,
    artists: [{ id: 'lullaboy', name: 'Lullaboy', genreId: 'pop', tag: 'r&b' }],
  }),
  makeEvent('e2', {
    genre: ROCK,
    venue: 'BattleBox',
    dayOffset: 2,
    artists: [
      { id: 'lullaboy', name: 'LULLABOY', genreId: 'pop', tag: 'r&b' },
      { id: 'krunkle', name: 'Krunkle', genreId: 'rock', tag: 'funk' },
    ],
  }),
  makeEvent('e3', {
    genre: ROCK,
    venue: 'TinBox',
    dayOffset: -3,
    artists: [{ id: 'krunkle', name: 'Krunkle', genreId: 'rock', tag: 'funk' }],
  }),
]

describe('toggleInList', () => {
  it('adds a value that is missing', () => {
    const list = ['pop']
    toggleInList(list, 'rock')
    expect(list).toEqual(['pop', 'rock'])
  })

  it('removes a value that is already there', () => {
    const list = ['pop', 'rock']
    toggleInList(list, 'pop')
    expect(list).toEqual(['rock'])
  })
})

describe('getNextEvent', () => {
  it('picks the soonest event that has not happened yet', () => {
    expect(getNextEvent(EVENTS).id).toBe('e2')
  })

  it('counts an event happening today', () => {
    expect(getNextEvent([makeEvent('today', { dayOffset: 0 })]).id).toBe('today')
  })

  it('returns null when every event is in the past', () => {
    expect(getNextEvent([makeEvent('old', { dayOffset: -1 })])).toBeNull()
  })

  it('returns null for an empty list', () => {
    expect(getNextEvent([])).toBeNull()
  })
})

describe('buildArtists', () => {
  const artists = buildArtists(EVENTS)
  const lullaboy = artists.find((a) => a.id === 'lullaboy')
  const krunkle = artists.find((a) => a.id === 'krunkle')

  it('lists each artist once, matching names case-insensitively', () => {
    expect(artists).toHaveLength(2)
  })

  it('collects every event an artist plays', () => {
    expect(lullaboy.events.map((e) => e.id)).toEqual(['e1', 'e2'])
  })

  it("uses the artist's own genre, not the genre of each event", () => {
    expect(lullaboy.genres).toEqual(['Pop'])
    expect(lullaboy.genres).not.toContain('Rock')
  })

  it('lists each venue once', () => {
    expect(krunkle.venues).toEqual(['BattleBox', 'TinBox'])
  })

  it('works out the next upcoming event, skipping past ones', () => {
    expect(krunkle.nextEvent.id).toBe('e2')
  })

  it('builds the picture path from the artist id', () => {
    expect(lullaboy.image).toBe('/images/Artists/lullaboy.svg')
  })

  it('returns an empty list when there are no events', () => {
    expect(buildArtists([])).toEqual([])
  })
})

describe('buildGenreOptions', () => {
  const options = buildGenreOptions(EVENTS, buildArtists(EVENTS))

  it('sorts genres by name', () => {
    expect(options.map((o) => o.name)).toEqual(['Pop', 'Rock'])
  })

  it('counts how many artists have each genre', () => {
    expect(options).toEqual([
      { name: 'Pop', color: '#f0f', count: 1 },
      { name: 'Rock', color: '#f00', count: 1 },
    ])
  })
})

describe('buildVenueOptions', () => {
  it('counts how many artists play at each venue', () => {
    const options = buildVenueOptions(buildArtists(EVENTS))
    expect(options).toEqual([
      { name: 'BattleBox', color: '', count: 2 },
      { name: 'TinBox', color: '', count: 2 },
    ])
  })
})

describe('hasAny', () => {
  it('is true when at least one item is chosen', () => {
    expect(hasAny(['Pop', 'Rock'], ['Rock'])).toBeTruthy()
  })

  it('is false when nothing overlaps', () => {
    expect(hasAny(['Pop'], ['Jazz'])).toBeFalsy()
  })

  it('is false when nothing is chosen', () => {
    expect(hasAny(['Pop'], [])).toBe(false)
  })
})

describe('sortArtists', () => {
  const make = (name, eventCount, nextDay) => ({
    name,
    events: Array(eventCount).fill({}),
    nextEvent: nextDay === null ? null : { dayOffset: nextDay },
  })
  const list = () => [make('Cara', 1, 4), make('amy', 3, null), make('Ben', 2, 1)]

  it("sorts by name A-Z, ignoring case", () => {
    expect(sortArtists(list(), 'name').map((a) => a.name)).toEqual(['amy', 'Ben', 'Cara'])
  })

  it('sorts by most events first', () => {
    expect(sortArtists(list(), 'events').map((a) => a.name)).toEqual(['amy', 'Ben', 'Cara'])
  })

  it('sorts by soonest next event, with no upcoming event last', () => {
    expect(sortArtists(list(), 'soonest').map((a) => a.name)).toEqual(['Ben', 'Cara', 'amy'])
  })

  it('leaves the order alone for an unknown sort', () => {
    expect(sortArtists(list(), 'unknown').map((a) => a.name)).toEqual(['Cara', 'amy', 'Ben'])
  })
})
