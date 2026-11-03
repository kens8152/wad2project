import { ref, watch, effectScope } from 'vue'
import { useUserStore } from '@/stores/user'
import { getFollowedArtists, addFollowedArtist, removeFollowedArtist } from '@/services/matchmakingApi'
import { toast } from '@/composables/useToast'

// Shared between every component that uses this file.
const favourites = ref([])
const loading = ref(false)
const pendingIds = ref([])

let started = false
let accountVersion = 0
let loadPromise = null
const favouritesScope = effectScope(true)

export function useFavouriteArtists() {
  const userStore = useUserStore()

  async function loadFavourites() {
    if (!userStore.isLoggedIn) return
    if (loadPromise) return loadPromise

    const version = accountVersion
    loading.value = true

    const request = (async () => {
      try {
        const rows = await getFollowedArtists()

        // Ignore an old response after logout or an account change.
        if (version !== accountVersion) return

        favourites.value = [...new Set(rows.map(row => row.artist_id))]
      } finally {
        if (version === accountVersion) {
          loading.value = false
          loadPromise = null
        }
      }
    })()

    loadPromise = request
    return request
  }

  // Register one account watcher for this shared list.
  // Keep the shared account watcher alive when navigating between pages.
  if (!started) {
    started = true

    favouritesScope.run(() => {
      watch(() => userStore.user.id, () => {
        accountVersion++
        favourites.value = []
        pendingIds.value = []
        loading.value = false
        loadPromise = null

        if (userStore.isLoggedIn && userStore.user.id) {
          loadFavourites().catch(error => {
            console.error('Could not load followed artists:', error)
            toast('Could not load the artists you follow. Please refresh to try again.')
          })
        }
      }, { immediate: true, flush: 'sync' })
    })
  }

  async function toggleFavourite(artist) {
    if (!userStore.isLoggedIn) {
      toast('Please log in to follow artists.')
      return
    }

    const artistId = artist?.id
    if (!artistId || pendingIds.value.includes(artistId)) return

    // Wait for the followed list before deciding whether to add or remove.
    try {
      if (loadPromise) await loadPromise
    } catch (error) {
      console.error('Could not load followed artists:', error)
      toast('Could not check the artists you follow. Please try again.')
      return
    }

    if (!userStore.isLoggedIn || pendingIds.value.includes(artistId)) return

    const version = accountVersion
    const wasFavourite = favourites.value.includes(artistId)

    pendingIds.value = [...pendingIds.value, artistId]

    try {
      if (wasFavourite) {
        await removeFollowedArtist(artistId)
      } else {
        try {
          await addFollowedArtist(artistId)
        } catch (error) {
          // An artist already followed elsewhere should not create a duplicate.
          if (error.code !== '23505') throw error
        }
      }

      if (version !== accountVersion) return

      favourites.value = wasFavourite ? favourites.value.filter(id => id !== artistId) : [...new Set([...favourites.value, artistId])]
      toast(wasFavourite ? 'Unfollowed artist' : 'Following artist')
    } catch (error) {
      console.error('Could not update followed artist:', error)
      toast('Could not update this artist. Please try again.')
    } finally {
      if (version === accountVersion) {
        pendingIds.value = pendingIds.value.filter(id => id !== artistId)
      }
    }
  }

  return { favourites, loading, pendingIds, loadFavourites, toggleFavourite }
}