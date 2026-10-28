<script setup>

import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { searchSongs } from '@/services/spotifyApi'

import { useUserStore } from '@/stores/user.js'
import LoginPrompt from '@/components/layout/LoginPrompt.vue'

import { supabase } from '@/services/supabase.js'

import { loginWithSpotify } from '@/services/spotifyAuth'


const userStore = useUserStore()

const saving = ref(false)

const hasSavedPreferences = ref(false)
const songFeedback = ref('')


const displayName = ref('')


const genres = [
    'Indie Rock',
    'Pop Music',
    'Contemporary Mandopop',
    'Electronic',
    'Hip-hop',
    'Traditional Ethnic Music'
]

const selectedGenres = ref([])
const favouriteSongs = ref('')

const selectedSongs = computed(() => {
  return favouriteSongs.value
    .split('\n')
    .map(song => song.trim())
    .filter(song => song !== '')
    .map(text => {
      const parts = text.split(' — ')

      return {
        text,
        title: parts[0],
        artist: parts.slice(1).join(' — ')
      }
    })
})

function removeSelectedSong(song) {
  favouriteSongs.value = selectedSongs.value
    .filter(item => item.text !== song.text)
    .map(item => item.text)
    .join('\n')
}

const songQuery = ref('')
const songResults = ref([])
const songLoading = ref(false)
const songError = ref('')

const errorMessage = ref('')

const router = useRouter()
const storageKey = 'riffle-preferences-v1:' + userStore.user.id
const draftKey = 'riffle-onboarding-draft:' + userStore.user.id
const connectingSpotify = ref(false)

onMounted(async () => {
  if (!userStore.isLoggedIn) return

  try {
    const { data, error } = await supabase.from('profiles').select('display_name, genres, favourite_songs').eq('id', userStore.user.id).maybeSingle()

    if (error) throw error

    if (data) {
      hasSavedPreferences.value = true
      displayName.value = data.display_name || ''
      selectedGenres.value = Array.isArray(data.genres) ? genres.filter(genre => data.genres.includes(genre)) : []
      favouriteSongs.value = data.favourite_songs || ''

      userStore.updateDisplayName(displayName.value)
    }
  } catch (error) {
    errorMessage.value = 'Your preferences could not be loaded: ' + error.message
  }

  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey))

    if (draft) {
      displayName.value = typeof draft.displayName === 'string' ? draft.displayName : ''
      selectedGenres.value = Array.isArray(draft.genres) ? genres.filter(genre => draft.genres.includes(genre)) : []
      favouriteSongs.value = typeof draft.favouriteSongs === 'string' ? draft.favouriteSongs : ''

      sessionStorage.removeItem(draftKey)
    }
  } catch {
    errorMessage.value = 'Your unfinished form could not be restored. Please check your preferences.'
  }
})

async function connectSpotify() {
  if (!userStore.isLoggedIn || connectingSpotify.value) return

  errorMessage.value = ''
  connectingSpotify.value = true

  try {
    const draft = {
      displayName: displayName.value,
      genres: [...selectedGenres.value],
      favouriteSongs: favouriteSongs.value
    }

    sessionStorage.setItem(draftKey, JSON.stringify(draft))
    await loginWithSpotify('/onboarding')
  } catch (error) {
    errorMessage.value = 'Spotify could not be opened: ' + error.message
  } finally {
    connectingSpotify.value = false
  }
}


async function searchForSongs() {
  songError.value = ''
  songResults.value = []

  if (!songQuery.value.trim()) {
    songError.value = 'Please enter a song or artist.'
    return
  }

  if (!localStorage.getItem('access_token')) {
    songError.value = 'Please connect Spotify first.'
    return
  }

  songLoading.value = true

  try {
    songResults.value = await searchSongs(songQuery.value.trim())

    if (songResults.value.length === 0) {
      songError.value = 'No songs found. Try another search.'
    }
  } catch {
    songError.value = 'Songs could not be loaded. Please try connecting Spotify again.'
  } finally {
    songLoading.value = false
  }
}

function getSongText(song) {
  return song.name + ' — ' + song.artists.map(artist => artist.name).join(', ')
}

function isSongAdded(song) {
  return favouriteSongs.value.split('\n').includes(getSongText(song))
}

function addSong(song) {
  if (isSongAdded(song)) return

  const songText = getSongText(song)

  if (favouriteSongs.value.trim()) {
    favouriteSongs.value = favouriteSongs.value.trim() + '\n' + songText
  } else {
    favouriteSongs.value = songText
  }
}

