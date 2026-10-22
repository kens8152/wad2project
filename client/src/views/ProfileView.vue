<script setup>
import { ref, onMounted } from 'vue'

import { useUserStore } from '@/stores/user.js'
import LoginPrompt from '@/components/layout/LoginPrompt.vue'

import { searchSongs } from '@/services/spotifyApi'

import { supabase } from '@/services/supabase.js'

const userStore = useUserStore()

const storageKey = 'riffle-preferences-v1:' + userStore.user.id

const genres = [
  'Indie Rock',
  'Pop Music',
  'Contemporary Mandopop',
  'Electronic',
  'Hip-hop',
  'Traditional Ethnic Music'
]

const profile = ref(null)
const isEditing = ref(false)
const displayName = ref('')
const selectedGenres = ref([])
const favouriteSongs = ref('')

const songQuery = ref('')
const songResults = ref([])
const songLoading = ref(false)
const songError = ref('')

const errorMessage = ref('')
const successMessage = ref('')

const saving = ref(false)

// Load preferences saved during onboarding
onMounted(async () => {
  if (!userStore.isLoggedIn) return

  try {
    const { data, error } = await supabase.from('profiles').select('display_name, genres, favourite_songs').eq('id', userStore.user.id).maybeSingle()

    if (error) throw error

    if (!data) return

    profile.value = {
      displayName: data.display_name,
      genres: genres.filter(genre => data.genres.includes(genre)),
      favouriteSongs: data.favourite_songs
    }

    userStore.updateDisplayName(data.display_name)
  } catch (error) {
    errorMessage.value = 'Your preferences could not be loaded: ' + error.message
  }
})

// Copy saved preferences into the editing form
function startEditing() {
  displayName.value = profile.value.displayName
  selectedGenres.value = [...profile.value.genres]
  favouriteSongs.value = profile.value.favouriteSongs

  errorMessage.value = ''
  successMessage.value = ''

  songQuery.value = ''
  songResults.value = []
  songError.value = ''

  isEditing.value = true
}

// Leave the saved profile unchanged
function cancelEditing() {
  isEditing.value = false
  errorMessage.value = ''
}

