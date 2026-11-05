import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VoteButtons from '../votebuttons.vue'

const upButton = (wrapper) => wrapper.get('button[aria-label="Upvote"]')
const downButton = (wrapper) => wrapper.get('button[aria-label="Downvote"]')

describe('VoteButtons', () => {
  it('shows the upvote and downvote counts', () => {
    const wrapper = mount(VoteButtons, { props: { up: 12, down: 3 } })
    expect(upButton(wrapper).text()).toContain('12')
    expect(downButton(wrapper).text()).toContain('3')
  })

  it('shows 0 for both counts by default', () => {
    const wrapper = mount(VoteButtons)
    expect(upButton(wrapper).text()).toContain('0')
    expect(downButton(wrapper).text()).toContain('0')
  })

  it('emits "vote" with "up" when the upvote button is clicked', async () => {
    const wrapper = mount(VoteButtons)
    await upButton(wrapper).trigger('click')
    expect(wrapper.emitted('vote')).toEqual([['up']])
  })

  it('emits "vote" with "down" when the downvote button is clicked', async () => {
    const wrapper = mount(VoteButtons)
    await downButton(wrapper).trigger('click')
    expect(wrapper.emitted('vote')).toEqual([['down']])
  })

  it("marks only the user's current vote as pressed", () => {
    const wrapper = mount(VoteButtons, { props: { current: 'up' } })
    expect(upButton(wrapper).attributes('aria-pressed')).toBe('true')
    expect(downButton(wrapper).attributes('aria-pressed')).toBe('false')
  })

  it('marks neither button as pressed when the user has not voted', () => {
    const wrapper = mount(VoteButtons)
    expect(upButton(wrapper).attributes('aria-pressed')).toBe('false')
    expect(downButton(wrapper).attributes('aria-pressed')).toBe('false')
  })

  it('still emits "up" when the user clicks to remove an upvote', async () => {
    const wrapper = mount(VoteButtons, { props: { current: 'up' } })
    await upButton(wrapper).trigger('click')
    expect(wrapper.emitted('vote')).toEqual([['up']])
  })
})
