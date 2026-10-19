import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/services/supabase.js'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const authReady = ref(false)

  // Keep the fields other pages expect
  const user = ref({
    id: '',
    name: 'Guest',
    initials: '',
    preferredGenreIds: [],
    location: { lat: 1.295, lng: 103.849, label: 'Bras Basah' }
  })

  function updateDisplayName(name) {
    const cleanName = name.trim()

    if (!cleanName || !isLoggedIn.value) return

    user.value.name = cleanName
    user.value.initials = cleanName.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()
  }

  function applySession(session) {
    const account = session ? session.user : null
    const accountChanged = user.value.id !== (account ? account.id : '')

    isLoggedIn.value = Boolean(account)

    if (accountChanged) {
      user.value.id = account ? account.id : ''
      user.value.name = 'Guest'
      user.value.initials = ''
      user.value.preferredGenreIds = []

      if (account) {
        updateDisplayName('Music fan')

        try {
          const saved = JSON.parse(localStorage.getItem('riffle-preferences-v1:' + account.id))

          if (saved && typeof saved.displayName === 'string') {
            updateDisplayName(saved.displayName)
          }
        } catch (error) {
          console.error('Could not load profile name:', error)
        }
      }
    }

    authReady.value = true
  }

  function startAuth() {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session)
    })

    return data.subscription
  }

  async function logout() {
    const { error } = await supabase.auth.signOut({ scope: 'local' })

    if (error) throw error
  }

  return { user, isLoggedIn, authReady, updateDisplayName, startAuth, logout }
})
