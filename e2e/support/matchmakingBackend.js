const ARTISTS = [
  { id: 'krunkle', name: 'Krunkle', tag: 'funk', hometown: 'Tampines', formed: '2019', genre: { name: 'Indie Rock', color: '#f0452f' } },
  { id: 'aiyna', name: 'ai.yna', tag: 'alt-pop', hometown: 'Bishan', formed: '2021', genre: { name: 'Pop Music', color: '#1f6feb' } },
  { id: 'loka-nada', name: 'Loka Nada', tag: 'gamelan', hometown: 'Kallang', formed: '2017', genre: { name: 'Traditional Ethnic Music', color: '#f59e0b' } },
].map((artist, i) => ({
  ...artist,
  bio: '',
  socials: {},
  image_url: `/images/Artists/${artist.id}.svg`,
  tracks: [{ id: 1000 + i, title: `${artist.name} Anthem` }],
}))

export const MATCH_ARTIST_NAMES = ARTISTS.map((a) => a.name)

function parseFilter(raw) {
  const [op, ...rest] = raw.split('.')
  const value = rest.join('.')
  if (op === 'not') return { not: true, ...parseFilter(value) }
  if (op === 'in') return { op, value: value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, '')) }
  return { op, value }
}

function matches(row, key, filter) {
  const cell = row[key]
  let result
  if (filter.op === 'eq') result = String(cell) === filter.value
  else if (filter.op === 'is') result = filter.value === 'null' ? cell === null || cell === undefined : String(cell) === filter.value
  else if (filter.op === 'in') result = filter.value.includes(String(cell))
  else if (filter.op === 'gte') result = cell >= filter.value
  else if (filter.op === 'lt') result = cell < filter.value
  else result = true
  return filter.not ? !result : result
}

function applyQuery(rows, url) {
  let result = rows
  for (const [key, raw] of url.searchParams) {
    if (['select', 'order', 'limit', 'columns', 'on_conflict'].includes(key)) continue
    const filter = parseFilter(raw)
    result = result.filter((row) => matches(row, key, filter))
  }
  const order = url.searchParams.get('order')
  if (order) {
    const keys = order.split(',').map((part) => part.split('.'))
    result = [...result].sort((a, b) => {
      for (const [key, dir] of keys) {
        if (a[key] === b[key]) continue
        const cmp = a[key] < b[key] ? -1 : 1
        return dir === 'desc' ? -cmp : cmp
      }
      return 0
    })
  }
  return result
}

export async function mockMatchmakingBackend(page) {
  const tables = {
    artists: ARTISTS,
    matchmaking_actions: [],
    saved_artists: [],
    followed_artists: [],
    profiles: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        display_name: 'Test Fan',
        onboarding_completed: true,
        genres: ['Electronic', 'Pop Music'],
        favourite_songs: 'Glimmer — Krunkle\nMidnight Letters — Sherman Zhuo',
      },
    ],
  }
  let nextId = 1

  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/rest/v1/')[1]
    if (!(table in tables)) return route.fallback()

    const method = request.method()
    if (method === 'GET') {
      const rows = applyQuery(tables[table], url)
      const wantsOne = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      if (wantsOne) {
        return rows.length
          ? route.fulfill({ json: rows[0] })
          : route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'No rows' } })
      }
      return route.fulfill({ json: rows })
    }
    if (method === 'POST') {
      const body = request.postDataJSON()
      const now = new Date().toISOString()
      for (const row of [].concat(body)) {
        tables[table].push({ id: nextId++, created_at: now, saved_at: now, followed_at: now, ...row })
      }
      return route.fulfill({ status: 201, body: '' })
    }
    if (method === 'PATCH') {
      const changes = request.postDataJSON()
      for (const row of applyQuery(tables[table], url)) Object.assign(row, changes)
      return route.fulfill({ status: 204, body: '' })
    }
    if (method === 'DELETE') {
      const doomed = new Set(applyQuery(tables[table], url))
      tables[table] = tables[table].filter((row) => !doomed.has(row))
      return route.fulfill({ status: 204, body: '' })
    }
    return route.fallback()
  })

  await page.route('https://itunes.apple.com/**', (route) => {
    const ids = new URL(route.request().url()).searchParams.get('id').split(',').map(Number)
    const results = ids.map((trackId) => {
      const artist = ARTISTS.find((a) => a.tracks[0].id === trackId)
      return {
        trackId,
        previewUrl: `https://audio.test/${trackId}.m4a`,
        trackViewUrl: `https://music.apple.com/track/${trackId}`,
        artworkUrl100: artist ? `/images/Artists/${artist.id}.svg` : '',
      }
    })
    return route.fulfill({ json: { resultCount: results.length, results } })
  })

  await page.route('https://audio.test/**', (route) => route.fulfill({ status: 200, contentType: 'audio/mp4', body: '' }))

  return tables
}
