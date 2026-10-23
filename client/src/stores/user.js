import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/services/supabase.js'

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false)
  const authReady = ref(false)

  const user = ref({
    id: '',
    name: 'Guest',
    initials: '',
    preferredGenreIds: [],
    location: { lat: 1.295, lng: 103.849, label: 'Bras Basah' }
  })

  let nameVersion = 0

  function updateDisplayName(name) {
    const cleanName = typeof name === 'string' ? name.trim() : ''

    if (!cleanName || !isLoggedIn.value) return

    nameVersion++
    user.value.name = cleanName
    user.value.initials = cleanName.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()
  }

  async function loadDisplayName(accountId, version) {
    if (user.value.id !== accountId || nameVersion !== version) return

    try {
      const { data, error } = await supabase.from('profiles').select('display_name').eq('id', accountId).maybeSingle()

      if (error) throw error

      // Ignore an old response if the account or display name has changed
      if (user.value.id !== accountId || nameVersion !== version) return

      if (data && typeof data.display_name === 'string') {
        updateDisplayName(data.display_name)
      }
    } catch (error) {
      console.error('Could not load the profile name:', error)
    }
  }

  function applySession(session) {
    const account = session ? session.user : null
    const accountChanged = user.value.id !== (account ? account.id : '')

    isLoggedIn.value = Boolean(account)

    if (accountChanged) {
      nameVersion++
      user.value.id = account ? account.id : ''
      user.value.name = 'Guest'
      user.value.initials = ''
      user.value.preferredGenreIds = []

      if (account) {
        updateDisplayName('Music fan')

        const accountId = account.id
        const version = nameVersion

        // schedules the profile request after the authentication callback finishes
        setTimeout(() => {
          loadDisplayName(accountId, version)
        }, 0)
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