function removeSong(song) {
  const songs = favouriteSongs.value.split('\n')
  favouriteSongs.value = songs.filter(text => text !== getSongText(song)).join('\n')
}

async function savePreferences() {
  if (!userStore.isLoggedIn || saving.value) return

  errorMessage.value = ''

  if (!displayName.value.trim()) {
    errorMessage.value = 'Please enter your display name.'
    return
  }

  if (selectedGenres.value.length === 0) {
    errorMessage.value = 'Please select at least one genre.'
    return
  }

  saving.value = true

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userStore.user.id,
      display_name: displayName.value.trim(),
      genres: [...selectedGenres.value],
      favourite_songs: favouriteSongs.value.trim(),
      onboarding_completed: true
    }, { onConflict: 'id' })

    if (error) throw error

    userStore.updateDisplayName(displayName.value.trim())

    // Keep the existing profile page working during migration
    const profile = {
      displayName: displayName.value.trim(),
      genres: [...selectedGenres.value],
      favouriteSongs: favouriteSongs.value.trim()
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(profile))
    } catch (cacheError) {
      console.warn('Profile saved online, but local copy could not be updated:', cacheError)
    }

    await router.push('/profile')
  } catch (error) {
    errorMessage.value = 'Your preferences could not be saved: ' + error.message
  } finally {
    saving.value = false
  }
}
</script>



<template>
  <main v-if="userStore.isLoggedIn" class="onboarding-page">

    <header class="page-heading">
      <span class="page-eyebrow">
        <i class="bi bi-soundwave" aria-hidden="true"></i>
        YOUR MUSIC, YOUR RIFFLE
      </span>
      <h1>
        {{ hasSavedPreferences ? 'Fine-tune your taste' : 'Let’s find your sound' }}
      </h1>
      <p>
        A few favourites help shape your journey through local music.
        Pick the sounds that feel like you.
      </p>
    </header>


    <div class="row">
      <div class="col-12 col-md-6 mb-3">
        <div class="connection-box spotify-box">
          <div>
            <h2>Connect Spotify</h2>
            <p>Use your music preferences to build your profile.</p>
          </div>

          <button class="connect-button" type="button" :disabled="connectingSpotify || saving" @click="connectSpotify">{{ connectingSpotify ? 'Connecting…' : 'Connect Spotify' }}</button>
        </div>
      </div>

      <div class="col-12 col-md-6 mb-3">
        <div class="connection-box apple-box">
          <div>
            <h2>Connect Apple Music</h2>
            <p>Bring your favourite music into Riffle.</p>
          </div>

          <button class="connect-button" type="button" disabled>
            Coming soon
          </button>
        </div>
      </div>
    </div>

    <form @submit.prevent="savePreferences">

      <div class="name-section">
        <label for="display-name" class="section-label">
          <span class="section-number" aria-hidden="true">01</span>
          What should we call you?
        </label>

        <input id="display-name" v-model.trim="displayName" class="text-input" type="text" placeholder="What should we call you?" maxlength="50" required>
      </div>

      <div class="row">
          <div class="col-12 col-md-6 mb-3">
          <section class="preference-box">
            <div class="section-heading">
              <span class="section-number" aria-hidden="true">02</span>
              <div>
                <h2>Find your sound</h2>
                <p>Pick at least one genre. There’s room for every mood.</p>
              </div>
            </div>

            <div class="genre-options">
              <label v-for="genre in genres" :key="genre" class="genre-option" :class="{selected: selectedGenres.includes(genre)}">
                <input v-model="selectedGenres" type="checkbox" :value="genre">
                <span>{{ genre }}</span>
              </label>
            </div>

            <p class="selection-count">
              {{ selectedGenres.length }} selected
            </p>
          </section>
        </div>


        <div class="col-12 col-md-6 mb-3">
          <section class="preference-box">
            <div class="section-heading">
              <span class="section-number" aria-hidden="true">03</span>
              <div>
                <h2>Your on-repeat favourites</h2>
                <p>Add the songs you keep coming back to. This is optional.</p>
              </div>
            </div>
            <!-- Search for songs -->
            <label for="song-search" class="search-label"><i class="bi bi-search" aria-hidden="true"></i> Search Spotify</label>

            <div class="song-search-bar">
              <div class="song-search-input">
                <input id="song-search" v-model="songQuery" class="text-input" type="search" placeholder="Search a song or artist" @keydown.enter.prevent="searchForSongs">
              </div>
              <button class="connect-button search-button" type="button" :disabled="songLoading || saving || connectingSpotify" @click="searchForSongs">
                <span v-if="songLoading" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
                {{ songLoading ? 'Searching…' : 'Search' }}
              </button>
            </div>

            <p class="song-feedback" role="status" aria-live="polite">{{ songFeedback }}</p>

            <p v-if="songError" role="alert">
              {{ songError }}
            </p>

            <!-- Search results -->
            <ul class="list-unstyled mt-3">
              <li v-for="song in songResults" :key="song.id" class="mb-3">
                <div class="d-flex flex-wrap justify-content-between align-items-center">
                  <div>
                    <strong>{{ song.name }}</strong>
                    <div>{{ song.artists.map(artist => artist.name).join(', ') }}</div>
                  </div>
                  <button v-if="!isSongAdded(song)" class="connect-button" type="button" @click="addSong(song)">+ Add</button>
                  <button v-else class="connect-button" type="button" @click="removeSong(song)">Remove</button>
                </div>
              </li>
            </ul>

            <div class="selected-song-section">
              <h3>Your selected songs</h3>
              <p v-if="selectedSongs.length === 0">No songs added yet. Search above and click + Add.</p>
              <ul v-else class="selected-song-list">
                <li v-for="(song, index) in selectedSongs" :key="index" class="selected-song-row">
                  <span class="selected-song-icon" aria-hidden="true">♫</span>
                  <div class="selected-song-info">
                    <strong>{{ song.title }}</strong>
                    <small v-if="song.artist">{{ song.artist }}</small>
                  </div>
                  <button class="remove-song-button" type="button" :disabled="saving || connectingSpotify" :aria-label="'Remove ' + song.title" @click="removeSelectedSong(song)">Remove</button>
                </li>
              </ul>
              <p class="selected-song-count">{{ selectedSongs.length }} songs added</p>
            </div>
            
          </section>
        </div>
      </div>


      <section class="taste-summary">
        <div>
          <h2>Your taste profile</h2>
          <p>Updates as you pick your genres.</p>
        </div>

        <p v-if="selectedGenres.length === 0">
          No genres selected yet.
        </p>

        <div v-else class="selected-genres">
          <span v-for="genre in selectedGenres" :key="genre" class="genre-tag">
            {{ genre }}
          </span>
        </div>
      </section>

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>


    <div class="actions">
      <button class="next-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Next →' }}</button>
    </div>
    </form>
  </main>
  <LoginPrompt v-else />
