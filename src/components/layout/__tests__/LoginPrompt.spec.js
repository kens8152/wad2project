import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import LoginPrompt from '../LoginPrompt.vue'

const mountPrompt = (props) => mount(LoginPrompt, { props, global: { stubs: { RouterLink: RouterLinkStub } } })

describe('LoginPrompt', () => {
  it('links to the login page', () => {
    const wrapper = mountPrompt()
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/login')
  })

  it('shows the default reason', () => {
    expect(mountPrompt().text()).toContain('to manage your preferences.')
  })

  it('shows a custom reason', () => {
    const wrapper = mountPrompt({ message: 'to see your saved posts.' })
    expect(wrapper.text()).toContain('to see your saved posts.')
    expect(wrapper.text()).not.toContain('preferences')
  })
})
