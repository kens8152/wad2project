import { ref, computed } from 'vue'
import { useEventsStore } from '@/stores/events'
import {
  buildArtists,
  buildGenreOptions,
  buildVenueOptions,
  hasAny,
  sortArtists,
} from '../../utils/artists/artists'

// the options for the SortDropdown (it needs value, label and icon)
export const ARTIST_SORTS = [
  { value: 'name', label: 'Name (A-Z)', icon: 'bi-sort-alpha-down' },
  { value: 'events', label: 'Most events', icon: 'bi-fire' },
  { value: 'soonest', label: 'Next event soonest', icon: 'bi-clock' },
]

// turn a list into text so we can check if two lists are the same
function listToText(list) {
  return list.slice().sort().join(',')
}

// All the filter and sort logic for the Artists page
export function useArtistFilters() {
  const eventsStore = useEventsStore()

  const sortBy = ref('name')

  // "draft" = what the checkboxes show right now
  // "applied" = what the results use (copied over when you press Apply)
  const searchText = ref('') // the search box works straight away
  const draftGenres = ref([])
  const draftVenues = ref([])
  const appliedGenres = ref([])
  const appliedVenues = ref([])

  // ----- the data -----
  const allArtists = computed(() => buildArtists(eventsStore.events))
  const genreOptions = computed(() => buildGenreOptions(eventsStore.events, allArtists.value))
  const venueOptions = computed(() => buildVenueOptions(allArtists.value))

  // ----- the filtered and sorted list -----
  const filteredArtists = computed(() => {
    const result = []
    const search = searchText.value.trim().toLowerCase()

    for (let i = 0; i < allArtists.value.length; i++) {
      const artist = allArtists.value[i]

      // search by name
      if (search !== '' && !artist.name.toLowerCase().includes(search)) {
        continue
      }
      // genre filter (if none are ticked, show all)
      if (appliedGenres.value.length > 0 && !hasAny(artist.genres, appliedGenres.value)) {
        continue
      }
      // venue filter (if none are ticked, show all)
      if (appliedVenues.value.length > 0 && !hasAny(artist.venues, appliedVenues.value)) {
        continue
      }

      result.push(artist)
    }

    return sortArtists(result, sortBy.value)
  })

  // ----- small things the page needs -----

  // true when the checkboxes were changed but Apply was not pressed yet
  const isDirty = computed(() => {
    return (
      listToText(draftGenres.value) !== listToText(appliedGenres.value) ||
      listToText(draftVenues.value) !== listToText(appliedVenues.value)
    )
  })

  // the line under the title
  const subtitle = computed(() => {
    const n = filteredArtists.value.length
    const noun = n + (n === 1 ? ' artist' : ' artists')
    if (searchText.value.trim() !== '') {
      return noun + ' matching “' + searchText.value.trim() + '”'
    }
    return noun + ' performing near you'
  })

  // the number badge on the mobile Filters button
  const activeCount = computed(() => {
    let count = 0
    if (searchText.value.trim() !== '') count++
    if (appliedGenres.value.length > 0) count++
    if (appliedVenues.value.length > 0) count++
    return count
  })

  // ----- buttons -----
  function applyFilters() {
    appliedGenres.value = draftGenres.value.slice()
    appliedVenues.value = draftVenues.value.slice()
  }

  function resetFilters() {
    searchText.value = ''
    draftGenres.value = []
    draftVenues.value = []
    appliedGenres.value = []
    appliedVenues.value = []
  }

  function clearSearch() {
    searchText.value = ''
  }

  return {
    sortBy,
    searchText,
    draftGenres,
    draftVenues,
    allArtists,
    genreOptions,
    venueOptions,
    filteredArtists,
    isDirty,
    subtitle,
    activeCount,
    applyFilters,
    resetFilters,
    clearSearch,
  }
}