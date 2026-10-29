import { ref, computed, watch, toValue } from 'vue'
import { supabase } from '@/services/supabase.js'

const toDirection = (v) => (v === 1 ? 'up' : v === -1 ? 'down' : null)

async function requireUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function useVote(source, { table = 'post_votes', idColumn = 'post_id' } = {}) {
  const getItem = () => toValue(source)

  const initialVote = ref(null)
  const userVote = ref(null)
  const busy = ref(false)

  const upvotes = computed(() => {
    const item = getItem()
    if (!item) return 0
    return (item.upvotes ?? 0) + (userVote.value === 'up' ? 1 : 0) - (initialVote.value === 'up' ? 1 : 0)
  })
  const downvotes = computed(() => {
    const item = getItem()
    if (!item) return 0
    return (item.downvotes ?? 0) + (userVote.value === 'down' ? 1 : 0) - (initialVote.value === 'down' ? 1 : 0)
  })

  async function seed(item) {
    initialVote.value = toDirection(item.my_vote?.[0]?.vote)
    userVote.value = initialVote.value
    if (item.my_vote !== undefined) return

    const userId = await requireUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from(table)
      .select('vote')
      .eq(idColumn, item.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Could not load vote:', error.message)
      return
    }
    if (getItem()?.id !== item.id) return 

    initialVote.value = toDirection(data?.vote)
    userVote.value = initialVote.value
  }

  watch(
    () => getItem()?.id,
    () => {
      const item = getItem()
      if (item) seed(item)
    },
    { immediate: true },
  )

  async function vote(direction) {
    const item = getItem()
    if (!item || busy.value) return
    busy.value = true

    try {
      const previous = userVote.value
      const next = previous === direction ? null : direction

      const userId = await requireUserId()
      if (!userId) return 

      userVote.value = next 

      const { error } =
        next === null
          ? await supabase.from(table).delete().eq(idColumn, item.id).eq('user_id', userId)
          : await supabase
              .from(table)
              .upsert(
                { [idColumn]: item.id, user_id: userId, vote: next === 'up' ? 1 : -1 },
                { onConflict: `${idColumn},user_id` },
              )

      if (error) {
        userVote.value = previous 
        console.error('Vote failed:', error.message)
      }
    } finally {
      busy.value = false
    }
  }

  return { userVote, upvotes, downvotes, vote }
}