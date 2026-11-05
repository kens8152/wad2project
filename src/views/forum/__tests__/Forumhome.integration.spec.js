import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import Forumhome from '../Forumhome.vue'

const POSTS = [
  {
    id: 1,
    title: 'Jazz night at TinBox',
    content: 'Anyone keen?',
    username: 'justin',
    tags: ['jazz'],
    upvotes: 2,
    replies: [{}, {}, {}],
    created_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 2,
    title: 'Looking for a drummer',
    content: 'Indie band needs a beat',
    username: 'ken',
    tags: ['lfg', 'indie'],
    upvotes: 10,
    replies: [],
    created_at: '2026-10-03T10:00:00Z',
  },
  {
    id: 3,
    title: 'Best synthwave albums',
    content: 'Drop your favourites',
    username: 'aryan',
    tags: ['synthwave'],
    upvotes: 5,
    replies: [{}],
    created_at: '2026-10-02T10:00:00Z',
  },
]

const PostcardStub = {
  props: ['post'],
  template: '<article class="post-stub">{{ post.title }}</article>',
}

let wrapper

function mountForum(posts = POSTS) {
  const reset = ref(0)
  wrapper = mount(Forumhome, {
    props: { posts },
    attachTo: document.body,
    global: {
      provide: { forumReset: reset },
      stubs: { Postcard: PostcardStub, teleport: true },
    },
  })
  return { wrapper, reset }
}

const shownTitles = () => wrapper.findAll('.post-stub').map((p) => p.text())
const search = (text) => wrapper.get('input[type="search"]').setValue(text)

async function sortBy(label) {
  if (!wrapper.find('[role="menu"]').exists()) {
    await wrapper.get('button[aria-haspopup="menu"]').trigger('click')
  }
  const item = wrapper.findAll('[role="menuitemradio"]').find((b) => b.text().includes(label))
  await item.trigger('click')
}

afterEach(() => wrapper?.unmount())

describe('Forum home: search box + sort menu + post list', () => {
  it('shows every post, newest first', () => {
    mountForum()
    expect(shownTitles()).toEqual(['Looking for a drummer', 'Best synthwave albums', 'Jazz night at TinBox'])
  })

  it('narrows the list as the user types in the search box', async () => {
    mountForum()
    await search('drummer')
    expect(shownTitles()).toEqual(['Looking for a drummer'])
  })

  it.each([
    ['a word in the post body', 'favourites', 'Best synthwave albums'],
    ['the author name', 'justin', 'Jazz night at TinBox'],
    ['a tag', 'lfg', 'Looking for a drummer'],
    ['text in any letter case', 'JAZZ', 'Jazz night at TinBox'],
  ])('finds a post by %s', async (_, term, title) => {
    mountForum()
    await search(term)
    expect(shownTitles()).toEqual([title])
  })

  it('shows no posts when nothing matches', async () => {
    mountForum()
    await search('polka')
    expect(shownTitles()).toHaveLength(0)
  })

  it('brings every post back when the clear button is pressed', async () => {
    mountForum()
    await search('drummer')
    await wrapper.get('button[aria-label="Clear search"]').trigger('click')
    expect(shownTitles()).toHaveLength(3)
  })

  it('reorders posts by most upvotes when chosen from the sort menu', async () => {
    mountForum()
    await sortBy('Upvotes')
    expect(shownTitles()).toEqual(['Looking for a drummer', 'Best synthwave albums', 'Jazz night at TinBox'])
    expect(wrapper.get('button[aria-haspopup="menu"]').text()).toContain('Upvotes')
  })

  it('reorders posts by most comments', async () => {
    mountForum()
    await sortBy('Comments')
    expect(shownTitles()).toEqual(['Jazz night at TinBox', 'Best synthwave albums', 'Looking for a drummer'])
  })

  it('shows the oldest posts first when "Oldest first" is chosen', async () => {
    mountForum()
    await sortBy('Oldest first')
    expect(shownTitles()).toEqual(['Jazz night at TinBox', 'Best synthwave albums', 'Looking for a drummer'])
  })

  it('keeps the chosen sort while searching', async () => {
    mountForum()
    await sortBy('Upvotes')
    await sortBy('Fewest first')
    await search('a')
    expect(shownTitles()).toEqual(['Jazz night at TinBox', 'Best synthwave albums', 'Looking for a drummer'])
  })

  it('shows a new post as soon as it is added', async () => {
    const posts = ref([...POSTS])
    mountForum(posts.value)
    await wrapper.setProps({
      posts: [{ id: 4, title: 'Fresh post', tags: [], created_at: '2026-10-04T10:00:00Z' }, ...POSTS],
    })
    expect(shownTitles()[0]).toBe('Fresh post')
  })

  it('clears the search and sort when the sidebar resets the forum', async () => {
    const { reset } = mountForum()
    await search('drummer')
    await sortBy('Comments')

    reset.value++
    await nextTick()
    await nextTick()

    expect(wrapper.get('input[type="search"]').element.value).toBe('')
    expect(shownTitles()).toEqual(['Looking for a drummer', 'Best synthwave albums', 'Jazz night at TinBox'])
  })
})
