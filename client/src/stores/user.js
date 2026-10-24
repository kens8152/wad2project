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

  // Your real name lives in your Supabase profile, so it is the same on every device.
  // This runs whenever the page loads with someone logged in, so the navbar never has to wait for the Profile page.
  async function loadDisplayName(account) {
    const cacheKey = 'riffle-preferences-v1:' + account.id

    try {
      const { data, error } = await supabase.from('profiles').select('display_name').eq('id', account.id).maybeSingle()

      if (error) throw error

      // ignore the answer if somebody else has logged in (or out) in the meantime
      if (user.value.id !== account.id) return

      if (data && data.display_name) {
        updateDisplayName(data.display_name)

        // remember the name in this browser, so next time it shows straight away
        try {
          const saved = JSON.parse(localStorage.getItem(cacheKey)) || {}
          saved.displayName = data.display_name
          localStorage.setItem(cacheKey, JSON.stringify(saved))
        } catch (cacheError) {
          console.warn('Could not remember the profile name:', cacheError)
        }
        return
      }
    } catch (error) {
      console.error('Could not load profile name:', error)
    }

    // no saved profile name yet (for example before onboarding): use the start of the email address
    if (user.value.id === account.id && !user.value.name && account.email) {
      updateDisplayName(account.email.split('@')[0])
    }
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
        // no placeholder name: the navbar stays blank until the real name is known
        user.value.name = ''

        // this browser may already remember the name, which shows it straight away
        try {
          const saved = JSON.parse(localStorage.getItem('riffle-preferences-v1:' + account.id))

          if (saved && typeof saved.displayName === 'string') {
            updateDisplayName(saved.displayName)
          }
        } catch (error) {
          console.error('Could not load profile name:', error)
        }

        // then ask Supabase (a short delay, because Supabase should not be called inside this callback)
        setTimeout(() => loadDisplayName(account), 0)
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
