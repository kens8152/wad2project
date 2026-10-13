import { computed, ref } from 'vue'

// Mock signed-in user. Replace with the real auth/profile store once the
// onboarding + backend work lands; everything reads it through this composable.
const user = ref({
  id: 'kit-tan',
  name: 'Kit Tan',
  initials: 'KT',
  // Preferences come from onboarding ("Pick your genres").
  preferredGenreIds: ['pop', 'mandopop', 'electronic'],
  // Fixed demo location (Bras Basah / Fort Canning). A map or geolocation API
  // can overwrite this later.
  location: { lat: 1.295, lng: 103.849, label: 'Bras Basah' },
})

export function useCurrentUser() {
  return {
    user,
    firstName: computed(() => user.value.name.split(' ')[0]),
  }
}
