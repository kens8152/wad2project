import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'

const counts = vi.hoisted(() => ({ artists: 178, events: 18 }))

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: (table) => ({
      select: async () => ({ count: table === 'artists' ? counts.artists : counts.events, error: null }),
    }),
  },
}))
vi.mock('@/composables/landing/useLandingMotion', () => ({
  useLandingMotion: vi.fn(),
  loadGsap: vi.fn(() => new Promise(() => {})),
  prefersReducedMotion: () => true,
  MEDIA: { desktop: '(min-width: 768px)', phone: '(max-width: 767.98px)', reduced: '(prefers-reduced-motion: reduce)' },
}))

const { useLandingMotion } = await import('@/composables/landing/useLandingMotion')
const { default: LandingView } = await import('../LandingView.vue')

const Blank = { template: '<div />' }
let wrapper
let router

async function mountPage() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome', name: 'landing', component: LandingView },
      { path: '/discover', name: 'discover', component: Blank },
      { path: '/matchmaking', name: 'matchmaking', component: Blank },
      { path: '/events', name: 'events-map', component: Blank },
      { path: '/forum', name: 'forum', component: Blank },
    ],
  })
  router.push('/welcome')
  await router.isReady()
  wrapper = mount(LandingView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const hrefs = (label) => wrapper.findAll('a').filter((a) => a.text().includes(label)).map((a) => a.attributes('href'))

afterEach(() => wrapper?.unmount())

describe('Landing page', () => {
  it('has one main heading that reads as a sentence', async () => {
    await mountPage()
    const h1 = wrapper.findAll('h1')
    expect(h1).toHaveLength(1)
    expect(h1[0].attributes('aria-label')).toBe('Find your next favourite artist.')
  })

  it('plays the tracks in order: intro, discover, matchmaking, events, forum, encore', async () => {
    await mountPage()
    expect(wrapper.findAll('[data-track]').map((s) => s.attributes('data-track'))).toEqual([
      'Intro',
      'Discover',
      'Matchmaking',
      'Events',
      'Community',
      'Encore',
    ])
    const read = (h) => h.element.innerHTML.replace(/<br[^>]*>/g, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    expect(wrapper.findAll('h2').map(read)).toEqual([
      'A web of sounds, built from shared fans.',
      'Swipe your way to a new favourite.',
      'Tonight, somewhere in Singapore.',
      'Find your people before the show.',
      'Drop the needle.',
    ])
  })

  it('every call to action goes to the right page', async () => {
    await mountPage()
    expect(hrefs('Start exploring')).toEqual(['/discover', '/discover'])
    expect(hrefs('Match me with artists')).toEqual(['/matchmaking', '/matchmaking'])
    expect(hrefs('Open the web')).toEqual(['/discover'])
    expect(hrefs('Deal me in')).toEqual(['/matchmaking'])
    expect(hrefs("See what's on")).toEqual(['/events'])
    expect(hrefs('Join the conversation')).toEqual(['/forum'])
  })

  it('shows the matchmaking deck with real artists, and its swipe stamps', async () => {
    await mountPage()
    const cards = wrapper.findAll('.deck-card')
    expect(cards).toHaveLength(12)
    expect(cards[0].text()).toContain('FallingIslands')
    expect(cards[0].get('img').attributes('src')).toBe('/images/Artists/profile/electronic-1.jpg')
    expect(wrapper.findAll('.stamp--like')).toHaveLength(12)
  })

  it('puts every venue on the map and lists the gig tickets', async () => {
    await mountPage()
    expect(wrapper.findAll('.map-pin')).toHaveLength(10)
    expect(wrapper.findAll('.ticket').map((t) => t.get('strong').text())).toEqual([
      'FallingIslands',
      'ai.yna',
      'Cloudy Yan',
      'Kin Leonn',
      'Forest Bloom',
      'Velvet Atlas',
    ])
  })

  it('shows the live artist and gig counts', async () => {
    counts.artists = 205
    counts.events = 31
    await mountPage()
    const numbers = wrapper.findAll('.odo__number').map((n) => n.attributes('aria-label'))
    expect(numbers).toEqual(['205', '31', '6'])
  })

  it('has a song-style progress bar that starts at the intro', async () => {
    await mountPage()
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.text()).toContain('Intro')
    expect(bar.text()).toContain('0:00')
    expect(bar.text()).toContain('3:42')
  })

  it('sets up an animation for every scene', async () => {
    await mountPage()
    expect(useLandingMotion.mock.calls.length).toBeGreaterThanOrEqual(7)
  })

  it('keeps the decorative layers away from screen readers', async () => {
    await mountPage()
    for (const selector of ['.hero-stage', '.web-frame', '.deck-stage', '.events-map', '.bubbles']) {
      expect(wrapper.get(selector).attributes('aria-hidden')).toBe('true')
    }
  })
})
