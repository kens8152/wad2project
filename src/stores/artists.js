import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getArtists } from '@/services/artistsApi'
import { setArtistImages } from '@/utils/discover/dotPicture'

export const useArtistsStore = defineStore('artists', () => {
  const artists = ref([])
  const loading = ref(false)
  const error = ref('')

  async function fetchArtists() {
    if (artists.value.length > 0) return

    loading.value = true
    error.value = ''
    try {
      artists.value = await getArtists()
      setArtistImages(artists.value) // keep Discover page in sync
    } catch (e) {
      error.value = 'Could not load artists: ' + e.message
    } finally {
      loading.value = false
    }
  }

  return { artists, loading, error, fetchArtists }
})
