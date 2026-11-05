import { TEST_USER } from './session'

const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()

export function notificationRows() {
  return [
    { id: 'r1', user_id: TEST_USER.id, type: 'reply', actor_name: 'Rosa', body: 'replied to your post "Jazz night at TinBox"', link: '/forum/post/101', read_at: null, created_at: hoursAgo(1) },
    { id: 'm1', user_id: TEST_USER.id, type: 'mention', actor_name: 'Mei', body: 'mentioned you in a post: "Looking for a drummer"', link: '/forum/post/102', read_at: null, created_at: hoursAgo(3) },
    { id: 'u1', user_id: TEST_USER.id, type: 'upvote', actor_name: 'Joel', body: 'upvoted your post "Jazz night at TinBox"', link: '/forum/post/101', read_at: hoursAgo(1), created_at: hoursAgo(5) },
    { id: 'd1', user_id: TEST_USER.id, type: 'downvote', actor_name: 'Ravi', body: 'downvoted your post "Jazz night at TinBox"', link: '/forum/post/101', read_at: null, created_at: hoursAgo(8) },
  ]
}

function parseFilter(raw) {
  const [op, ...rest] = raw.split('.')
  const value = rest.join('.')
  if (op === 'not') return { not: true, ...parseFilter(value) }
  return { op, value }
}

function matches(row, key, filter) {
  const cell = row[key]
  let result
  if (filter.op === 'eq') result = String(cell) === filter.value
  else if (filter.op === 'is') result = filter.value === 'null' ? cell === null || cell === undefined : String(cell) === filter.value
  else if (filter.op === 'gt') result = cell > filter.value
  else result = true
  return filter.not ? !result : result
}

function applyQuery(rows, url) {
  let result = rows
  for (const [key, raw] of url.searchParams) {
    if (['select', 'order', 'limit', 'columns', 'on_conflict'].includes(key)) continue
    result = result.filter((row) => matches(row, key, parseFilter(raw)))
  }
  if (url.searchParams.get('order')?.startsWith('created_at.desc')) {
    result = [...result].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  }
  return result
}

export async function mockNotificationsBackend(page, { settings = null, events = [], rows = notificationRows() } = {}) {
  const tables = {
    notifications: rows,
    notification_settings: settings ? [{ user_id: TEST_USER.id, ...settings }] : [],
    events,
  }
  let nextId = 1

  await page.routeWebSocket(/\/realtime\//, () => {})

  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/rest/v1/')[1]
    if (!(table in tables)) return route.fallback()

    const method = request.method()
    if (method === 'GET') {
      const found = applyQuery(tables[table], url)
      const wantsOne = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      if (wantsOne) {
        return found.length
          ? route.fulfill({ json: found[0] })
          : route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'No rows' } })
      }
      return route.fulfill({ json: found })
    }
    if (method === 'POST') {
      const conflict = url.searchParams.get('on_conflict')?.split(',') ?? []
      for (const row of [].concat(request.postDataJSON())) {
        const existing = conflict.length && tables[table].find((r) => conflict.every((key) => r[key] === row[key]))
        if (existing) {
          if (!(request.headers()['prefer'] ?? '').includes('ignore-duplicates')) Object.assign(existing, row)
        } else {
          tables[table].push({ id: 'new-' + nextId++, created_at: new Date().toISOString(), read_at: null, ...row })
        }
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

  return tables
}
