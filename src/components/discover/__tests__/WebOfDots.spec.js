import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import WebOfDots from '../WebOfDots.vue'
import { getGraph } from '@/data/discover/discoverGraph'

const graph = getGraph()
const realNode = graph.nodes.find((n) => n.real && graph.neighbours[n.index].length > 0)
const demoNode = graph.nodes.find((n) => !n.real)
const genreLabel = (node) => graph.genreById[node.genre].label

let wrapper

function mountWeb(props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/events/list', name: 'events-list', component: { template: '<div />' } },
      { path: '/:any(.*)*', component: { template: '<div />' } },
    ],
  })
  wrapper = mount(WebOfDots, { props, global: { plugins: [router] }, attachTo: document.body })
  return wrapper
}

const dot = (node) => wrapper.get(`[role="button"][aria-label="${node.name}, ${genreLabel(node)}"]`)
const card = () => wrapper.find('.web__card')

afterEach(() => wrapper?.unmount())

describe('WebOfDots: the map', () => {
  it('describes the map for screen readers', () => {
    mountWeb()
    expect(wrapper.get('svg[role="application"]').attributes('aria-label')).toContain('Each dot is an artist')
  })

  it('gives every artist a dot that can be clicked or reached by keyboard', () => {
    mountWeb()
    const dots = wrapper.findAll('circle[role="button"]')
    expect(dots).toHaveLength(graph.nodes.length)
    expect(dots[0].attributes('tabindex')).toBe('0')
  })

  it('has zoom in and zoom out buttons', () => {
    mountWeb()
    expect(wrapper.find('button[aria-label="Zoom in"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Zoom out"]').exists()).toBe(true)
  })

  it('clicking a dot asks to open it', async () => {
    mountWeb()
    await dot(realNode).trigger('click')
    expect(wrapper.emitted('pick')).toEqual([[realNode.id]])
  })

  it('pressing Enter on a dot opens it too', async () => {
    mountWeb()
    await dot(demoNode).trigger('keydown.enter')
    expect(wrapper.emitted('pick')).toEqual([[demoNode.id]])
  })

  it('shows a "Your taste profile" button only when there is a taste spot', async () => {
    mountWeb()
    expect(wrapper.find('.taste-pill').exists()).toBe(false)
    await wrapper.setProps({ tasteSpot: { x: 500, y: 400 } })
    await wrapper.get('.taste-pill').trigger('click')
    expect(wrapper.emitted('taste-click')).toHaveLength(1)
  })
})

describe('WebOfDots: the artist card', () => {
  it('shows no card when no dot is open', () => {
    mountWeb()
    expect(card().exists()).toBe(false)
  })

  it('shows the name, genre and fans of the open artist', () => {
    mountWeb({ pickedId: realNode.id })
    expect(card().text()).toContain(realNode.name)
    expect(card().text()).toContain(genreLabel(realNode))
    expect(card().text()).toContain('fans')
  })

  it('says how many artists share their fans and lists them', () => {
    mountWeb({ pickedId: realNode.id })
    const count = graph.neighbours[realNode.index].length
    expect(card().text()).toContain(`Shares fans with ${count} artist`)
    const first = graph.nodes[graph.neighbours[realNode.index][0]]
    expect(card().findAll('.card-link').map((b) => b.text())).toContainEqual(expect.stringContaining(first.name))
  })

  it('clicking a linked artist opens that artist', async () => {
    mountWeb({ pickedId: realNode.id })
    const first = graph.nodes[graph.neighbours[realNode.index][0]]
    await card().get('.card-link').trigger('click')
    expect(wrapper.emitted('pick').at(-1)).toEqual([first.id])
  })

  it('the close button closes the card', async () => {
    mountWeb({ pickedId: realNode.id })
    await card().get('button[aria-label="Close"]').trigger('click')
    expect(wrapper.emitted('pick').at(-1)).toEqual([null])
  })

  it('asks a guest to sign up to follow', () => {
    mountWeb({ pickedId: realNode.id, signedIn: false })
    const link = card().findAll('a').find((a) => a.text().includes('Sign up to follow'))
    expect(link.attributes('href')).toBe('/signup')
  })

  it('lets a signed-in user follow the artist', async () => {
    mountWeb({ pickedId: realNode.id, signedIn: true })
    const follow = card().findAll('button').find((b) => b.text() === 'Follow')
    await follow.trigger('click')
    expect(wrapper.emitted('follow')[0][0].id).toBe(realNode.id)
  })

  it('shows "Following" for an artist the user follows', () => {
    mountWeb({ pickedId: realNode.id, signedIn: true, following: [realNode.id] })
    expect(card().findAll('button').some((b) => b.text() === 'Following')).toBe(true)
  })

  it('links a real artist to their gigs and artist page', () => {
    mountWeb({ pickedId: realNode.id })
    const hrefs = card().findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain(`/artists/${realNode.artistId}`)
    expect(card().text()).toContain('See gigs')
  })

  it('links a demo act to its artist page and says it has no gigs yet', () => {
    mountWeb({ pickedId: demoNode.id })
    expect(card().findAll('a').map((a) => a.attributes('href'))).toContain(`/artists/${demoNode.id}`)
    expect(card().text()).toContain('No gigs announced yet')
  })
})
