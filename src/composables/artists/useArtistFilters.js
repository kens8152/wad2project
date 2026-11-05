import { ref, computed } from 'vue'
import { useArtistsStore } from '@/stores/artists'
import {
  buildGenreOptions,
  sortArtists,
} from '../../utils/artists/artists'

// the options for the SortDropdown (it needs value, label and icon)
export const ARTIST_SORTS = [
  { value: 'name', label: 'Name (A-Z)', icon: 'bi-sort-alpha-down' },
  { value: 'events', label: 'Most events', icon: 'bi-fire' },
  { value: 'soonest', label: 'Next event soonest', icon: 'bi-clock' },
]

// The filter + sort state is kept at module scope (a singleton), so it survives
// navigating to an artist profile and back — the Artists page remounts but the
// chosen search, genres and sort stay as the user left them.
const sortBy = ref('events')
const searchText = ref('')
const draftGenres = ref([])
const appliedGenres = ref([])

// All the filter and sort logic for the Artists page
export function useArtistFilters() {
  const artistsStore = useArtistsStore()

  // ----- the data -----
  const allArtists = computed(() => artistsStore.artists)
  const genreOptions = computed(() => buildGenreOptions([], allArtists.value))

  // ----- the filtered and sorted list -----
  const filteredArtists = computed(() => {
    const result = []
    const search = searchText.value.trim().toLowerCase()

    for (let i = 0; i < allArtists.value.length; i++) {
      const artist = allArtists.value[i]

      if (search !== '' && !artist.name.toLowerCase().includes(search)) {
        continue
      }
      if (appliedGenres.value.length > 0 && !artist.genres.some(g => appliedGenres.value.includes(g))) {
        continue
      }

      result.push(artist)
    }

    return sortArtists(result, sortBy.value)
  })

  // true when checkboxes changed but Apply not pressed yet
  const isDirty = computed(() => {
    return appliedGenres.value.slice().sort().join(',') !== draftGenres.value.slice().sort().join(',')
  })

  const subtitle = computed(() => {
    const n = filteredArtists.value.length
    const noun = n + (n === 1 ? ' artist' : ' artists')
    if (searchText.value.trim() !== '') {
      return noun + ' matching "' + searchText.value.trim() + '"'
    }
    return noun + ' performing near you'
  })

  const activeCount = computed(() => {
    let count = 0
    if (searchText.value.trim() !== '') count++
    if (appliedGenres.value.length > 0) count++
    return count
  })

  function applyFilters() {
    appliedGenres.value = draftGenres.value.slice()
  }

  function resetFilters() {
    searchText.value = ''
    draftGenres.value = []
    appliedGenres.value = []
  }

  function clearSearch() {
    searchText.value = ''
  }

  return {
    sortBy,
    searchText,
    draftGenres,
    allArtists,
    genreOptions,
    filteredArtists,
    isDirty,
    subtitle,
    activeCount,
    applyFilters,
    resetFilters,
    clearSearch,
  }
}
