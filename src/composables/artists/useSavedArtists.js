import { ref } from 'vue'
import { getSavedArtists, addSavedArtist, removeSavedArtist } from '@/services/matchmakingApi'

// Saved artists (bookmarks), shared by every page with a save button.
// Saving is separate from following (see useFavouriteArtists).
const savedIds = ref([])

export function useSavedArtists() {
  // Loads the saved list; returns the rows (artist_id, saved_at), newest first
  async function loadSaved() {
    const rows = await getSavedArtists()
    savedIds.value = rows.map(row => row.artist_id)
    return rows
  }

  function isSaved(artistId) {
    return savedIds.value.includes(artistId)
  }

  // Saves or unsaves an artist; returns true when it is now saved.
  // The list changes straight away and is put back if Supabase fails (the error is passed on).
  async function toggleSaved(artistId) {
    const wasSaved = isSaved(artistId)
    savedIds.value = wasSaved ? savedIds.value.filter(id => id !== artistId) : [...savedIds.value, artistId]

    try {
      if (wasSaved) {
        await removeSavedArtist(artistId)
      } else {
        await addSavedArtist(artistId)
      }
    } catch (error) {
      savedIds.value = wasSaved ? [...savedIds.value, artistId] : savedIds.value.filter(id => id !== artistId)
      throw error
    }

    return !wasSaved
  }

  return { savedIds, loadSaved, isSaved, toggleSaved }
}
