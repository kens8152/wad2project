import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getEventData } from '@/services/eventsApi'
import { useUserStore } from '@/stores/user'
import { distanceKm } from '@/utils/distance'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "21:00" -> "9:00 PM"
function formatTime(time) {
  const parts = time.split(':')
  const hour = Number(parts[0])
  const minutes = parts[1]
  const suffix = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return hour12 + ':' + minutes + ' ' + suffix
}

export const useEventsStore = defineStore('events', () => {
  // state
  const events = ref([])
  const genres = ref([])
  const artists = ref([])
  const venues = ref([])
  const loading = ref(false)
  const error = ref('')

  // actions
  async function fetchEvents() {
    if (events.value.length > 0) {
      return
    }

    loading.value = true
    error.value = ''
    try {
      const data = await getEventData()
      const userStore = useUserStore()
      const myLocation = userStore.user.location

      genres.value = data.genres
      artists.value = data.artists
      venues.value = data.venues

      // join genre, venue and artists onto every event so views can use them directly
      const list = []
      for (const e of data.events) {
        const genre = data.genres.find((g) => g.id === e.genreId)
        const venue = data.venues.find((v) => v.id === e.venueId)
        const eventArtists = e.artistIds.map((id) => data.artists.find((a) => a.id === id))

        const date = new Date()
        date.setDate(date.getDate() + e.dayOffset)

        list.push({
          id: e.id,
          genre: genre,
          venue: venue,
          artists: eventArtists,
          headliner: eventArtists[0],
          title: eventArtists[0].name,
          dayOffset: e.dayOffset,
          time: e.time,
          timeLabel: formatTime(e.time),
          dateLabel: DAYS[date.getDay()] + ' ' + date.getDate() + ' ' + MONTHS[date.getMonth()],
          price: e.price,
          going: e.going,
          about: e.about,
          distance: distanceKm(myLocation.lat, myLocation.lng, venue.lat, venue.lng),
        })
      }

      // soonest first
      list.sort((a, b) => {
        if (a.dayOffset !== b.dayOffset) {
          return a.dayOffset - b.dayOffset
        }
        return a.time.localeCompare(b.time)
      })
      events.value = list
    } catch (e) {
      error.value = 'Could not load events: ' + e.message
    } finally {
      loading.value = false
    }
  }

  return { events, genres, artists, venues, loading, error, fetchEvents }
})
