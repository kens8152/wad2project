import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ForumSearch from '../forumsearch.vue'


describe('ForumSearch', () => {
  it('shows the default placeholder', () => {
    const wrapper = mount(ForumSearch)
    expect(wrapper.get('input').attributes('placeholder')).toBe('Search the forum…')
  })

  it('shows a custom placeholder', () => {
    const wrapper = mount(ForumSearch, { props: { placeholder: 'Search saved posts' } })
    expect(wrapper.get('input').attributes('placeholder')).toBe('Search saved posts')
  })

  it('emits the text the user types', async () => {
    const wrapper = mount(ForumSearch)
    await wrapper.get('input').setValue('jazz')
    expect(wrapper.emitted('update:modelValue')).toEqual([['jazz']])
  })

  it('hides the clear button when the box is empty', () => {
    const wrapper = mount(ForumSearch, { props: { modelValue: '' } })
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(false)
  })

  it('shows the clear button once there is text', () => {
    const wrapper = mount(ForumSearch, { props: { modelValue: 'jazz' } })
    expect(wrapper.find('button[aria-label="Clear search"]').exists()).toBe(true)
  })

  it('clears the search when the clear button is clicked', async () => {
    const wrapper = mount(ForumSearch, { props: { modelValue: 'jazz' } })
    await wrapper.get('button[aria-label="Clear search"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
  })
})
