import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SaveButton from '../savebutton.vue'

describe('SaveButton', () => {
  it('offers to save a post that is not saved', () => {
    const wrapper = mount(SaveButton)
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Save post')
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('offers to unsave a post that is already saved', () => {
    const wrapper = mount(SaveButton, { props: { saved: true } })
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Unsave post')
    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('emits "toggle" when clicked', async () => {
    const wrapper = mount(SaveButton)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('updates its label when the saved prop changes', async () => {
    const wrapper = mount(SaveButton, { props: { saved: false } })
    await wrapper.setProps({ saved: true })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Unsave post')
  })
})
