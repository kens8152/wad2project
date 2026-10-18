import { computed } from 'vue'
import { useEventsStore } from '@/stores/events'
import { buildArtists } from '../utils/artists'
import pastEventsData from '/src/data/pastEvents.json'
import artistProfiles from '/src/data/artistProfiles.json'

// Gets everything the artist profile page needs for ONE artist.
// artistId is a ref (for example computed(() => route.params.id))
export function useArtistProfile(artistId) {
  const eventsStore = useEventsStore()

  // all events = the current events + the sample past events
  const allEvents = computed(() => eventsStore.events.concat(pastEventsData))

  // find this artist (buildArtists groups the events by artist)
  const artist = computed(() => {
    const artists = buildArtists(allEvents.value)
    for (let i = 0; i < artists.length; i++) {
      if (artists[i].id === artistId.value) {
        return artists[i]
      }
    }
    return null
  })

  // bio and social links (from artistProfiles.json)
  const profile = computed(() => {
    const saved = artistProfiles[artistId.value]
    if (saved) {
      return saved
    }
    return { bio: '', socials: {} }
  })

  // events that have not happened yet, soonest first
  const upcomingEvents = computed(() => {
    const list = []
    if (artist.value === null) return list

    for (let i = 0; i < artist.value.events.length; i++) {
      const event = artist.value.events[i]
      if (event.dayOffset >= 0) {
        list.push(event)
      }
    }
    return list.sort(function (a, b) {
      return a.dayOffset - b.dayOffset
    })
  })

  // events that already happened, most recent first
  const pastEvents = computed(() => {
    const list = []
    if (artist.value === null) return list

    for (let i = 0; i < artist.value.events.length; i++) {
      const event = artist.value.events[i]
      if (event.dayOffset < 0) {
        list.push(event)
      }
    }
    return list.sort(function (a, b) {
      return b.dayOffset - a.dayOffset
    })
  })

  // portfolio = upcoming + past events together
  const portfolio = computed(() => upcomingEvents.value.concat(pastEvents.value))

  return { artist, profile, upcomingEvents, pastEvents, portfolio }
}