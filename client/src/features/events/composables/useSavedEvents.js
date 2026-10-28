import { computed, ref, watch, effectScope } from 'vue'
import { useUserStore } from '@/stores/user'
import { toast } from '@/composables/useToast'

const saved = ref(new Set())
const savedIds = computed(() => [...saved.value])

const savedEventsScope = effectScope(true)
let started = false
let currentUserId = ''

function storageKey(userId) {
  return 'riffle.savedEvents:' + userId
}

function read(userId) {
  if (!userId) return new Set()

  try {
    const values = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]')
    return new Set(Array.isArray(values) ? values : [])
  } catch {
    return new Set()
  }
}

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
      watch(() => userStore.user.id, (userId) => {
        currentUserId = userId || ''
        saved.value = read(currentUserId)
      }, { immediate: true, flush: 'sync' })
    })
  }

  const isSaved = (id) => saved.value.has(id)

  function toggle(id) {
    if (!userStore.isLoggedIn || !userStore.user.id) {
      toast('Please log in to save events.')
      return false
    }

    const next = new Set(saved.value)
    const nowSaved = !next.delete(id)

    if (nowSaved) next.add(id)

    saved.value = next
    persist()
    return nowSaved
  }

  return { isSaved, savedIds, toggle }
}