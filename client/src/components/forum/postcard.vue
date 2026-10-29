<script setup>
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useSavedPosts } from '../../composables/forum/savedpost' 
import { useVote } from '../../composables/forum/usevote'
import { useUserStore } from '@/stores/user'
import { deletePost } from '../../services/forum/forumapi.js'
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
  <article class="card mx-3">
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
          #{{ tag }}
        </span>
      </div>

      <div class="d-flex align-items-center gap-3 small">
        <VoteButtons :up="upvotes" :down="downvotes" :current="userVote" @vote="vote" />
        <span class="text-body-secondary"><i class="bi bi-chat me-1"></i>{{ post.replies?.length ?? 0 }}</span>
      </div>
    </div>
  </article>
</template>