//search songs
async function searchForSongs() {
  songError.value = ''
  songResults.value = []

  if (!songQuery.value.trim()) {
    songError.value = 'Please enter a song or artist.'
    return
  }

  if (!localStorage.getItem('access_token')) {
    songError.value = 'Please connect Spotify through onboarding first.'
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
  favouriteSongs.value = favouriteSongs.value.split('\n').filter(text => text !== getSongText(song)).join('\n')
}
// Validate and save changes
async function saveProfile() {
  if (!userStore.isLoggedIn || saving.value) return

  errorMessage.value = ''
  successMessage.value = ''

  if (!displayName.value.trim()) {
    errorMessage.value = 'Please enter your display name.'
    return
  }

  if (selectedGenres.value.length === 0) {
    errorMessage.value = 'Please select at least one genre.'
    return
  }

  saving.value = true

  const updatedProfile = {
    displayName: displayName.value.trim(),
    genres: [...selectedGenres.value],
    favouriteSongs: favouriteSongs.value.trim()
  }

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userStore.user.id,
      display_name: updatedProfile.displayName,
      genres: updatedProfile.genres,
      favourite_songs: updatedProfile.favouriteSongs,
      onboarding_completed: true
    }, { onConflict: 'id' })

    if (error) throw error

    userStore.updateDisplayName(updatedProfile.displayName)
    profile.value = updatedProfile
    isEditing.value = false
    successMessage.value = 'Your profile has been updated.'

    // Keep the navbar's current local copy in sync during migration
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedProfile))
    } catch (cacheError) {
      console.warn('Profile saved online, but local copy could not be updated:', cacheError)
    }
  } catch (error) {
    errorMessage.value = 'Your changes could not be saved: ' + error.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main v-if="userStore.isLoggedIn" class="profile-page">
    <header class="page-heading">
      <h1>My profile</h1>
      <p>View and update your music preferences.</p>
      <!-- Saved artists -->
      <RouterLink :to="{ name: 'saved-artists' }" class="btn btn-riffle">
        <i class="bi bi-bookmark-heart me-1"></i> Saved artists
      </RouterLink>
    </header>

    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

    <!-- No saved onboarding preferences -->
    <section v-if="!profile" class="profile-box text-center">
      <h2>Build your taste profile</h2>
      <p>Choose your favourite genres and songs to get started.</p>
      <RouterLink to="/onboarding" class="profile-button">Start onboarding</RouterLink>
    </section>

    <template v-else>
      <!-- View saved profile -->
      <section v-if="!isEditing" class="profile-box">
        <div class="profile-heading">
          <div>
            <h2>{{ profile.displayName }}</h2>
            <p>Your Riffle taste profile</p>
          </div>
          <button class="profile-button" type="button" @click="startEditing">Edit profile</button>
        </div>

        <hr>

        <div class="row">
          <section class="col-12 col-md-6 mb-3">
            <h3>Favourite genres</h3>
            <div class="genre-tags">
              <span v-for="genre in profile.genres" :key="genre" class="genre-tag">{{ genre }}</span>
            </div>
          </section>

          <section class="col-12 col-md-6 mb-3">
            <h3>Favourite songs</h3>
            <ul v-if="profile.favouriteSongs" class="song-list">
              <li v-for="(song, index) in profile.favouriteSongs.split('\n')" :key="index">{{ song }}</li>
            </ul>
            <p v-else>No favourite songs added yet.</p>
          </section>
        </div>
      </section>

      <!-- Edit preferences -->
      <form v-else class="profile-box" @submit.prevent="saveProfile">
        <h2>Edit your profile</h2>

        <div class="mb-4">
          <label for="profile-name">Display name</label>
          <input id="profile-name" v-model.trim="displayName" class="text-input" type="text" maxlength="50" required>
        </div>

        <div class="row">
          <section class="col-12 col-md-6 mb-3">
            <h3>Favourite genres</h3>
            <p>Select at least one genre.</p>
            <div class="genre-options">
              <label v-for="genre in genres" :key="genre" class="genre-option" :class="{ selected: selectedGenres.includes(genre) }">
                <input v-model="selectedGenres" type="checkbox" :value="genre">
                <span>{{ genre }}</span>
              </label>
            </div>
          </section>

          <section class="col-12 col-md-6 mb-3">
            <h3>Favourite songs</h3>

            <label for="profile-song-search">Search Spotify</label>
            <input id="profile-song-search" v-model="songQuery" class="text-input" type="text" placeholder="Enter a song or artist" @keydown.enter.prevent="searchForSongs">

            <button class="profile-button mt-2" type="button" :disabled="songLoading" @click="searchForSongs">{{ songLoading ? 'Searching…' : 'Search' }}</button>

            <p v-if="songError" class="error-message" role="alert">{{ songError }}</p>

            <ul class="list-unstyled mt-3">
              <li v-for="song in songResults" :key="song.id" class="mb-3">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <strong>{{ song.name }}</strong>
                    <div>{{ song.artists.map(artist => artist.name).join(', ') }}</div>
                  </div>
                  <button v-if="!isSongAdded(song)" class="profile-button" type="button" @click="addSong(song)">+ Add</button>
                  <button v-else class="cancel-button" type="button" @click="removeSong(song)">Remove</button>
                </div>
              </li>
            </ul>

            <label for="profile-songs">Selected songs — one per line</label>
            <textarea id="profile-songs" v-model.trim="favouriteSongs" class="text-input" rows="6"></textarea>
          </section>
        </div>

        <div class="actions">
          <button class="profile-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save changes' }}</button>
          <button class="cancel-button" type="button" :disabled="saving" @click="cancelEditing">Cancel</button>
        </div>
      </form>

      <div class="page-links">
        <RouterLink to="/discover">Explore artists</RouterLink>
        <RouterLink to="/onboarding">Return to onboarding</RouterLink>
      </div>
    </template>
  </main>
  <LoginPrompt v-else />
</template>


<style scoped>
.profile-page {
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
}

.page-heading p {
  color: #64708a;
}

.profile-box {
  padding: 25px;
  border: 1px solid #e0e5f0;
  border-radius: 15px;
  background-color: white;
}

.profile-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.profile-box h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.profile-box h3 {
  font-size: 18px;
  margin-bottom: 15px;
}

.profile-box p {
  color: #64708a;
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
  font-size: 16px;
  font-family: inherit;
}

.genre-tags,
.genre-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.genre-tag {
  padding: 8px 14px;
  border-radius: 25px;
  background-color: #eee7ff;
  color: #513ba0;
}

.genre-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid #d8deeb;
  border-radius: 25px;
  cursor: pointer;
}

.genre-option.selected {
  background-color: #eee7ff;
  border-color: #7054dc;
  color: #513ba0;
}

.song-list {
  padding-left: 20px;
}

.song-list li {
  margin-bottom: 10px;
}

.profile-button {
  display: inline-block;
  padding: 10px 22px;
  border: none;
  border-radius: 25px;
  background-color: #14234b;
  color: white;
  font-size: 16px;
  text-decoration: none;
  cursor: pointer;
}

.profile-button:hover {
  background-color: #304779;
}

.cancel-button {
  padding: 10px 22px;
  border: 1px solid #14234b;
  border-radius: 25px;
  background-color: white;
  color: #14234b;
  font-size: 16px;
  cursor: pointer;
}

.actions,
.page-links {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
}

.page-links {
  justify-content: center;
}

.error-message {
  color: #b42318;
}

.success-message {
  color: #18754a;
}
</style>
