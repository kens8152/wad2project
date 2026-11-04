import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const db = vi.hoisted(() => ({ queries: [], answer: () => ({ data: [], error: null }) }))

vi.mock('@/services/supabase', () => {
  const from = (table) => {
    const query = { table, op: 'select', calls: [] }
    db.queries.push(query)
    const chain = new Proxy(
      {},
      {
        get(_, name) {
          if (name === 'then') {
            return (resolve, reject) => Promise.resolve(db.answer(query)).then(resolve, reject)
          }
          return (...args) => {
            if (['select', 'insert', 'update', 'delete'].includes(name) && query.calls.length === 0) {
              query.op = name
            }
            query.calls.push([name, ...args])
            return chain
          }
        },
      },
    )
    return chain
  }
  return { supabase: { from } }
})

const api = await import('../matchmakingApi')

const ROWS = {
  krunkle: {
    id: 'krunkle',
    name: 'Krunkle',
    tag: 'funk',
    bio: 'Funk trio',
    hometown: 'Tampines',
    formed: '2019',
    socials: { instagram: 'x' },
    image_url: 'https://cdn/krunkle.jpg',
    tracks: [{ id: 11, title: 'Groove' }],
    genre: { name: 'Indie Rock', color: '#f0452f' },
  },
  aiyna: { id: 'aiyna', name: 'ai.yna', tracks: [{ id: 22, title: 'Glow' }, { id: 23, title: 'No preview' }] },
}

beforeEach(() => {
  db.queries = []
  db.answer = () => ({ data: [], error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getArtistDetails', () => {
  it('returns nothing without asking Supabase when given no ids', async () => {
    expect(await api.getArtistDetails([])).toEqual([])
    expect(db.queries).toHaveLength(0)
  })

  it('keeps the order of the ids it was given', async () => {
    db.answer = () => ({ data: [ROWS.krunkle, ROWS.aiyna], error: null })
    const artists = await api.getArtistDetails(['aiyna', 'krunkle'])
    expect(artists.map((a) => a.id)).toEqual(['aiyna', 'krunkle'])
  })

  it('maps a database row to the shape the pages use', async () => {
    db.answer = () => ({ data: [ROWS.krunkle], error: null })
    const [artist] = await api.getArtistDetails(['krunkle'])
    expect(artist).toEqual({
      id: 'krunkle',
      name: 'Krunkle',
      genre: 'Indie Rock',
      genreColor: '#f0452f',
      tag: 'funk',
      image: 'https://cdn/krunkle.jpg',
      bio: 'Funk trio',
      hometown: 'Tampines',
      formed: '2019',
      socials: { instagram: 'x' },
      tracks: [{ id: 11, title: 'Groove' }],
    })
  })

  it('fills in safe defaults for missing fields', async () => {
    db.answer = () => ({ data: [{ id: 'aiyna', name: 'ai.yna' }], error: null })
    const [artist] = await api.getArtistDetails(['aiyna'])
    expect(artist.image).toBe('/images/Artists/aiyna.svg')
    expect(artist.genreColor).toBe('#6c757d')
    expect(artist.tracks).toEqual([])
    expect(artist.socials).toEqual({})
  })

  it('skips ids that are not in the database', async () => {
    db.answer = () => ({ data: [ROWS.krunkle], error: null })
    expect(await api.getArtistDetails(['ghost', 'krunkle'])).toHaveLength(1)
  })

  it('passes a Supabase error on', async () => {
    db.answer = () => ({ data: null, error: new Error('denied') })
    await expect(api.getArtistDetails(['krunkle'])).rejects.toThrow('denied')
  })
})

describe('addSongs', () => {
  it('adds the Apple preview, link and artwork to each track', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        results: [{ trackId: 11, previewUrl: 'p.m4a', trackViewUrl: 'apple.com/11', artworkUrl100: 'art.jpg' }],
      }),
    }))
    const [artist] = await api.addSongs([{ id: 'krunkle', tracks: [{ id: 11, title: 'Groove' }] }])
    expect(artist.tracks).toEqual([{ id: 11, title: 'Groove', preview: 'p.m4a', url: 'apple.com/11', artwork: 'art.jpg' }])
    expect(fetch.mock.calls[0][0]).toContain('id=11')
  })

  it('drops tracks that have no preview to play', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ results: [{ trackId: 22, previewUrl: 'glow.m4a' }] }),
    }))
    const [artist] = await api.addSongs([{ id: 'aiyna', tracks: ROWS.aiyna.tracks }])
    expect(artist.tracks.map((t) => t.title)).toEqual(['Glow'])
  })

  it('does not call Apple when there are no tracks', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const artists = [{ id: 'x', tracks: [] }]
    expect(await api.addSongs(artists)).toBe(artists)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('still returns the artists (with no playable tracks) when Apple is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const [artist] = await api.addSongs([{ id: 'krunkle', tracks: [{ id: 11 }] }])
    expect(artist.id).toBe('krunkle')
    expect(artist.tracks).toEqual([])
  })
})

