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