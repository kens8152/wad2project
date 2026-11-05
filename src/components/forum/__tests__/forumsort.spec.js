import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ForumSort from '../forumsort.vue'

let wrapper

function mountSort(modelValue = { key: 'date', dir: 'desc' }) {
  wrapper = mount(ForumSort, { props: { modelValue }, attachTo: document.body })
  return wrapper
}

const openMenu = () => wrapper.get('button[aria-haspopup="menu"]').trigger('click')
const menuItem = (label) => wrapper.findAll('[role="menuitemradio"]').find((b) => b.text().includes(label))

afterEach(() => wrapper?.unmount())

describe('ForumSort', () => {
  it('shows the current sort on the button', () => {
    mountSort({ key: 'upvotes', dir: 'desc' })
    expect(wrapper.get('button[aria-haspopup="menu"]').text()).toContain('Upvotes')
  })

  it('falls back to "Date posted" for an unknown sort', () => {
    mountSort({ key: 'nonsense', dir: 'desc' })
    expect(wrapper.get('button[aria-haspopup="menu"]').text()).toContain('Date posted')
  })

  it('keeps the menu closed until the button is clicked', async () => {
    mountSort()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await openMenu()

    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    expect(wrapper.get('button[aria-haspopup="menu"]').attributes('aria-expanded')).toBe('true')
  })

  it('lists the three sort fields', async () => {
    mountSort()
    await openMenu()
    const labels = wrapper.findAll('[role="menuitemradio"]').map((b) => b.text())
    expect(labels).toContain('Date posted')
    expect(labels).toContain('Upvotes')
    expect(labels).toContain('Comments')
  })

  it('choosing a new field emits it, sorted most first', async () => {
    mountSort()
    await openMenu()
    await menuItem('Upvotes').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[{ key: 'upvotes', dir: 'desc' }]])
  })

  it('choosing the field that is already selected emits nothing', async () => {
    mountSort()
    await openMenu()
    await menuItem('Date posted').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('choosing "Oldest first" keeps the field and flips the order', async () => {
    mountSort()
    await openMenu()
    await menuItem('Oldest first').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[{ key: 'date', dir: 'asc' }]])
  })

  it('names the order options to suit the field', async () => {
    mountSort({ key: 'comments', dir: 'desc' })
    await openMenu()
    expect(menuItem('Most first').exists()).toBe(true)
    expect(menuItem('Fewest first').exists()).toBe(true)
  })

  it('ticks the selected field and order', async () => {
    mountSort({ key: 'upvotes', dir: 'asc' })
    await openMenu()
    expect(menuItem('Upvotes').attributes('aria-checked')).toBe('true')
    expect(menuItem('Fewest first').attributes('aria-checked')).toBe('true')
    expect(menuItem('Most first').attributes('aria-checked')).toBe('false')
  })

  it('closes when Escape is pressed', async () => {
    mountSort()
    await openMenu()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('closes when the user clicks somewhere else', async () => {
    mountSort()
    await openMenu()
    document.body.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
