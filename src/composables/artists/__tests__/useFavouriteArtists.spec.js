import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

let api
let toast
let useFavouriteArtists
let userStore

async function setup({ loggedIn = true, followed = ['krunkle'] } = {}) {
  vi.resetModules()
  vi.doMock('@/services/supabase.js', () => ({ supabase: {} }))
  vi.doMock('@/services/matchmakingApi', () => ({
    getFollowedArtists: vi.fn().mockResolvedValue(followed.map((id) => ({ artist_id: id }))),
    addFollowedArtist: vi.fn().mockResolvedValue(),
    removeFollowedArtist: vi.fn().mockResolvedValue(),
  }))
  vi.doMock('@/composables/useToast', () => ({ toast: vi.fn() }))

  const pinia = await import('pinia')
  pinia.setActivePinia(pinia.createPinia())
  const { useUserStore } = await import('@/stores/user')
  userStore = useUserStore()
  if (loggedIn) {
    userStore.isLoggedIn = true
    userStore.user.id = 'user-1'
  }

  api = await import('@/services/matchmakingApi')
  toast = (await import('@/composables/useToast')).toast
  useFavouriteArtists = (await import('../useFavouriteArtists')).useFavouriteArtists
  const favourites = useFavouriteArtists()
  await flushPromises()
  return favourites
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useFavouriteArtists', () => {
  it('loads the artists the user follows', async () => {
    const { favourites } = await setup({ followed: ['krunkle', 'aiyna'] })
    expect(favourites.value).toEqual(['krunkle', 'aiyna'])
  })

  it('asks a guest to log in instead of following', async () => {
    const { toggleFavourite, favourites } = await setup({ loggedIn: false })
    await toggleFavourite({ id: 'krunkle' })
    expect(toast).toHaveBeenCalledWith('Please log in to follow artists.')
    expect(api.addFollowedArtist).not.toHaveBeenCalled()
    expect(favourites.value).toEqual([])
  })

  it('following a new artist saves it and confirms', async () => {
    const { toggleFavourite, favourites } = await setup()
    await toggleFavourite({ id: 'aiyna' })
    expect(api.addFollowedArtist).toHaveBeenCalledWith('aiyna')
    expect(favourites.value).toContain('aiyna')
    expect(toast).toHaveBeenCalledWith('Following artist')
  })

  it('following a followed artist unfollows it', async () => {
    const { toggleFavourite, favourites } = await setup()
    await toggleFavourite({ id: 'krunkle' })
    expect(api.removeFollowedArtist).toHaveBeenCalledWith('krunkle')
    expect(favourites.value).not.toContain('krunkle')
    expect(toast).toHaveBeenCalledWith('Unfollowed artist')
  })

  it('treats "already following" from the database as success', async () => {
    const { toggleFavourite, favourites } = await setup()
    api.addFollowedArtist.mockRejectedValue({ code: '23505' })
    await toggleFavourite({ id: 'aiyna' })
    expect(favourites.value).toContain('aiyna')
    expect(toast).toHaveBeenCalledWith('Following artist')
  })

  it('keeps the list unchanged and says so when saving fails', async () => {
    const { toggleFavourite, favourites } = await setup()
    api.addFollowedArtist.mockRejectedValue(new Error('offline'))
    await toggleFavourite({ id: 'aiyna' })
    expect(favourites.value).toEqual(['krunkle'])
    expect(toast).toHaveBeenCalledWith('Could not update this artist. Please try again.')
  })

  it('ignores a second click while the first is still saving', async () => {
    const { toggleFavourite } = await setup()
    let finish
    api.addFollowedArtist.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const first = toggleFavourite({ id: 'aiyna' })
    await flushPromises()
    await toggleFavourite({ id: 'aiyna' })
    finish()
    await first
    expect(api.addFollowedArtist).toHaveBeenCalledTimes(1)
  })

  it('clears the list when the user logs out', async () => {
    const { favourites } = await setup()
    userStore.isLoggedIn = false
    userStore.user.id = ''
    expect(favourites.value).toEqual([])
  })
})
