import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SortDropdown from '../SortDropdown.vue'
import { SORTS } from '@/composables/events/useEventFilters'

let wrapper

function mountDropdown(props = {}) {
  wrapper = mount(SortDropdown, {
    props: { modelValue: 'soonest', options: SORTS, ...props },
    attachTo: document.body,
  })
  return wrapper
}

const toggle = () => wrapper.get('button[aria-haspopup="listbox"]')
const visibleLabel = () => wrapper.findAll('.sort-dropdown__labels strong').find((s) => !s.classes('is-hidden'))
const option = (label) => wrapper.findAll('[role="option"] button').find((b) => b.text().includes(label))

afterEach(() => wrapper?.unmount())

describe('SortDropdown', () => {
  it('shows the "Sort by" prefix and the chosen option', () => {
    mountDropdown({ modelValue: 'price' })
    expect(toggle().text()).toContain('Sort by')
    expect(visibleLabel().text()).toBe('Price: low to high')
  })

  it('accepts a custom prefix', () => {
    mountDropdown({ prefix: 'Order' })
    expect(toggle().text()).toContain('Order')
  })

  it('opens a list of every option', async () => {
    mountDropdown()
    await toggle().trigger('click')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(SORTS.length)
  })

  it('marks the chosen option as selected', async () => {
    mountDropdown({ modelValue: 'nearest' })
    await toggle().trigger('click')
    const selected = wrapper.findAll('[role="option"]').filter((o) => o.attributes('aria-selected') === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0].text()).toContain('Nearest')
  })

  it('emits the new value and closes when an option is picked', async () => {
    mountDropdown()
    await toggle().trigger('click')
    await option('Most popular').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['popular']])
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('closes on Escape without changing the value', async () => {
    mountDropdown()
    await toggle().trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
