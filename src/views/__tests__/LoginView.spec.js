import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'

const auth = vi.hoisted(() => ({
  signInResult: null,
  profileResult: null,
}))

vi.mock('@/services/supabase.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(async () => auth.signInResult),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => auth.profileResult }),
      }),
    }),
  },
}))

const { supabase } = await import('@/services/supabase.js')
const { default: LoginView } = await import('../LoginView.vue')

const Blank = { template: '<div />' }

async function mountLogin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/discover', component: Blank },
      { path: '/onboarding', component: Blank },
      { path: '/signup', component: Blank },
    ],
  })
  router.push('/login')
  await router.isReady()

  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(LoginView, { global: { plugins: [router, pinia] } })
  return { wrapper, router, store: useUserStore() }
}

function signInAs(store, id) {
  supabase.auth.signInWithPassword.mockImplementationOnce(async () => {
    store.user.id = id
    store.isLoggedIn = true
    return { data: { user: { id } }, error: null }
  })
}

async function submit(wrapper, email = 'fan@riffle.test', password = 'secret123') {
  await wrapper.get('#login-email').setValue(email)
  await wrapper.get('#login-password').setValue(password)
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  auth.signInResult = null
  auth.profileResult = { data: null, error: null }
  supabase.auth.signInWithPassword.mockClear()
})

describe('LoginView', () => {
  it('shows labelled email and password fields', async () => {
    const { wrapper } = await mountLogin()
    expect(wrapper.get('label[for="login-email"]').text()).toBe('Email address')
    expect(wrapper.get('label[for="login-password"]').text()).toBe('Password')
  })

  it('hides the password until the eye button is pressed', async () => {
    const { wrapper } = await mountLogin()
    const password = wrapper.get('#login-password')
    expect(password.attributes('type')).toBe('password')

    await wrapper.get('button[aria-label="Show password"]').trigger('click')

    expect(password.attributes('type')).toBe('text')
    expect(wrapper.find('button[aria-label="Hide password"]').exists()).toBe(true)
  })

  it('sends the trimmed email and the password to Supabase', async () => {
    auth.signInResult = { data: { user: null }, error: { message: 'Invalid login credentials' } }
    const { wrapper } = await mountLogin()

    await submit(wrapper, '  fan@riffle.test  ', 'secret123')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'fan@riffle.test',
      password: 'secret123',
    })
  })

  it('shows the error message when the login is rejected', async () => {
    auth.signInResult = { data: { user: null }, error: { message: 'Invalid login credentials' } }
    const { wrapper, router } = await mountLogin()

    await submit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toContain('Invalid login credentials')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('shows no error before the user tries to log in', async () => {
    const { wrapper } = await mountLogin()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('sends a returning user to Discover', async () => {
    const { wrapper, router, store } = await mountLogin()
    signInAs(store, 'u1')
    auth.profileResult = { data: { display_name: 'Kit Tan', onboarding_completed: true }, error: null }

    await submit(wrapper)

    expect(router.currentRoute.value.path).toBe('/discover')
  })

  it('sends a user who has not finished onboarding to Onboarding', async () => {
    const { wrapper, router, store } = await mountLogin()
    signInAs(store, 'u2')
    auth.profileResult = { data: { display_name: 'New Fan', onboarding_completed: false }, error: null }

    await submit(wrapper)

    expect(router.currentRoute.value.path).toBe('/onboarding')
  })

  it('shows the display name from the profile after logging in', async () => {
    const { wrapper, store } = await mountLogin()
    signInAs(store, 'u1')
    auth.profileResult = { data: { display_name: 'Kit Tan', onboarding_completed: true }, error: null }

    await submit(wrapper)

    expect(store.user.name).toBe('Kit Tan')
    expect(store.user.initials).toBe('KT')
  })

  it('clears the password after a successful login', async () => {
    const { wrapper, store } = await mountLogin()
    signInAs(store, 'u1')
    auth.profileResult = { data: { display_name: 'Kit', onboarding_completed: true }, error: null }

    await submit(wrapper)

    expect(wrapper.get('#login-password').element.value).toBe('')
  })

  it('explains when the profile cannot be loaded', async () => {
    const { wrapper, router, store } = await mountLogin()
    signInAs(store, 'u1')
    auth.profileResult = { data: null, error: { message: 'timeout' } }

    await submit(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toContain('your profile could not be loaded')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('links to sign up and to browsing as a guest', async () => {
    const { wrapper } = await mountLogin()
    const links = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(links).toContain('/signup')
    expect(links).toContain('/discover')
  })
})