describe('getArtists (a new random batch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ results: Array.from({ length: 20 }, (_, i) => ({ trackId: i, previewUrl: `p${i}` })) }),
    }))
  })

  function answerWith({ all, seen }) {
    db.answer = (q) => {
      if (q.table === 'artists' && q.calls.some(([n]) => n === 'in')) {
        const ids = q.calls.find(([n]) => n === 'in')[2]
        return { data: ids.map((id) => ({ id, name: id, tracks: [{ id: 1 }] })), error: null }
      }
      if (q.table === 'artists') return { data: all, error: null }
      if (q.op === 'select') return { data: seen.map((id) => ({ artist_id: id })), error: null }
      return { error: null }
    }
  }

  it('never draws an artist the user has already seen', async () => {
    answerWith({
      all: [{ id: 'a', tracks: [{ id: 1 }] }, { id: 'b', tracks: [{ id: 1 }] }],
      seen: ['a'],
    })
    const batch = await api.getArtists()
    expect(batch.map((a) => a.id)).toEqual(['b'])
  })

  it('only draws artists that have songs', async () => {
    answerWith({ all: [{ id: 'a', tracks: [] }, { id: 'b', tracks: null }, { id: 'c', tracks: [{ id: 1 }] }], seen: [] })
    const batch = await api.getArtists()
    expect(batch.map((a) => a.id)).toEqual(['c'])
  })

  it('draws at most 7 artists, with no repeats', async () => {
    answerWith({ all: Array.from({ length: 12 }, (_, i) => ({ id: `a${i}`, tracks: [{ id: 1 }] })), seen: [] })
    const ids = (await api.getArtists()).map((a) => a.id)
    expect(ids).toHaveLength(7)
    expect(new Set(ids).size).toBe(7)
  })

  it('clears unswiped cards from earlier days first', async () => {
    answerWith({ all: [], seen: [] })
    await api.getArtists()
    const cleanup = db.queries.find((q) => q.op === 'delete')
    expect(cleanup.table).toBe('matchmaking_actions')
    expect(cleanup.calls).toContainEqual(['is', 'action', null])
  })

  it('returns an empty batch when every artist has been seen', async () => {
    answerWith({ all: [{ id: 'a', tracks: [{ id: 1 }] }], seen: ['a'] })
    expect(await api.getArtists()).toEqual([])
  })
})

describe('liked artists and history', () => {
  it('getLikedArtistIds lists each liked artist once, newest first', async () => {
    db.answer = () => ({
      data: [{ artist_id: 'b' }, { artist_id: 'a' }, { artist_id: 'b' }],
      error: null,
    })
    expect(await api.getLikedArtistIds()).toEqual(['b', 'a'])
    expect(db.queries[0].calls).toContainEqual(['eq', 'action', 'follow'])
  })

  it('getMatchHistory keeps only the newest swipe for each artist', async () => {
    db.answer = () => ({
      data: [
        { artist_id: 'a', action: 'follow', created_at: '3' },
        { artist_id: 'b', action: 'skip', created_at: '2' },
        { artist_id: 'a', action: 'skip', created_at: '1' },
      ],
      error: null,
    })
    const history = await api.getMatchHistory()
    expect(history).toEqual([
      { artist_id: 'a', action: 'follow', created_at: '3' },
      { artist_id: 'b', action: 'skip', created_at: '2' },
    ])
  })
})

describe('saving swipes', () => {
  it('saveTodaysArtists stores one waiting row per artist', async () => {
    db.answer = () => ({ error: null })
    await api.saveTodaysArtists(['a', 'b'])
    expect(db.queries[0].calls[0]).toEqual(['insert', [
      { artist_id: 'a', action: null },
      { artist_id: 'b', action: null },
    ]])
  })

  it('setArtistAction fills in the action on the waiting row', async () => {
    db.answer = () => ({ error: null })
    await api.setArtistAction('a', 'follow')
    expect(db.queries[0].calls).toEqual([
      ['update', { action: 'follow' }],
      ['eq', 'artist_id', 'a'],
      ['is', 'action', null],
    ])
  })

  it.each([
    ['setArtistAction', ['a', 'skip']],
    ['removeArtistAction', ['a']],
    ['changeMatchAction', ['a', 'follow']],
    ['undoMatchAction', ['a']],
    ['resetMatchmaking', []],
    ['addSavedArtist', ['a']],
    ['removeSavedArtist', ['a']],
  ])('%s passes a Supabase error on', async (name, args) => {
    db.answer = () => ({ error: new Error('denied') })
    await expect(api[name](...args)).rejects.toThrow('denied')
  })
})
