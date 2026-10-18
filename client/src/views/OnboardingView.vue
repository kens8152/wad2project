<script setup>

import {ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { searchSongs } from '@/services/spotifyApi'

import { useUserStore } from '@/stores/user.js'

const userStore = useUserStore()

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
const songQuery = ref('')
const songResults = ref([])
const songLoading = ref(false)
const songError = ref('')

const errorMessage = ref('')

const router = useRouter()
const storageKey = 'riffle-preferences-demo-v1'

onMounted(() => {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey))
        
        if (!saved) return 

        if (typeof saved.displayName === 'string') {
            userStore.updateDisplayName(saved.displayName)}

        displayName.value = 
            typeof saved.displayName === 'string' ? saved.displayName : ''
        
        favouriteSongs.value = 
            typeof saved.favouriteSongs === 'string' ? saved.favouriteSongs : ''

        selectedGenres.value = Array.isArray(saved.genres) ? genres.filter(genre => saved.genres.includes(genre)) : []
    } catch {
        errorMessage.value = 'Previous preferences could not be loaded. Please enter them again.'
    }
})

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

function savePreferences() {

  errorMessage.value = ''

  if (!displayName.value.trim()) {
    errorMessage.value = 'Please enter your display name.'
    return
  }

  if (selectedGenres.value.length === 0) {
    errorMessage.value = 'Please select at least one genre.'
    return
  }

  const profile = {
    displayName: displayName.value.trim(),
    genres: [...selectedGenres.value],
    favouriteSongs: favouriteSongs.value.trim()
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(profile))
    userStore.updateDisplayName(profile.displayName)
 } catch (error) {
  console.error('Could not save onboarding preferences:', error)
  errorMessage.value = 'Your preferences could not be saved: ' + error.message
  return
}

  router.push('/profile')
}
</script>



<template>
  <main class="onboarding-page">

    <header class="page-heading">
      <h1>Let’s build your taste profile</h1>
      <p>Pick your favourite genres and tell us which songs you enjoy.</p>

    </header>


    <div class="row">
      <div class="col-12 col-md-6 mb-3">
        <div class="connection-box spotify-box">
          <div>
            <h2>Connect Spotify</h2>
            <p>Use your music preferences to build your profile.</p>
          </div>

          <button class="connect-button" type="button" @click="router.push('/spotify-demo')">Connect</button>
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
        <label for="display-name">Display name</label>

        <input id="display-name" v-model.trim="displayName" class="text-input" type="text" placeholder="What should we call you?" maxlength="50" required>
      </div>

      <div class="row">
          <div class="col-12 col-md-6 mb-3">
          <section class="preference-box">
            <h2>Pick your genres</h2>
            <p>Choose at least one genre you enjoy.</p>

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
            <h2>Pick your songs</h2>
            <p>Tell us a few favourites. This is optional.</p>
            <!-- Search for songs -->
            <label for="song-search">Search Spotify</label>

            <input id="song-search" v-model="songQuery" class="text-input" type="text"placeholder="Enter a song or artist"@keydown.enter.prevent="searchForSongs">

            <button class="connect-button mt-2" type="button" :disabled="songLoading" @click="searchForSongs">
            {{ songLoading ? 'Searching…' : 'Search' }}
            </button>

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

            <label for="favourite-songs">
              Song titles and artists
            </label>

            <textarea id="favourite-songs" v-model.trim="favouriteSongs" class="text-input" rows="6" maxlength="500" placeholder="Enter one song per line." ></textarea>
            
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
        <button class="next-button" type="submit">
          Next →
        </button>
      </div>
    </form>
  </main>
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

.error-message {
  margin-top: 15px;
  color: #b42318;
}
</style>