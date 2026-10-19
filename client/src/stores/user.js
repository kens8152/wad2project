import { defineStore } from 'pinia'
import { ref } from 'vue'


// Logged-in user. Mock data for now; will come from the backend later.
export const useUserStore = defineStore('user', () => {
  // state
  const user = ref({
    id: 'kit-tan',
    name: 'Kit Tan',
    initials: 'KT',
    preferredGenreIds: ['pop', 'mandopop', 'electronic'],
    location: { lat: 1.295, lng: 103.849, label: 'Bras Basah' },
  })
//after onboarding or updating, cause navbar name to be changed
  function updateDisplayName(name) {
    const cleanName = name.trim()

    if (!cleanName) return

    user.value.name = cleanName
    user.value.initials = cleanName.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()
  }
  try {
  const saved = JSON.parse(localStorage.getItem('riffle-preferences-demo-v1'))

  if (saved && typeof saved.displayName === 'string') {
    updateDisplayName(saved.displayName)
  }
  } catch (error) {
    console.error('Could not load the saved display name:', error)
  }
  return { user, updateDisplayName }
})
