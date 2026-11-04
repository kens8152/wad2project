import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { GENRES, getGraph } from '@/data/discover/discoverGraph'

const backend = vi.hoisted(() => ({ profileGenres: [] }))

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { genres: backend.profileGenres }, error: null }) }),
      }),
    }),
  },
}))
vi.mock('@/composables/useToast', () => ({ toast: vi.fn() }))
vi.mock('@/services/matchmakingApi', () => ({
  getFollowedArtists: vi.fn(),
  addFollowedArtist: vi.fn(),
  removeFollowedArtist: vi.fn(),
}))

const api = await import('@/services/matchmakingApi')
const { toast } = await import('@/composables/useToast')
const { useUserStore } = await import('@/stores/user')
const { default: DiscoverWebView } = await import('../DiscoverWebView.vue')

const graph = getGraph()
const realNode = graph.nodes.find((n) => n.real)
const demoNode = graph.nodes.find((n) => !n.real)
const dotLabel = (node) => `${node.name}, ${graph.genreById[node.genre].label}`

const TourStub = {
  props: ['steps'],
  emits: ['step', 'finish', 'skip'],
  template: '<div class="tour-stub"><p v-for="s in steps" :key="s.title">{{ s.title }}</p><button class="skip" @click="$emit(\'skip\')">Skip tour</button></div>',
}

let wrapper

async function mountPage({ loggedIn = false } = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/list', name: 'events-list', component: { template: '<div />' } },
      { path: '/:any(.*)*', component: { template: '<div />' } },
    ],
  })
  router.push('/discover')
  await router.isReady()

  setActivePinia(createPinia())
  if (loggedIn) {
    const store = useUserStore()
    store.isLoggedIn = true
    store.user.id = 'user-1'
  }
  wrapper = mount(DiscoverWebView, {
    global: { plugins: [router], stubs: { DiscoverTour: TourStub } },
    attachTo: document.body,
  })
  await flushPromises()
}

const search = () => wrapper.get('input[aria-label="Search artists"]')
const genrePill = (label) => wrapper.findAll('.genre-pill').find((b) => b.text().includes(label))
const nudge = () => wrapper.find('.nudge[role="status"]')
const openCard = () => wrapper.find('.web__card.is-open')
const pillButton = (text) => wrapper.findAll('.pill-button').find((b) => b.text().includes(text))

beforeEach(() => {
  vi.clearAllMocks()
  backend.profileGenres = []
  api.getFollowedArtists.mockResolvedValue([])
  api.addFollowedArtist.mockResolvedValue()
  api.removeFollowedArtist.mockResolvedValue()
})

afterEach(() => wrapper?.unmount())

describe('Discover as a guest', () => {
  it('shows the legend with how many artists and links there are', async () => {
    await mountPage()
    expect(wrapper.get('.legend-bar').text()).toContain(`${graph.nodes.length} artists · ${graph.edges.length} links`)
  })

  it('lists every genre as switched on', async () => {
    await mountPage()
    expect(wrapper.findAll('.genre-pill')).toHaveLength(GENRES.length)
    expect(wrapper.get('.filter-count').text()).toBe(`${GENRES.length}/${GENRES.length} on`)
  })

  it('lets a guest open a dot to see the artist card', async () => {
    await mountPage()
    await wrapper.get(`[aria-label="${dotLabel(realNode)}"]`).trigger('click')
    expect(openCard().text()).toContain(realNode.name)
    expect(openCard().text()).toContain('Sign up to follow')
  })

  it('asks a guest to log in when they try to search', async () => {
    await mountPage()
    expect(search().attributes('readonly')).toBeDefined()
    await search().trigger('focus')
    expect(nudge().text()).toContain('Log in to use this')
  })

  it('asks a guest to log in instead of switching a genre off', async () => {
    await mountPage()
    await genrePill('Electronic').trigger('click')
    expect(nudge().exists()).toBe(true)
    expect(genrePill('Electronic').attributes('aria-pressed')).toBe('true')
  })

  it('the log-in notice links to sign up and log in, and can be closed', async () => {
    await mountPage()
    await genrePill('Pop Music').trigger('click')
    const hrefs = nudge().findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/signup', '/login'])
    await nudge().get('button[aria-label="Close"]').trigger('click')
    expect(nudge().exists()).toBe(false)
  })

  it('hides "Recommended for you" from guests', async () => {
    await mountPage()
    expect(pillButton('Recommended')).toBeUndefined()
  })

  it('the Guide button starts the tour, ending with a sign-up step for guests', async () => {
    await mountPage()
    await pillButton('Guide').trigger('click')
    const titles = wrapper.findAll('.tour-stub p').map((p) => p.text())
    expect(titles).toEqual(['Find a scene', 'Meet a local artist', 'Take a closer look', 'Make it yours', 'Come back anytime'])

    await wrapper.get('.tour-stub .skip').trigger('click')
    expect(wrapper.find('.tour-stub').exists()).toBe(false)
  })
})

