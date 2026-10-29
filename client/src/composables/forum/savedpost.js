import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { fetchSavedPostIds, savePost, unsavePost } from '../../services/forum/forumapi.js'


const savedIds = ref(new Set())

export function useSavedPosts() {
  const userStore = useUserStore()

  const isSaved = (postId) => savedIds.value.has(postId)

  async function loadSaved() {
    try {
      savedIds.value = new Set(await fetchSavedPostIds())
    } catch (e) {
      console.error(e)
    }
  }

  async function toggleSave(postId) {
    if (!userStore.user) return 

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