</template>

<style scoped>

.onboarding-page {
  width: 90%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 35px 0;
  color: #14234b;
  font-size: 16px;
}


.page-heading {
  text-align: center;
  margin-bottom: 25px;
}

.page-heading h1 {
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 8px;
}

.page-heading p {
  color: #64708a;
}


.connection-box {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  height: 100%;
  padding: 20px;
  border: 1px solid #e0e5f0;
  border-radius: 15px;
}

.spotify-box {
  background-color: #edfaf5;
}

.apple-box {
  background-color: #fff0f7;
}

.connection-box h2 {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.connection-box p {
  font-size: 13px;
  margin: 0;
  color: #64708a;
}

.connect-button {
  padding: 9px 18px;
  border: none;
  border-radius: 25px;
  background-color: #14234b;
  color: white;
  font-size: 13px;
}

.connect-button:disabled {
  opacity: 0.6;
}


.name-section {
  margin: 10px 0 20px;
}

.name-section label {
  font-weight: bold;
}


.preference-box {
  height: 100%;
  padding: 20px;
  border: 1px solid #e0e5f0;
  border-radius: 15px;
  background-color: white;
}

.preference-box h2 {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 6px;
}

.preference-box p {
  color: #64708a;
  font-size: 14px;
}


.genre-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.genre-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid #d8deeb;
  border-radius: 25px;
  background-color: white;
  font-size: 14px;
  cursor: pointer;
}

.genre-option:hover {
  background-color: #f5f0ff;
}

.genre-option.selected {
  background-color: #eee7ff;
  border-color: #7054dc;
  color: #513ba0;
}

.selection-count {
  margin-top: 18px;
  margin-bottom: 0;
}

