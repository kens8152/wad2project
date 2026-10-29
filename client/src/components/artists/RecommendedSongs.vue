<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user.js'
import { supabase } from '@/services/supabase.js'
import { searchSongs } from '@/services/spotifyApi'

const props = defineProps({
  artists: {
    type: Array,
    required: true
  }
})

const userStore = useUserStore()

const panelOpen = ref(true)
const recommendedSongs = ref([])
const loading = ref(false)
const errorMessage = ref('')
const message = ref('')
const actionLink = ref('')
const actionText = ref('')

let requestVersion = 0

function normalise(text) {
  return typeof text === 'string' ? text.trim().toLowerCase() : ''
}

async function loadRecommendations() {
  const version = ++requestVersion
  const accountId = userStore.user.id

  recommendedSongs.value = []
  errorMessage.value = ''
  message.value = ''
  actionLink.value = ''
  actionText.value = ''
  loading.value = false

  if (!userStore.isLoggedIn) {
    message.value = 'Create an account and choose your favourite genres to receive recommendations.'
    actionLink.value = '/signup'
    actionText.value = 'Create an account'
    return
  }

  if (props.artists.length === 0) {
    message.value = 'No local artists have been loaded yet.'
    return
  }

  loading.value = true

  try {
    const { data: profile, error } = await supabase.from('profiles').select('genres, onboarding_completed').eq('id', accountId).maybeSingle()

    if (version !== requestVersion) return
    if (error) throw error

    if (!profile || profile.onboarding_completed !== true || !Array.isArray(profile.genres) || profile.genres.length === 0) {
      message.value = 'Complete your taste profile to receive recommendations.'
      actionLink.value = '/onboarding'
      actionText.value = 'Complete onboarding'
      return
    }

    if (!localStorage.getItem('access_token')) {
      message.value = 'Open Edit profile and connect Spotify to load recommended songs.'
      actionLink.value = '/profile'
      actionText.value = 'Open my profile'
      return
    }

    const preferredGenres = profile.genres.map(genre => normalise(genre))

    const matchingArtists = props.artists.filter(artist => {
      return artist.genres.some(genre => preferredGenres.includes(normalise(genre)))
    })

    if (matchingArtists.length === 0) {
      message.value = 'No artists on this graph match your saved genres yet.'
      actionLink.value = '/profile'
      actionText.value = 'Review my preferences'
      return
    }

    const songs = []

    // Search up to four matching artists, keeping up to six songs
    for (const artist of matchingArtists.slice(0, 4)) {
      if (version !== requestVersion) return

      const artistName = artist.name.replace(/"/g, '')
      const tracks = await searchSongs('artist:"' + artistName + '"')

      if (version !== requestVersion) return

      // Check that the track lists the same artist name
      const matchingTracks = tracks.filter(track => {
        return track.artists.some(trackArtist => normalise(trackArtist.name) === normalise(artist.name))
      })

      for (const track of matchingTracks.slice(0, 2)) {
        if (!track.id || !track.external_urls?.spotify) continue
        if (songs.some(song => song.id === track.id)) continue

        songs.push({
          id: track.id,
          title: track.name,
          artist: track.artists.map(trackArtist => trackArtist.name).join(', '),
          image: track.album?.images?.[0]?.url || '',
          url: track.external_urls.spotify,
          genre: artist.genre.name
        })

        if (songs.length === 6) break
      }

      if (songs.length === 6) break
    }

    recommendedSongs.value = songs

    if (songs.length === 0) {
      message.value = 'No matching Spotify tracks were found for these artists.'
    }
  } catch (error) {
    if (version !== requestVersion) return

    const status = error.response?.status

    if (status === 401) {
      errorMessage.value = 'Your Spotify session could not be used. Please reconnect Spotify through Edit profile.'
    } else if (status === 403) {
      errorMessage.value = 'Spotify denied this request. Check that your Spotify account has access to the project’s Spotify app.'
    } else if (status === 429) {
      errorMessage.value = 'Spotify is receiving too many requests. Please try again later.'
    } else {
      errorMessage.value = 'Recommendations could not be loaded. Please try again.'
    }
  } finally {
    if (version === requestVersion) {
      loading.value = false
    }
  }
}

watch([() => userStore.user.id, () => props.artists], loadRecommendations, { immediate: true })

onBeforeUnmount(() => {
  requestVersion++
})
</script>

<template>
  <button v-if="!panelOpen" class="recommendation-toggle" type="button" @click="panelOpen = true">♫ Recommended songs</button>

  <section v-else class="recommendation-panel" aria-labelledby="recommendation-heading">
    <div class="recommendation-heading">
      <h2 id="recommendation-heading">Recommended for you</h2>
      <button class="close-button" type="button" aria-label="Close recommendations" @click="panelOpen = false">×</button>
    </div>

    <p class="recommendation-subtitle">Discover local music through your favourite genres.</p>

    <p v-if="loading" role="status">Finding songs for you…</p>
    <p v-else-if="errorMessage" class="recommendation-error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="message">{{ message }}</p>

    <ul v-if="recommendedSongs.length" class="recommendation-list">
      <li v-for="song in recommendedSongs" :key="song.id" class="recommendation-song">
        <a :href="song.url" class="song-artwork" target="_blank" rel="noopener noreferrer" :aria-label="'Open ' + song.title + ' in Spotify'">
          <img v-if="song.image" :src="song.image" alt="">
          <span v-else aria-hidden="true">♫</span>
        </a>

        <div class="song-details">
          <a :href="song.url" class="song-title" target="_blank" rel="noopener noreferrer">{{ song.title }}</a>
          <small>{{ song.artist }}</small>
          <small class="song-genre">{{ song.genre }}</small>
          <a :href="song.url" class="spotify-link" target="_blank" rel="noopener noreferrer"><i class="bi bi-spotify" aria-hidden="true"></i> Open in Spotify</a>
        </div>
      </li>
    </ul>

    <RouterLink v-if="actionLink" :to="actionLink" class="recommendation-action">{{ actionText }}</RouterLink>
    <button v-if="userStore.isLoggedIn" class="refresh-button" type="button" :disabled="loading" @click="loadRecommendations">{{ loading ? 'Loading…' : 'Refresh recommendations' }}</button>
  </section>
</template>

<style scoped>
.recommendation-panel {
  position: absolute;
  top: 100px;
  right: 16px;
  z-index: 10;
  width: 340px;
  max-width: calc(100% - 32px);
  max-height: calc(100% - 250px);
  overflow-y: auto;
  padding: 20px;
  border: 1px solid #e0e5f0;
  border-radius: 18px;
  background-color: white;
  color: #14234b;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.recommendation-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recommendation-heading h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.close-button {
  border: none;
  background-color: transparent;
  color: #64708a;
  font-size: 28px;
  cursor: pointer;
}

.recommendation-subtitle {
  margin: 8px 0 18px;
  color: #64708a;
  font-size: 14px;
}

.recommendation-list {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

.recommendation-song {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px 0;
  border-bottom: 1px solid #e0e5f0;
}

.song-artwork {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background-color: #eee7ff;
  color: #513ba0;
  font-size: 24px;
  text-decoration: none;
}

.song-artwork img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.song-details {
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
}

.song-title {
  display: block;
  color: #14234b;
  font-weight: bold;
  text-decoration: none;
}

.song-title:hover {
  text-decoration: underline;
}

.song-details small {
  display: block;
  margin-top: 3px;
  color: #64708a;
}

.song-details .song-genre {
  color: #7054dc;
}

.spotify-link {
  display: inline-block;
  margin-top: 7px;
  color: #176b42;
  font-size: 12px;
}

.recommendation-action,
.refresh-button,
.recommendation-toggle {
  padding: 10px 15px;
  border: none;
  border-radius: 20px;
  background-color: #14234b;
  color: white;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
}

.recommendation-action,
.refresh-button {
  display: inline-block;
  margin-top: 15px;
}

.refresh-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.recommendation-toggle {
  position: absolute;
  top: 100px;
  right: 16px;
  z-index: 10;
}

.recommendation-error {
  color: #b42318;
}
</style>