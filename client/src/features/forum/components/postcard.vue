<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/services/supabase.js'
import { useSavedPosts } from '../composables/savedpost.js'
const { isSaved, toggleSave } = useSavedPosts()

const props = defineProps({
  post: { type: Object, required: true },
})

const saved = computed(() => isSaved(props.post.id))


const toDirection = (v) => (v === 1 ? 'up' : v === -1 ? 'down' : null)
const initialVote = ref(toDirection(props.post.my_vote?.[0]?.vote))
const userVote = ref(initialVote.value)

const voting = ref(false)

const upvotes = computed(
  () => props.post.upvotes + (userVote.value === 'up') - (initialVote.value === 'up'),
)
const downvotes = computed(
  () => props.post.downvotes + (userVote.value === 'down') - (initialVote.value === 'down'),
)


const postRoute = computed(() => ({
  name: 'post-detail',
  params: { id: props.post.id },
}))

async function requireUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}


onMounted(async () => {
  if (props.post.my_vote !== undefined) return

  const userId = await requireUserId()
  if (!userId) return

  const { data, error } = await supabase
    .from('post_votes')
    .select('vote')
    .eq('post_id', props.post.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Could not load vote:', error.message)
    return
  }

  initialVote.value = toDirection(data?.vote)
  userVote.value = initialVote.value
})

async function vote(direction) {
  if (voting.value) return
  voting.value = true

  try {
    const previous = userVote.value
    const next = previous === direction ? null : direction

    const userId = await requireUserId()
    if (!userId) return // TODO: prompt login

    userVote.value = next // optimistic update

    const { error } =
      next === null
        ? await supabase.from('post_votes').delete().eq('post_id', props.post.id).eq('user_id', userId)
        : await supabase
            .from('post_votes')
            .upsert(
              { post_id: props.post.id, user_id: userId, vote: next === 'up' ? 1 : -1 },
              { onConflict: 'post_id,user_id' },
            )

    if (error) {
      userVote.value = previous // roll back
      console.error('Vote failed:', error.message)
    }
  } finally {
    voting.value = false
  }
}
</script>

<template>
  <article class="card w-100">
    <div class="card-body">

      <div class="d-flex justify-content-between align-items-start mb-1">
        <p class="card-subtitle small text-body-secondary mb-0">
          <i class="bi bi-person-circle me-1"></i>{{ post.username }}
        </p>

        <button
          type="button"
          class="btn btn-sm btn-link p-0 position-relative z-2"
          :class="saved ? 'text-primary' : 'text-body-secondary'"
          @click="toggleSave(post.id)"
        >
          <i class="bi fs-5" :class="saved ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
        </button>
      </div>

      <h5 class="card-title">
        <RouterLink :to="postRoute" class="stretched-link text-reset text-decoration-none">
          {{ post.title }}
        </RouterLink>
      </h5>

      <p v-if="post.content" class="card-text">{{ post.content }}</p>

      <div class="d-flex flex-wrap gap-1 mb-3">
        <span v-for="tag in post.tags" :key="tag" class="badge rounded-pill text-bg-light border">
          #{{ tag }}
        </span>
      </div>


      <div class="d-flex align-items-center gap-3 small">
        <button
          type="button"
          class="btn btn-sm btn-link p-0 text-decoration-none position-relative z-2"
          :class="userVote === 'up' ? 'text-success fw-semibold' : 'text-body-secondary'"
          @click="vote('up')"
        >
          <i
            class="bi me-1 text-success"
            :class="userVote === 'up' ? 'bi-arrow-up-circle-fill' : 'bi-arrow-up-circle'"
          ></i>{{ upvotes }}
        </button>
        <button
          type="button"
          class="btn btn-sm btn-link p-0 text-decoration-none position-relative z-2"
          :class="userVote === 'down' ? 'text-danger fw-semibold' : 'text-body-secondary'"
          @click="vote('down')"
        >
          <i
            class="bi me-1 text-danger"
            :class="userVote === 'down' ? 'bi-arrow-down-circle-fill' : 'bi-arrow-down-circle'"
          ></i>{{ downvotes }}
        </button>
        <span class="text-body-secondary"><i class="bi bi-chat me-1"></i>{{ post.replies?.length ?? 0 }}</span>
      </div>
    </div>
  </article>
</template>