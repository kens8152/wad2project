import { ref, computed, watch, toValue } from 'vue'
import { supabase } from '@/services/supabase.js'

const toDirection = (v) => (v === 1 ? 'up' : v === -1 ? 'down' : null)

async function requireUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function useVote(source, { table = 'post_votes', idColumn = 'post_id', countsTable = 'posts' } = {}) {
  const getItem = () => toValue(source)

  const initialVote = ref(null)
  const userVote = ref(null)
  const baseUp = ref(0)
  const baseDown = ref(0)
  const busy = ref(false)

  const count = (base, direction) =>
    Math.max(0, base + (userVote.value === direction ? 1 : 0) - (initialVote.value === direction ? 1 : 0))

  const upvotes = computed(() => (getItem() ? count(baseUp.value, 'up') : 0))
  const downvotes = computed(() => (getItem() ? count(baseDown.value, 'down') : 0))

  function setBase(counts, savedVote) {
    baseUp.value = counts.upvotes ?? 0
    baseDown.value = counts.downvotes ?? 0
    initialVote.value = savedVote
  }

  async function seed(item) {
    setBase(item, toDirection(item.my_vote?.[0]?.vote))
    userVote.value = initialVote.value
    if (item.my_vote !== undefined) return

    const userId = await requireUserId()
    if (!userId) return

    const { data, error } = await supabase
      .from(countsTable)
      .select(`upvotes, downvotes, my_vote:${table}(vote)`)
      .eq('id', item.id)
      .maybeSingle()

    if (error) {
      console.error('Could not load vote:', error.message)
      return
    }
    if (!data || getItem()?.id !== item.id || busy.value) return

    setBase(data, toDirection(data.my_vote?.[0]?.vote))
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

  watch(
    () => [getItem()?.upvotes, getItem()?.downvotes],
    () => {
      const item = getItem()
      if (item && !busy.value) setBase(item, userVote.value)
    },
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