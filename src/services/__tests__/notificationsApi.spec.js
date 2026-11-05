import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({ queries: [], channels: [], removed: [], answer: () => ({ data: [], error: null }) }))

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
            if (['select', 'insert', 'update', 'delete', 'upsert'].includes(name) && query.calls.length === 0) {
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
  const channel = (name) => {
    const entry = { name, listeners: [], subscribed: false }
    db.channels.push(entry)
    const api = {
      on: (...args) => {
        entry.listeners.push(args)
        return api
      },
      subscribe: () => {
        entry.subscribed = true
        return entry
      },
    }
    return api
  }
  return { supabase: { from, channel, removeChannel: (c) => db.removed.push(c) } }
})

const api = await import('../notificationsApi')

const call = (query, name) => query.calls.find(([n]) => n === name)

beforeEach(() => {
  db.queries = []
  db.channels = []
  db.removed = []
  db.answer = () => ({ data: [], error: null })
})

describe('the list', () => {
  it('loads the newest 100 notifications', async () => {
    db.answer = () => ({ data: [{ id: 'a' }], error: null })
    expect(await api.getNotifications()).toEqual([{ id: 'a' }])

    const [query] = db.queries
    expect(query.table).toBe('notifications')
    expect(call(query, 'order')).toEqual(['order', 'created_at', { ascending: false }])
    expect(call(query, 'limit')).toEqual(['limit', 100])
  })

  it('marks one notification as read', async () => {
    await api.markNotificationRead('a')
    const [query] = db.queries
    expect(query.op).toBe('update')
    expect(call(query, 'update')[1]).toHaveProperty('read_at')
    expect(call(query, 'eq')).toEqual(['eq', 'id', 'a'])
  })

  it('marks only the unread ones as read', async () => {
    await api.markAllNotificationsRead()
    expect(call(db.queries[0], 'is')).toEqual(['is', 'read_at', null])
  })

  it('removes one notification', async () => {
    await api.deleteNotification('a')
    expect(db.queries[0].op).toBe('delete')
    expect(call(db.queries[0], 'eq')).toEqual(['eq', 'id', 'a'])
  })

  it('clears every read notification', async () => {
    await api.deleteReadNotifications()
    expect(db.queries[0].op).toBe('delete')
    expect(call(db.queries[0], 'not')).toEqual(['not', 'read_at', 'is', null])
  })

  it('passes on Supabase errors', async () => {
    db.answer = () => ({ data: null, error: new Error('offline') })
    await expect(api.getNotifications()).rejects.toThrow('offline')
    await expect(api.deleteNotification('a')).rejects.toThrow('offline')
  })
})

describe('settings', () => {
  it('reads your settings row, or null when there is none', async () => {
    db.answer = () => ({ data: null, error: null })
    expect(await api.getNotificationSettings()).toBeNull()
    expect(db.queries[0].table).toBe('notification_settings')
    expect(call(db.queries[0], 'maybeSingle')).toBeTruthy()
  })

  it('saves a change for this person', async () => {
    await api.saveNotificationSettings('me', { post_votes: false })
    const [query] = db.queries
    expect(query.op).toBe('upsert')
    expect(call(query, 'upsert')).toEqual(['upsert', { user_id: 'me', post_votes: false }, { onConflict: 'user_id' }])
  })
})

describe('new gigs near me', () => {
  it('asks for the gigs added after a time, with their venue location', async () => {
    await api.getEventsAddedSince('2026-11-01T00:00:00Z')
    const [query] = db.queries
    expect(query.table).toBe('events')
    expect(call(query, 'select')[1]).toContain('venue:venues(name, lat, lng)')
    expect(call(query, 'gt')).toEqual(['gt', 'created_at', '2026-11-01T00:00:00Z'])
  })

  it('adds gig notifications, skipping any already there', async () => {
    const rows = [{ user_id: 'me', type: 'event', dedupe_key: 'event:x' }]
    await api.addEventNotifications(rows)
    expect(call(db.queries[0], 'upsert')).toEqual(['upsert', rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }])
  })

  it('does nothing when there are no new gigs', async () => {
    await api.addEventNotifications([])
    expect(db.queries).toHaveLength(0)
  })
})

describe('live updates', () => {
  it('listens for new notifications for this person only, and can stop', () => {
    const onChange = vi.fn()
    const stop = api.subscribeToNotifications('me', onChange)

    const [channel] = db.channels
    expect(channel.subscribed).toBe(true)
    const [event, filter, handler] = channel.listeners[0]
    expect(event).toBe('postgres_changes')
    expect(filter).toEqual({ event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.me' })
    expect(handler).toBe(onChange)

    stop()
    expect(db.removed).toHaveLength(1)
  })
})
