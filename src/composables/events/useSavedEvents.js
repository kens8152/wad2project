import { computed, ref, watch, effectScope } from 'vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/composables/useToast'

// The events the logged-in user has saved with the heart button. Shared across the app (module-level) and
// remembered in localStorage, with a separate list for each user.
const saved = ref(new Set()) // a Set of event ids (a Set holds each id at most once, and has() is quick)
const savedIds = computed(() => [...saved.value]) // the same ids as a normal array, for other pages to list

// An effectScope lets a watcher live outside any one component. Without it, the watcher below would be
// stopped when the first component that called this composable went away.
const savedEventsScope = effectScope(true)
let started = false // the watcher is only set up once
let currentUserId = ''

// one key per user, so two accounts on the same browser do not share saved events
function storageKey(userId) {
  return 'riffle.savedEvents:' + userId
}

// read this user's saved ids from localStorage (an empty Set if there are none, or the data is broken)
function read(userId) {
  if (!userId) return new Set()

  try {
    const values = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]')
    return new Set(Array.isArray(values) ? values : [])
  } catch {
    return new Set()
  }
}

// write the current list back to localStorage
function persist() {
  if (!currentUserId) return

  try {
    localStorage.setItem(storageKey(currentUserId), JSON.stringify([...saved.value]))
  } catch {
    // Keep the in-memory list if browser storage is unavailable.
  }
}

export function useSavedEvents() {
  const userStore = useUserStore()

  if (!started) {
    started = true

    savedEventsScope.run(() => {
      // whenever the logged-in user changes (log in, log out, switch account), load THAT user's saved events
      // (`immediate` runs it once straight away; `flush: 'sync'` runs it without waiting for the next render)
      watch(() => userStore.user.id, (userId) => {
        currentUserId = userId || ''
        saved.value = read(currentUserId)
      }, { immediate: true, flush: 'sync' })
    })
  }

  const isSaved = (id) => saved.value.has(id)

  // Save or un-save an event. Returns true if it is saved now, false if it is not.
  function toggle(id) {
    if (!userStore.isLoggedIn || !userStore.user.id) {
      toast('Please log in to save events.') // saving needs an account, so there is somewhere to keep the list
      return false
    }

    const next = new Set(saved.value) // work on a copy
    // delete() gives true if the id was there (and removes it). So `!` means "it was NOT saved before", i.e. now saved
    const nowSaved = !next.delete(id)

    if (nowSaved) next.add(id)

    saved.value = next // replacing the whole Set (not changing it) makes sure Vue notices
    persist()
    return nowSaved
  }

  return { isSaved, savedIds, toggle }
}