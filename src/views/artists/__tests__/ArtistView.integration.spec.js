import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { EVENT_JSON } from '@/test/fixtures/artistEvents'

vi.mock('@/services/supabase.js', () => ({ supabase: {} }))
vi.mock('@/services/eventsApi', () => ({ getEventData: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ toast: vi.fn() }))

const { getEventData } = await import('@/services/eventsApi')
const { toast } = await import('@/composables/useToast')
const { default: ArtistView } = await import('../ArtistView.vue')

const Blank = { template: '<div />' }
let wrapper
let router

async function mountPage() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/artists', name: 'artists', component: ArtistView },
      { path: '/artists/:id', name: 'artist-detail', component: Blank },
      { path: '/matchmaking', name: 'matchmaking', component: Blank },
    ],
  })
  router.push('/artists')
  await router.isReady()
  setActivePinia(createPinia())
  wrapper = mount(ArtistView, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
}

const cardNames = () => wrapper.findAll('.artist-card h3').map((h) => h.text())
const subtitle = () => wrapper.get('.artists-shell__subtitle').text()
const tick = (label) => wrapper.findAll('.filters label').find((l) => l.text().includes(label)).get('input').trigger('change')
const apply = () => wrapper.get('.filters__apply').trigger('click')

beforeEach(() => {
  vi.mocked(getEventData).mockResolvedValue(structuredClone(EVENT_JSON))
})

afterEach(() => wrapper?.unmount())

describe('Artists page: sidebar + sort + artist cards', () => {
  it('loads the artists from the events data, A-Z', async () => {
    await mountPage()
    expect(cardNames()).toEqual(['FallingIslands', 'Krunkle', 'Lullaboy'])
    expect(subtitle()).toBe('3 artists performing near you')
  })

  it('searching in the sidebar narrows the cards and the subtitle', async () => {
    await mountPage()
    await wrapper.get('.filters input[type="search"]').setValue('lulla')
    expect(cardNames()).toEqual(['Lullaboy'])
    expect(subtitle()).toBe('1 artist matching “lulla”')
  })

  it('ticking a genre only changes the cards after Apply', async () => {
    await mountPage()
    await tick('Electronic')
    expect(cardNames()).toHaveLength(3)
    expect(wrapper.get('.filters__apply').text()).toBe('Apply changes')

    await apply()

    expect(cardNames()).toEqual(['FallingIslands'])
  })

  it('shows an empty state with a Reset button that brings everyone back', async () => {
    await mountPage()
    await wrapper.get('.filters input[type="search"]').setValue('nobody at all')

    expect(wrapper.get('.artists-shell__state h2').text()).toBe('No artists match these filters')

    await wrapper.get('.artists-shell__state button').trigger('click')
    expect(cardNames()).toHaveLength(3)
  })

  it('the sort menu re-orders the cards', async () => {
    await mountPage()
    await wrapper.get('button[aria-haspopup="listbox"]').trigger('click')
    const option = wrapper.findAll('[role="option"] button').find((b) => b.text().includes('Most events'))
    await option.trigger('click')
    expect(cardNames()[0]).toBe('FallingIslands')
  })

  it('clicking a card opens that artist', async () => {
    await mountPage()
    await wrapper.findAll('.artist-card')[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/artists/krunkle')
  })

  it('a guest pressing Follow is asked to log in', async () => {
    await mountPage()
    await wrapper.get('button[aria-label="Follow"]').trigger('click')
    await flushPromises()
    expect(toast).toHaveBeenCalledWith('Please log in to follow artists.')
  })

  it('links to matchmaking from "I\'m feeling lucky"', async () => {
    await mountPage()
    const link = wrapper.findAll('a').find((a) => a.text().includes("I'm feeling lucky"))
    expect(link.attributes('href')).toBe('/matchmaking')
  })

  it('shows the error and a retry button when the events cannot load', async () => {
    vi.mocked(getEventData).mockRejectedValueOnce(new Error('Network Error'))
    await mountPage()
    expect(wrapper.text()).toContain('Could not load events: Network Error')

    await wrapper.findAll('button').find((b) => b.text() === 'Try again').trigger('click')
    await flushPromises()

    expect(cardNames()).toHaveLength(3)
  })
})
