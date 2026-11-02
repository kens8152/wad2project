import { ref, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { fetchSavedPostIds, savePost, unsavePost } from '../../services/forum/forumapi.js'


const savedIds = ref(new Set())
let loadedFor = null

export function useSavedPosts() {
  const userStore = useUserStore()

  const isSaved = (postId) => savedIds.value.has(postId)

  async function loadSaved() {
    const userId = userStore.user?.id
    loadedFor = userId
    if (!userStore.isLoggedIn || !userId) {
      savedIds.value = new Set()
      return
    }
    try {
      const ids = await fetchSavedPostIds()
      if (loadedFor === userId) savedIds.value = new Set(ids)
    } catch (e) {
      console.error(e)
    }
  }

  watch(
    () => (userStore.isLoggedIn ? userStore.user?.id : null),
    (userId) => {
      if (userId !== loadedFor) loadSaved()
    },
    { immediate: true },
  )

  async function toggleSave(postId) {
    if (!userStore.isLoggedIn) return

    const wasSaved = isSaved(postId)
    setSaved(postId, !wasSaved)

    try {
      if (wasSaved) await unsavePost(postId)
      else await savePost(postId)
    } catch (e) {
      console.error(e)
      setSaved(postId, wasSaved)
    }
  }

  function setSaved(postId, saved) {
    const next = new Set(savedIds.value)
    if (saved) next.add(postId)
    else next.delete(postId)
    savedIds.value = next
  }

  return { isSaved, loadSaved, toggleSave }
}