.text-input {
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #d8deeb;
  border-radius: 10px;
  background-color: #f8f9fc;
  color: #14234b;
  font-size: 15px;
  font-family: inherit;
}


.taste-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-top: 5px;
  padding: 20px;
  border: 1px solid #e0e5f0;
  border-radius: 15px;
  background-color: #f3efff;
}

.taste-summary h2 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
}

.taste-summary p {
  font-size: 13px;
  margin: 0;
  color: #64708a;
}

.selected-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.genre-tag {
  padding: 8px 12px;
  border: 1px solid #e0e5f0;
  border-radius: 25px;
  background-color: white;
  font-size: 13px;
}


.actions {
  text-align: center;
  margin-top: 25px;
}

.next-button {
  padding: 12px 40px;
  border: none;
  border-radius: 25px;
  background-color: #14234b;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.next-button:hover {
  background-color: #304779;
}

.selected-song-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #e0e5f0;
}

.selected-song-section h3 {
  font-size: 18px;
  margin-bottom: 15px;
}

.selected-song-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.selected-song-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eef0f5;
}

.selected-song-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: #eee7ff;
  color: #513ba0;
  font-size: 24px;
}

.selected-song-info {
  flex: 1;
  min-width: 120px;
}

.selected-song-info strong {
  display: block;
  font-size: 14px;
}

.selected-song-info small {
  display: block;
  margin-top: 4px;
  color: #64708a;
}

.remove-song-button {
  padding: 8px 14px;
  border: 1px solid #d8deeb;
  border-radius: 20px;
  background-color: white;
  color: #14234b;
  cursor: pointer;
}

.remove-song-button:hover {
  background-color: #f3efff;
}

.remove-song-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.selected-song-count {
  margin-top: 15px;
  margin-bottom: 0;
  color: #64708a;
  font-size: 14px;
}

.error-message {
  margin-top: 15px;
  color: #b42318;
}

/* Consistent page width and flexible spacing */
.onboarding-page {
  width: calc(100% - 32px);
  max-width: 1100px;
  padding: clamp(24px, 4vw, 40px) 0;
}

.page-heading h1 {
  font-size: clamp(25px, 4vw, 34px);
  line-height: 1.25;
}

.page-heading p {
  line-height: 1.6;
}

/* Stop the genre card stretching to the song card's height */
form > .row {
  align-items: flex-start;
}

.preference-box {
  height: auto;
  padding: clamp(18px, 2.5vw, 28px);
}

/* Allow long genre names to wrap */
.genre-option {
  max-width: 100%;
  min-height: 44px;
}

.genre-option input {
  flex-shrink: 0;
}

.genre-option span {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* Keep song title, artist and Remove button inside the card */
.selected-song-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.selected-song-icon {
  width: 40px;
  height: 40px;
}

.selected-song-info {
  min-width: 0;
}

.selected-song-info strong,
.selected-song-info small {
  overflow-wrap: anywhere;
}

.text-input {
  min-height: 48px;
  font-size: 16px;
}

.connect-button,
.remove-song-button,
.next-button {
  min-height: 44px;
}

.text-input:focus-visible,
button:focus-visible {
  outline: 3px solid #7054dc;
  outline-offset: 3px;
}

.next-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Stack both connection cards and preference cards below 992px */
@media (max-width: 991.98px) {
  .onboarding-page > .row > .col-md-6,
  form > .row > .col-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

@media (max-width: 575.98px) {
  .page-heading {
    text-align: left;
  }

  .connection-box {
    align-items: flex-start;
    padding: 18px;
  }

  .connection-box > div {
    width: 100%;
  }

  .connection-box .connect-button {
    width: 100%;
  }

  .taste-summary {
    flex-direction: column;
    align-items: flex-start;
    padding: 18px;
  }

  .selected-genres {
    width: 100%;
  }

  .genre-tag {
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  .next-button {
    width: 100%;
  }

  .remove-song-button {
    padding: 8px 10px;
    font-size: 13px;
  }
}

.search-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.song-search-bar {
  display: flex;
  align-items: stretch;
  gap: 16px;
}

.song-search-input {
  flex: 1;
  min-width: 0;
}

.song-search-input .text-input {
  margin: 0;
  padding-left: 14px;
}

.search-button {
  margin: 0;
}

@media (max-width: 575.98px) {
  .song-search-bar {
    flex-direction: column;
    gap: 14px;
  }

  .search-button {
    width: 100%;
  }
}
</style>