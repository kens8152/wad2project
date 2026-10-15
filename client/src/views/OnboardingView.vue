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
  <section class="onboarding-page">
    <header class="page-heading">
      <h1>Let’s build your taste profile</h1>
      <p>Choose your favourite genres and songs to get started.</p>
    </header>

    <form @submit.prevent="savePreferences">

      <div class="name-section">
        <label for="onboarding-name">Display name</label>

        <input id="onboarding-name" v-model.trim="displayName" class="text-input" type="text" placeholder="What should we call you?" maxlength="50" required>
      </div>


      <div class="preferences-layout">
        <fieldset class="preference-section">
          <legend>Pick your genres</legend>
          <p>Select at least one genre you enjoy.</p>

          <div class="genre-grid">
            <label v-for="genre in genres" :key="genre" class="genre-option" :class="{ selected: selectedGenres.includes(genre) }">
            
              <input v-model="selectedGenres" type="checkbox":value="genre">
              

              <span>{{ genre }}</span>
            </label>
          </div>

          <p class="selection-count">
            {{ selectedGenres.length }} selected
          </p>
        </fieldset>

        <!-- Optional favourite songs -->
        <section class="preference-section">
          <h2>Favourite songs</h2>
          <p>Tell us a few favourites. This section is optional.</p>

          <label for="onboarding-songs">
            Song titles and artists
          </label>

          <textarea id="onboarding-songs" v-model.trim="favouriteSongs" class="text-input" rows="6" maxlength="500" placeholder="Enter one song per line."></textarea>
        </section>
      </div>

      <!-- Show the genres currently selected -->
      <section class="taste-summary">
        <h2>Your selected genres</h2>

        <p v-if="selectedGenres.length === 0">
          Your choices will appear here.
        </p>

        <ul v-else class="genre-tags">
          <li v-for="genre in selectedGenres" :key="genre">
            {{ genre }}
          </li>
        </ul>
      </section>

      <!-- Show errors from your script -->
      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>

      <!-- Validate, save and navigate to /profile -->
      <div class="actions">
        <button class="primary-button" type="submit">
          Save and view profile
        </button>
      </div>
    </form>
  </section>
</template>