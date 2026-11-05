import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ArtistCard from '../ArtistCard.vue'

function makeArtist(overrides = {}) {
  return {
    id: 'krunkle',
    name: 'Krunkle',
    tag: 'funk',
    genre: { name: 'Indie Rock', color: '#f0452f' },
    image: '/images/Artists/krunkle.svg',
    venues: ['BattleBox', 'TinBox'],
    events: [{}, {}],
    nextEvent: { dateLabel: 'Sat 7 Nov', timeLabel: '9:00 PM' },
    ...overrides,
  }
}

const mountCard = (props = {}) => mount(ArtistCard, { props: { artist: makeArtist(), ...props } })

describe('ArtistCard: what it shows', () => {
  it('shows the name, genre and venues', () => {
    const wrapper = mountCard()
    expect(wrapper.get('h3').text()).toBe('Krunkle')
    expect(wrapper.text()).toContain('Indie Rock')
    expect(wrapper.text()).toContain('BattleBox, TinBox')
  })

  it('shows the next event when there is one', () => {
    expect(mountCard().text()).toContain('Next: Sat 7 Nov · 9:00 PM')
  })

  it('hides the next event line when nothing is coming up', () => {
    const wrapper = mountCard({ artist: makeArtist({ nextEvent: null }) })
    expect(wrapper.text()).not.toContain('Next:')
  })

  it('counts events with the right word', () => {
    expect(mountCard().text()).toContain('2 events')
    expect(mountCard({ artist: makeArtist({ events: [{}] }) }).text()).toContain('1 event')
  })

  it('shows the tag chip only when the artist has a tag', () => {
    expect(mountCard().text()).toContain('#funk')
    expect(mountCard({ artist: makeArtist({ tag: '' }) }).text()).not.toContain('#')
  })

  it('shows a footnote when given one', () => {
    expect(mountCard({ footnote: 'Saved 4 Nov 2026' }).text()).toContain('Saved 4 Nov 2026')
  })

  it('uses the artist name as the picture description', () => {
    expect(mountCard().get('img').attributes('alt')).toBe('Krunkle')
  })

  it('swaps a broken picture for a music note', async () => {
    const wrapper = mountCard()
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.artist-card__fallback').exists()).toBe(true)
  })
})

describe('ArtistCard: follow mode (Artists page)', () => {
  it('offers to follow an artist the user does not follow', () => {
    const heart = mountCard().get('button')
    expect(heart.attributes('aria-label')).toBe('Follow')
    expect(heart.attributes('aria-pressed')).toBe('false')
  })

  it('offers to unfollow a followed artist', () => {
    const heart = mountCard({ isFavourite: true }).get('button')
    expect(heart.attributes('aria-label')).toBe('Unfollow')
    expect(heart.attributes('aria-pressed')).toBe('true')
  })
})

describe('ArtistCard: save mode (Saved artists page)', () => {
  it('shows a bookmark instead of a heart', () => {
    const button = mountCard({ mode: 'save', isFavourite: true }).get('button')
    expect(button.attributes('aria-label')).toBe('Remove from saved')
  })

  it('offers to save when not saved', () => {
    expect(mountCard({ mode: 'save' }).get('button').attributes('aria-label')).toBe('Save')
  })
})

describe('ArtistCard: clicks', () => {
  it('emits "select" with the artist when the card is clicked', async () => {
    const wrapper = mountCard()
    await wrapper.get('article').trigger('click')
    expect(wrapper.emitted('select')[0][0].id).toBe('krunkle')
  })

  it('emits "select" when Enter is pressed on the card', async () => {
    const wrapper = mountCard()
    await wrapper.get('article').trigger('keyup.enter')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('the heart emits "toggle-favourite" without opening the artist', async () => {
    const wrapper = mountCard()
    await wrapper.get('button[aria-label="Follow"]').trigger('click')
    expect(wrapper.emitted('toggle-favourite')[0][0].id).toBe('krunkle')
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
