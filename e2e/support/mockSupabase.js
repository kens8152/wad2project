import { ARTISTS, EVENTS, EVENT_ARTISTS, GENRES, VENUES } from './catalogue'

export const POSTS = [
  {
    id: 101,
    title: 'Jazz night at TinBox',
    content: 'Anyone keen to go this Friday?',
    username: 'justin',
    tags: ['jazz'],
    upvotes: 2,
    downvotes: 0,
    replies: [],
    images: [],
    event_ids: [],
    artist_ids: [],
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 102,
    title: 'Looking for a drummer',
    content: 'Our indie band needs a beat',
    username: 'ken',
    tags: ['lfg', 'indie'],
    upvotes: 10,
    downvotes: 1,
    replies: [],
    images: [],
    event_ids: [],
    artist_ids: [],
    created_at: '2026-10-03T10:00:00Z',
  },
  {
    id: 103,
    title: 'Best synthwave albums',
    content: 'Drop your favourites below',
    username: 'aryan',
    tags: ['synthwave'],
    upvotes: 5,
    downvotes: 0,
    replies: [],
    images: [],
    event_ids: [],
    artist_ids: [],
    created_at: '2026-10-02T10:00:00Z',
  },
]

const TABLES = {
  posts: POSTS,
  tags: [{ id: 1, name: 'jazz' }, { id: 2, name: 'indie' }, { id: 3, name: 'synthwave' }],
  genres: GENRES,
  venues: VENUES,
  artists: ARTISTS,
  events: EVENTS,
  event_artists: EVENT_ARTISTS,
  past_events: [],
}

function rowsFor(url) {
  const table = url.pathname.split('/rest/v1/')[1]
  let rows = TABLES[table] ?? []
  for (const [key, value] of url.searchParams) {
    if (value.startsWith('eq.')) rows = rows.filter((row) => String(row[key]) === value.slice(3))
  }
  return rows
}

export async function mockSupabase(page, { login = 'invalid' } = {}) {
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    if (request.method() !== 'GET') return route.fulfill({ status: 201, json: [] })

    const rows = rowsFor(new URL(request.url()))
    const wantsOne = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    if (wantsOne) {
      return rows.length
        ? route.fulfill({ json: rows[0] })
        : route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'No rows' } })
    }
    return route.fulfill({ json: rows })
  })

  await page.route('**/auth/v1/**', async (route) => {
    if (route.request().url().includes('/token') && login === 'invalid') {
      return route.fulfill({
        status: 400,
        json: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
      })
    }
    return route.fulfill({ status: 401, json: { msg: 'Not logged in' } })
  })

  await page.route('**/storage/v1/**', (route) => route.fulfill({ json: [] }))
  await page.route('**/realtime/v1/**', (route) => route.abort())
}
