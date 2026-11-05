import { ref, computed, watch } from 'vue'
import { useEventsStore } from '@/stores/events'
import { supabase } from '@/services/supabase'

// Gets everything the artist profile page needs for ONE artist.
// artistId is a ref (for example computed(() => route.params.id))
export function useArtistProfile(artistId) {
  const eventsStore = useEventsStore()

  // artist + profile data fetched from Supabase
  const artist = ref(null)
  const profileLoading = ref(true)
  const profileError = ref('')

  async function fetchArtist(id) {
    if (!id) return
    profileLoading.value = true
    profileError.value = ''
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, tag, bio, hometown, formed, socials, image_url, tracks, genre:genres(name, color)')
        .eq('id', id)
        .single()

      if (error) throw error

      artist.value = {
        id: data.id,
        name: data.name,
        tag: data.tag || '',
        image: data.image_url || '',
        bio: data.bio || '',
        hometown: data.hometown || '',
        formed: data.formed || '',
        socials: data.socials || {},
        tracks: data.tracks || [],
        genre: data.genre || { name: 'Unknown', color: '#6c757d' },
      }
    } catch (e) {
      profileError.value = e.message
      artist.value = null
    } finally {
      profileLoading.value = false
    }
  }

  watch(artistId, fetchArtist, { immediate: true })

  // profile fields flattened for the template (bio, socials, formed)
  const profile = computed(() => {
    if (!artist.value) return { bio: '', socials: {}, formed: '' }
    return {
      bio: artist.value.bio,
      socials: artist.value.socials,
      formed: artist.value.formed,
    }
  })

  // events this artist appears in (from the events store)
  const artistEvents = computed(() => {
    if (!artist.value) return []
    return eventsStore.events.filter(e =>
      e.artists && e.artists.some(a => a && a.id === artist.value.id)
    )
  })

  // upcoming events: dayOffset >= 0, soonest first
  const upcomingEvents = computed(() =>
    artistEvents.value
      .filter(e => e.dayOffset >= 0)
      .sort((a, b) => a.dayOffset - b.dayOffset)
  )

  // past events: dayOffset < 0, most recent first
  const pastEvents = computed(() =>
    artistEvents.value
      .filter(e => e.dayOffset < 0)
      .sort((a, b) => b.dayOffset - a.dayOffset)
  )

  // portfolio = upcoming + past together
  const portfolio = computed(() => upcomingEvents.value.concat(pastEvents.value))

  return { artist, profile, profileLoading, profileError, fetchArtist, upcomingEvents, pastEvents, portfolio }
}
