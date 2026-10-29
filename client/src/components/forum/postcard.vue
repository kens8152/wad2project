<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useSavedPosts } from '../../composables/forum/savedpost'
import { useVote } from '../../composables/forum/usevote'
import { useUserStore } from '@/stores/user'
import { deletePost } from '@/services/forum/forumapi'
import VoteButtons from './votebuttons.vue'
import OptionsMenu from './optionsmenu.vue'

const props = defineProps({
  post: { type: Object, required: true },
})

const router = useRouter()
const userStore = useUserStore()


const forumPosts = inject('forumPosts', null)


const { isSaved, toggleSave } = useSavedPosts()
const saved = computed(() => isSaved(props.post.id))


const { userVote, upvotes, downvotes, vote } = useVote(() => props.post)

const maxUpvotes = inject('maxUpvotes', null)

const CURVE = 0.5
const heat = computed(() => {
  const up = Math.max(upvotes.value, 0)
  if (!up) return 0
  const top = Math.max(maxUpvotes ? maxUpvotes.value : 100, up)
  return Math.pow(up / top, CURVE)
})


const SHADES = ['#b9b0e0', '#a78bfa', '#8b5cf6', '#7c3aed', '#c026d3', '#e11d9a', '#ff4d6d']
const SHADES_RGB = SHADES.map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)))

function shadeAt(t) {
  const x = Math.min(1, Math.max(0, t)) * (SHADES_RGB.length - 1)
  const i = Math.min(SHADES_RGB.length - 2, Math.floor(x))
  const f = x - i
  return SHADES_RGB[i].map((c, k) => Math.round(c + (SHADES_RGB[i + 1][k] - c) * f))
}
const rgba = ([r, g, b], a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`


const borderStyle = computed(() => {
  const h = heat.value
  if (!h) return {}
  const to = shadeAt(h)
  return {
    '--from': rgba(shadeAt(h - 0.25)),
    '--to': rgba(to),
    '--glow': `0 0 ${(h * 22).toFixed(1)}px ${rgba(to, (h * 0.55).toFixed(2))}`,
  }
})

const postRoute = computed(() => ({
  name: 'post-detail',
  params: { id: props.post.id },
}))


const isOwner = computed(() => {
  const me = userStore.user?.id
  return !!me && props.post.user_id === me
})


function editPost() {
  router.push({ ...postRoute.value, query: { edit: '1' } })
}

const actionError = ref('')

async function removePost() {
  if (!window.confirm("Delete this post? Its replies will be deleted too. This can't be undone.")) return

  actionError.value = ''
  try {
    await deletePost(props.post.id)
    forumPosts?.remove(props.post.id)
  } catch (err) {
    console.error('Post delete failed:', err.message)
    actionError.value = 'Could not delete this post. Please try again.'
  }
}
</script>

<template>
  <article class="card post-card mx-3 border border-3" :style="borderStyle">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-1">
        <p class="card-subtitle small text-body-secondary mb-0">
          <i class="bi bi-person-circle me-1"></i>{{ post.username }}
        </p>

        <div class="d-flex align-items-center gap-2 position-relative z-2">
          <button
            type="button"
            class="btn btn-sm btn-link p-0"
            :class="saved ? 'text-primary' : 'text-body-secondary'"
            @click="toggleSave(post.id)"
          >
            <i class="bi fs-5" :class="saved ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
          </button>

          <OptionsMenu v-if="isOwner" @edit="editPost" @delete="removePost" />
        </div>
      </div>

      <p v-if="actionError" class="text-danger small mb-1">{{ actionError }}</p>

      <h5 class="card-title">
        <RouterLink :to="postRoute" class="stretched-link text-reset text-decoration-none">
          {{ post.title }}
        </RouterLink>
      </h5>

      <p v-if="post.content" class="card-text">{{ post.content }}</p>

      <div class="d-flex flex-wrap gap-1 mb-3">
        <span v-for="tag in post.tags" :key="tag" class="badge rounded-pill text-bg-light border">
          <i class="bi bi-music-note-beamed"></i> {{ tag }}
        </span>
      </div>

      <div class="d-flex align-items-center gap-3 small">
        <VoteButtons :up="upvotes" :down="downvotes" :current="userVote" @vote="vote" />
        <span class="text-body-secondary"><i class="bi bi-chat me-1"></i>{{ post.replies?.length ?? 0 }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.post-card {
  --from: var(--bs-border-color);
  --to: var(--bs-border-color);
  --glow: none;
  border-color: transparent !important;
  background:
    linear-gradient(var(--bs-card-bg, var(--bs-body-bg)), var(--bs-card-bg, var(--bs-body-bg))) padding-box,
    linear-gradient(135deg, var(--from), var(--to)) border-box;
  box-shadow: var(--glow);
  transition: box-shadow 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .post-card {
    transition: none;
  }
}
</style>