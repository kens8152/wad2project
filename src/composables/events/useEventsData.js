import { ref } from 'vue'
import { fetchEventCatalog } from '../../services/events/eventsService'
import { useCurrentUser } from '@/composables/useCurrentUser' // the logged-in user, including their location
import { distanceKm } from '../../utils/events/geo' // straight-line distance between two points (Haversine)

// Module-level state: the catalog is fetched once and shared by the map view,
// list view and detail view, so switching between them is instant.
// (These refs sit OUTSIDE the function on purpose. A module is only loaded once,
// so every component that calls useEventsData() gets these same refs, not new copies.)
const events = ref([])
const artists = ref([])
const genres = ref([])
const venues = ref([])
const loading = ref(false) // true while the fetch is running (the views show a loading state)
const error = ref('') // a message if the fetch failed, empty otherwise

// The promise of the fetch that is running or has finished. It makes sure we only
// fetch once, however many components call load().
let inflight = null

// how far every event is from a place
// (changes distanceKm on each event; Vue notices because `events` is a ref, so
// the cards, the distance filter and the "Nearest" sort all update by themselves)
function measureFrom(location) {
  for (const event of events.value) event.distanceKm = distanceKm(location, event.venue)
}

function load() {
  // already loading or loaded: hand back the same promise instead of fetching again
  if (inflight) return inflight
  const { user } = useCurrentUser()
  loading.value = true
  error.value = ''
  inflight = fetchEventCatalog(user.value.location)
    .then((catalog) => {
      // copy the four lists from the service into the shared refs
      events.value = catalog.events
      artists.value = catalog.artists
      genres.value = catalog.genres
      venues.value = catalog.venues
      measureFrom(user.value.location) // a location found while the events were loading
    })
    .catch((e) => {
      inflight = null // allow a retry
      error.value = e?.message || 'Could not load events.'
    })
    .finally(() => {
      loading.value = false // runs whether the fetch worked or failed
    })
  return inflight
}

// What the views call. It returns the shared data plus the actions on it.
export function useEventsData() {
  const { user } = useCurrentUser()
  return {
    events,
    artists,
    genres,
    venues,
    loading,
    error,
    user,
    load,
    // your real location was found: the map and every distance move to it
    setLocation(location) {
      user.value = { ...user.value, location } // copy the user, replacing only `location`
      measureFrom(location) // so the distances (and "Nearest") match the new place
    },
    // used by the event detail page; gives null (not a crash) for an id that does not exist
    getEvent: (id) => events.value.find((e) => e.id === id) || null,
  }
}
