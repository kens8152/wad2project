<script setup>

import {ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

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

const errorMessage = ref('')

const router = useRouter()
const storageKey = 'riffle-preferences-demo-v1'

onMounted(() => {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey))
        
        if (!saved) return 

        displayName.value = 
            typeof saved.displayName === 'string' ? saved.displayName : ''
        
        favouriteSongs.value = 
            typeof saved.favouriteSongs === 'string' ? saved.favouriteSongs : ''

        selectedGenres.value = Array.isArray(saved.genres) ? genres.filter(genre => saved.genres.includes(genre)) : []
    } catch {
        errorMessage.value = 'Previous preferences could not be loaded. Please enter them again.'
    }
})

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
  } catch {
    errorMessage.value = 'Your browser could not save these preferences.'
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