import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const db = vi.hoisted(() => ({ userId: 'user-1', writeError: null, saved: [] }))

vi.mock('@/services/supabase.js', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    delete: () => {
      db.saved.push('delete')
      return { eq: () => ({ eq: async () => ({ error: db.writeError }) }) }
    },
    upsert: async (row) => {
      db.saved.push(row.vote)
      return { error: db.writeError }
    },
  }
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: db.userId ? { id: db.userId } : null } }) },
      from: () => chain,
    },
  }
})

const { default: VoteButtons } = await import('../votebuttons.vue')
const { useVote } = await import('@/composables/forum/usevote')

const VotingPost = {
  components: { VoteButtons },
  props: ['post'],
  setup(props) {
    const post = ref(props.post)
    return useVote(post)
  },
  template: '<VoteButtons :up="upvotes" :down="downvotes" :current="userVote" @vote="vote" />',
}

beforeEach(() => {
  db.userId = 'user-1'
  db.writeError = null
  db.saved = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function mountPost(post = { id: 'p1', upvotes: 7, downvotes: 2 }) {
  const wrapper = mount(VotingPost, { props: { post } })
  await flushPromises()
  return wrapper
}

const up = (w) => w.get('button[aria-label="Upvote"]')
const down = (w) => w.get('button[aria-label="Downvote"]')

async function click(button) {
  await button.trigger('click')
  await flushPromises()
}

describe('Voting on a post: VoteButtons + useVote', () => {
  it('shows the counts from the post', async () => {
    const wrapper = await mountPost()
    expect(up(wrapper).text()).toContain('7')
    expect(down(wrapper).text()).toContain('2')
  })

  it('clicking upvote raises the count, highlights the button and saves +1', async () => {
    const wrapper = await mountPost()
    await click(up(wrapper))

    expect(up(wrapper).text()).toContain('8')
    expect(up(wrapper).attributes('aria-pressed')).toBe('true')
    expect(db.saved).toEqual([1])
  })

  it('clicking upvote twice takes the vote back', async () => {
    const wrapper = await mountPost()
    await click(up(wrapper))
    await click(up(wrapper))

    expect(up(wrapper).text()).toContain('7')
    expect(up(wrapper).attributes('aria-pressed')).toBe('false')
    expect(db.saved).toEqual([1, 'delete'])
  })

  it('switching to a downvote moves the vote from one count to the other', async () => {
    const wrapper = await mountPost()
    await click(up(wrapper))
    await click(down(wrapper))

    expect(up(wrapper).text()).toContain('7')
    expect(down(wrapper).text()).toContain('3')
    expect(down(wrapper).attributes('aria-pressed')).toBe('true')
  })

  it('puts the count back if the vote cannot be saved', async () => {
    db.writeError = { message: 'offline' }
    const wrapper = await mountPost()
    await click(up(wrapper))

    expect(up(wrapper).text()).toContain('7')
    expect(up(wrapper).attributes('aria-pressed')).toBe('false')
  })

  it('ignores clicks from a guest who is not logged in', async () => {
    db.userId = null
    const wrapper = await mountPost()
    await click(up(wrapper))

    expect(up(wrapper).text()).toContain('7')
    expect(db.saved).toEqual([])
  })
})
