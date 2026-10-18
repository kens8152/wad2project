<script setup>
import { ref, onMounted } from 'vue'

const storageKey = 'riffle-preferences-demo-v1'

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
const errorMessage = ref('')
const successMessage = ref('')

// Load preferences saved during onboarding
onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))

    if (!saved) return

    profile.value = {
      displayName: typeof saved.displayName === 'string' ? saved.displayName : '',
      genres: Array.isArray(saved.genres) ? genres.filter(genre => saved.genres.includes(genre)) : [],
      favouriteSongs: typeof saved.favouriteSongs === 'string' ? saved.favouriteSongs : ''
    }
  } catch {
    errorMessage.value = 'Your preferences could not be loaded.'
  }
})

// Copy saved preferences into the editing form
function startEditing() {
  displayName.value = profile.value.displayName
  selectedGenres.value = [...profile.value.genres]
  favouriteSongs.value = profile.value.favouriteSongs

  errorMessage.value = ''
  successMessage.value = ''
  isEditing.value = true
}

// Leave the saved profile unchanged
function cancelEditing() {
  isEditing.value = false
  errorMessage.value = ''
}

// Validate and save changes
function saveProfile() {
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

  const updatedProfile = {
    displayName: displayName.value.trim(),
    genres: [...selectedGenres.value],
    favouriteSongs: favouriteSongs.value.trim()
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(updatedProfile))
    profile.value = updatedProfile
    isEditing.value = false
    successMessage.value = 'Your profile has been updated.'
  } catch {
    errorMessage.value = 'Your changes could not be saved. Please try again.'
  }
}
</script>
