import { ref } from 'vue'
import { fetchEventCatalog } from '../../services/events/eventsService'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { distanceKm } from '../../utils/events/geo'

// Module-level state: the catalog is fetched once and shared by the map view,
// list view and detail view, so switching between them is instant.
const events = ref([])
const artists = ref([])
const genres = ref([])
const venues = ref([])
const loading = ref(false)
const error = ref('')

let inflight = null

// how far every event is from a place
function measureFrom(location) {
  for (const event of events.value) event.distanceKm = distanceKm(location, event.venue)
}

function load() {
  if (inflight) return inflight
  const { user } = useCurrentUser()
  loading.value = true
  error.value = ''
  inflight = fetchEventCatalog(user.value.location)
    .then((catalog) => {
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
      loading.value = false
    })
  return inflight
}

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
      user.value = { ...user.value, location }
      measureFrom(location)
    },
    getEvent: (id) => events.value.find((e) => e.id === id) || null,
  }
}
