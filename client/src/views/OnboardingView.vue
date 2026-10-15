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


        <section class="preference-section">
          <h2>Favourite songs</h2>
          <p>Tell us a few favourites. This section is optional.</p>

          <label for="onboarding-songs">
            Song titles and artists
          </label>

          <textarea id="onboarding-songs" v-model.trim="favouriteSongs" class="text-input" rows="6" maxlength="500" placeholder="Enter one song per line."></textarea>
        </section>
      </div>


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

      <p v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </p>


      <div class="actions">
        <button class="primary-button" type="submit">
          Save and view profile
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>

.onboarding-page {
  width: 90%;
  margin: 0 auto;
  padding: 30px 0;
  color: #14234b;
  font-size: 16px;
}


.page-heading {
  text-align: center;
  margin-bottom: 30px;
}

.page-heading h1 {
  font-size: 32px;
  margin-bottom: 10px;
}

.page-heading p {
  color: #64708a;
}


.name-section {
  margin-bottom: 25px;
}


.name-section label,
.preference-section label {
  display: block;
  font-weight: bold;
}

.text-input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #c4ccdc;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  color: #14234b;
  background-color: white;
}


.preferences-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}


.preference-section {
  box-sizing: border-box;
  flex: 1;
  min-width: 250px;
  margin: 0;
  padding: 20px;
  border: 1px solid #c4ccdc;
  border-radius: 15px;
  background-color: white;
}


.preference-section legend {
  float: none;
  width: auto;
  padding: 0 5px;
}

.preference-section legend,
.preference-section h2,
.taste-summary h2 {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 12px;
}

.preference-section > p {
  color: #64708a;
}


.genre-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}


.genre-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #c4ccdc;
  border-radius: 10px;
  background-color: white;
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
  margin-top: 15px;
  font-size: 14px;
}


.taste-summary {
  margin-top: 25px;
  padding: 20px;
  border-radius: 15px;
  background-color: #f2edff;
}

.genre-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style-type: none;
}

.genre-tags li {
  padding: 8px 14px;
  border-radius: 20px;
  background-color: white;
}

.actions {
  margin-top: 25px;
  text-align: center;
}

.primary-button {
  padding: 12px 25px;
  border: none;
  border-radius: 25px;
  background-color: #14234b;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.primary-button:hover {
  background-color: #304779;
}


.error-message {
  margin-top: 15px;
  color: #b42318;
}
</style>