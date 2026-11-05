import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'

const db = vi.hoisted(() => ({
  userId: 'user-1',
  savedVote: null,
  writeError: null,
  writes: [],
}))

vi.mock('@/services/supabase.js', () => {
  const query = (table) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: db.savedVote === null ? null : { vote: db.savedVote }, error: null }),
      delete: () => {
        db.writes.push({ table, type: 'delete' })
        return { eq: () => ({ eq: async () => ({ error: db.writeError }) }) }
      },
      upsert: async (row) => {
        db.writes.push({ table, type: 'upsert', row })
        return { error: db.writeError }
      },
    }
    return chain
  }
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: db.userId ? { id: db.userId } : null } }) },
      from: query,
    },
  }
})

const { useVote } = await import('../usevote')

beforeEach(() => {
  db.userId = 'user-1'
  db.savedVote = null
  db.writeError = null
  db.writes = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function setup(post = { id: 'p1', upvotes: 4, downvotes: 1 }) {
  const item = ref(post)
  const vote = useVote(item)
  await flushPromises()
  return vote
}

describe('useVote', () => {
  it('shows the stored counts before the user votes', async () => {
    const { upvotes, downvotes, userVote } = await setup()
    expect(upvotes.value).toBe(4)
    expect(downvotes.value).toBe(1)
    expect(userVote.value).toBeNull()
  })

  it('upvoting adds one and saves the vote', async () => {
    const { vote, upvotes, userVote } = await setup()

    await vote('up')

    expect(userVote.value).toBe('up')
    expect(upvotes.value).toBe(5)
    expect(db.writes).toEqual([
      { table: 'post_votes', type: 'upsert', row: { post_id: 'p1', user_id: 'user-1', vote: 1 } },
    ])
  })

  it('pressing upvote again removes the vote', async () => {
    const { vote, upvotes, userVote } = await setup()

    await vote('up')
    await vote('up')

    expect(userVote.value).toBeNull()
    expect(upvotes.value).toBe(4)
    expect(db.writes.at(-1)).toEqual({ table: 'post_votes', type: 'delete' })
  })

  it('switching from up to down moves the vote across', async () => {
    const { vote, upvotes, downvotes } = await setup()

    await vote('up')
    await vote('down')

    expect(upvotes.value).toBe(4)
    expect(downvotes.value).toBe(2)
  })

  it("does not count the user's earlier vote twice", async () => {
    db.savedVote = 1
    const { upvotes, userVote } = await setup({ id: 'p1', upvotes: 5, downvotes: 0 })

    expect(userVote.value).toBe('up')
    expect(upvotes.value).toBe(5)
  })

  it('undoes the vote on screen when saving fails', async () => {
    db.writeError = { message: 'network down' }
    const { vote, upvotes, userVote } = await setup()

    await vote('up')

    expect(userVote.value).toBeNull()
    expect(upvotes.value).toBe(4)
  })

  it('does nothing for a guest who is not logged in', async () => {
    db.userId = null
    const { vote, upvotes } = await setup()

    await vote('up')

    expect(upvotes.value).toBe(4)
    expect(db.writes).toHaveLength(0)
  })

  it('works for replies with a different table', async () => {
    const item = ref({ id: 'r1', upvotes: 0, downvotes: 0 })
    const { vote } = useVote(item, { table: 'reply_votes', idColumn: 'reply_id' })
    await flushPromises()

    await vote('down')
    await nextTick()

    expect(db.writes[0]).toEqual({
      table: 'reply_votes',
      type: 'upsert',
      row: { reply_id: 'r1', user_id: 'user-1', vote: -1 },
    })
  })
})