describe('Discover when logged in', () => {
  it('switching a genre off updates its button and the count', async () => {
    await mountPage({ loggedIn: true })
    await genrePill('Electronic').trigger('click')
    expect(genrePill('Electronic').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('.filter-count').text()).toBe(`${GENRES.length - 1}/${GENRES.length} on`)
  })

  it('"Clear filters" switches every genre back on', async () => {
    await mountPage({ loggedIn: true })
    await genrePill('Electronic').trigger('click')
    await wrapper.get('.clear-button').trigger('click')
    expect(wrapper.get('.filter-count').text()).toBe(`${GENRES.length}/${GENRES.length} on`)
    expect(wrapper.find('.clear-button').exists()).toBe(false)
  })

  it('searching lists up to six matching artists with their fans', async () => {
    await mountPage({ loggedIn: true })
    await search().setValue('a')
    const rows = wrapper.findAll('.search-results button')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(6)
    expect(rows[0].text()).toContain('fans')
  })

  it('picking a search result opens that artist and clears the search', async () => {
    await mountPage({ loggedIn: true })
    await search().setValue(realNode.name)
    await wrapper.get('.search-results button').trigger('click')
    expect(openCard().text()).toContain(realNode.name)
    expect(search().element.value).toBe('')
  })

  it('pressing Enter opens the first search result', async () => {
    await mountPage({ loggedIn: true })
    await search().setValue(realNode.name)
    await search().trigger('keydown.enter')
    expect(openCard().text()).toContain(realNode.name)
  })

  it('"Recommended for you" uses the genres from the taste profile', async () => {
    backend.profileGenres = ['Electronic']
    await mountPage({ loggedIn: true })
    await pillButton('Recommended').trigger('click')

    const panel = wrapper.get('.recommended')
    expect(panel.text()).toContain('Picked from your taste profile')
    const rows = panel.findAll('.recommended-row')
    expect(rows).toHaveLength(6)
    expect(rows.every((r) => r.text().includes('Electronic'))).toBe(true)
  })

  it('suggests popular artists when there is no taste profile yet', async () => {
    await mountPage({ loggedIn: true })
    await pillButton('Recommended').trigger('click')
    expect(wrapper.get('.recommended').text()).toContain('Popular right now')
  })

  it('following a real artist saves it', async () => {
    await mountPage({ loggedIn: true })
    await wrapper.get(`[aria-label="${dotLabel(realNode)}"]`).trigger('click')
    await openCard().findAll('button').find((b) => b.text() === 'Follow').trigger('click')
    await flushPromises()
    expect(api.addFollowedArtist).toHaveBeenCalledWith(realNode.artistId)
  })

  it('explains that demo artists cannot be followed', async () => {
    await mountPage({ loggedIn: true })
    await wrapper.get(`[aria-label="${dotLabel(demoNode)}"]`).trigger('click')
    await openCard().findAll('button').find((b) => b.text() === 'Follow').trigger('click')
    expect(toast).toHaveBeenCalledWith('This is a demo artist. Saving is available for artists with a profile.')
    expect(api.addFollowedArtist).not.toHaveBeenCalled()
  })

  it('shows the genre mix of followed artists along the bottom', async () => {
    api.getFollowedArtists.mockResolvedValue([{ artist_id: realNode.artistId }])
    await mountPage({ loggedIn: true })
    const bar = wrapper.get('.taste-bar')
    expect(bar.text()).toContain('Saved artists by genre')
    expect(bar.text()).toContain(`100% ${graph.genreById[realNode.genre].label}`)
  })
})
