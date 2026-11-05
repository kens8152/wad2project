<script setup>
import { ref, computed, watch, provide, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchPost, fetchReplies, createReply, updateReply, deleteReply, updatePost, deletePost, fetchTags, uploadPostImage, deletePostImages } from '@/services/forum/forumapi.js'
import { catalog, loadCatalog, getArtist, getEvent } from '@/services/forum/forumlinks.js'
import { useUserStore } from '@/stores/user'
import { useSavedPosts } from '../../composables/forum/savedpost.js'
import { useVote } from '../../composables/forum/usevote.js'
import { tagStyle } from '../../composables/forum/tagColor.js'
import { useTrendingTags } from '../../composables/forum/trendingTags.js'
import VoteButtons from '../../components/forum/votebuttons.vue'
import ReplyItem from '../../components/forum/replyitem.vue'
import SaveButton from '../../components/forum/savebutton.vue'
import OptionsMenu from '../../components/forum/optionsmenu.vue'
import PostImages from '../../components/forum/postimages.vue'
import PostLinksField from '../../components/forum/postlinkfields.vue'
import PhotoPicker from '../../components/forum/photopicker.vue'
import SongPicker from '../../components/forum/songpicker.vue'
import SongEmbed from '../../components/forum/songembed.vue'
import PostLinkedPanel from '../../components/forum/postlinkedpanel.vue'

const route = useRoute()
const router = useRouter()

const post = ref(null)
const replies = ref([])
const loading = ref(true)
const errorMessage = ref('')
const repliesSection = ref(null)
const repliesError = ref('')

const userStore = useUserStore()

const forumPosts = inject('forumPosts', null)

function syncReplies() {
  if (post.value) forumPosts?.patch(post.value.id, { replies: replies.value })
}

const { isSaved, toggleSave } = useSavedPosts()
const saved = computed(() => (post.value ? isSaved(post.value.id) : false))
const { userVote, upvotes, downvotes, vote } = useVote(post)
const isTrending = useTrendingTags()

function goBack() {
  if (router.options.history.state.back) router.back()
  else router.push({ name: 'forum' })
}

const currentUserId = computed(() => userStore.user?.id ?? null)
const isPostOwner = computed(
  () => !!currentUserId.value && post.value?.user_id === currentUserId.value,
)

const linkedArtists = computed(() => (post.value?.artist_ids ?? []).map((id) => getArtist(id)).filter(Boolean))
const linkedEvents = computed(() => (post.value?.event_ids ?? []).map((id) => getEvent(id)).filter(Boolean))
const hasLinks = computed(() => {
  const saved = (post.value?.artist_ids?.length ?? 0) + (post.value?.event_ids?.length ?? 0)
  if (!saved) return false
  return !catalog.loaded || linkedArtists.value.length > 0 || linkedEvents.value.length > 0
})

loadCatalog()

async function load(id) {
  loading.value = true
  errorMessage.value = ''
  repliesError.value = ''
  post.value = null
  replies.value = []
  cancelEditPost()

  try {
    const postData = await fetchPost(id)
    if (!postData) {
      errorMessage.value = 'This post does not exist or was removed.'
      return
    }

    try {
      replies.value = await fetchReplies(id)
    } catch (err) {
      repliesError.value = 'Could not load replies.'
      console.error('Could not load replies:', err.message)
    }

    post.value = postData

    if (route.query.edit && isPostOwner.value) {
      startEditPost()
      router.replace({ query: {} })
    }
  } catch (err) {
    errorMessage.value = 'Could not load this post.'
    console.error(err.message)
  } finally {
    loading.value = false
  }
}

const editingPost = ref(false)
const postDraft = ref({ title: '', content: '', tags: [], links: { events: [], artists: [] }, photos: [], song: null })
const postSaving = ref(false)
const postActionError = ref('')

const allTags = ref([])
const tagOptions = computed(() => [...new Set([...allTags.value, ...postDraft.value.tags])])

async function loadTagOptions() {
  if (allTags.value.length) return
  try {
    allTags.value = (await fetchTags()).map((t) => t.name)
  } catch (err) {
    console.error('Could not load tags:', err.message)
  }
}

function toggleTag(name) {
  const tags = postDraft.value.tags
  postDraft.value.tags = tags.includes(name) ? tags.filter((t) => t !== name) : [...tags, name]
}

const newTag = ref('')

function addCustomTag() {
  let name = newTag.value.trim().replace(/^#+/, '').replace(/\s+/g, '-').slice(0, 30)
  if (!name) return
  const existing = tagOptions.value.find((t) => t.toLowerCase() === name.toLowerCase())
  name = existing ?? name.toLowerCase()
  if (!postDraft.value.tags.includes(name)) {
    postDraft.value.tags = [...postDraft.value.tags, name]
  }
  newTag.value = ''
}

function startEditPost() {
  newTag.value = ''
  postDraft.value = {
    title: post.value.title,
    content: post.value.content ?? '',
    tags: [...(post.value.tags ?? [])],
    links: {
      events: [...(post.value.event_ids ?? [])],
      artists: [...(post.value.artist_ids ?? [])],
    },
    photos: (post.value.images ?? []).map((url) => ({ url })),
    song: post.value.song ?? null,
  }
  postActionError.value = ''
  editingPost.value = true
  loadTagOptions()
}

function cancelEditPost() {
  editingPost.value = false
  postActionError.value = ''
}

async function savePostEdit() {
  if (newTag.value.trim()) addCustomTag()
  const title = postDraft.value.title.trim()
  const content = postDraft.value.content.trim()
  if (!title || !postDraft.value.tags.length || postSaving.value) return

  postSaving.value = true
  postActionError.value = ''
  try {
    const tags = postDraft.value.tags
    const images = await Promise.all(
      postDraft.value.photos.map((p) => (p.file ? uploadPostImage(p.file) : p.url)),
    )
    const removedImages = (post.value.images ?? []).filter((url) => !images.includes(url))
    const changes = {
      title,
      content,
      tags,
      event_ids: postDraft.value.links.events,
      artist_ids: postDraft.value.links.artists,
      ...(images.length || post.value.images?.length ? { images } : {}),
      ...(postDraft.value.song || post.value.song ? { song: postDraft.value.song } : {}),
    }
    await updatePost(post.value.id, changes)
    deletePostImages(removedImages)
    post.value = { ...post.value, ...changes }
    forumPosts?.patch(post.value.id, changes)
    editingPost.value = false
  } catch (err) {
    console.error('Post update failed:', err.message)
    postActionError.value = `Could not save your changes: ${err.message}`
  } finally {
    postSaving.value = false
  }
}

async function removePost() {
  if (!window.confirm("Delete this post? Its replies will be deleted too. This can't be undone.")) return

  postActionError.value = ''
  try {
    await deletePost(post.value.id)
    forumPosts?.remove(post.value.id)
    router.push({ name: 'forum' })
  } catch (err) {
    console.error('Post delete failed:', err.message)
    postActionError.value = 'Could not delete this post. Please try again.'
  }
}

async function postReply({ parentId = null, content }) {
  try {
    const reply = await createReply(post.value.id, {
      content,
      parentId,
      username: userStore.user?.name,
    })
    replies.value = [...replies.value, reply]
    syncReplies()
  } catch (err) {
    if (err.message === 'Please sign in to reply.') throw err
    console.error('Reply failed:', err.message)
    throw new Error('Could not post your reply. Please try again.')
  }
}

async function editReply(id, content) {
  try {
    await updateReply(id, content)
  } catch (err) {
    console.error('Reply update failed:', err.message)
    throw new Error('Could not save your changes. Please try again.')
  }
  replies.value = replies.value.map((r) => (r.id === id ? { ...r, content } : r))
  syncReplies()
}

async function removeReply(id) {
  try {
    await deleteReply(id)
  } catch (err) {
    console.error('Reply delete failed:', err.message)
    throw new Error('Could not delete this reply. Please try again.')
  }

  const gone = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const r of replies.value) {
      if (r.parent_id && gone.has(r.parent_id) && !gone.has(r.id)) {
        gone.add(r.id)
        grew = true
      }
    }
  }
  replies.value = replies.value.filter((r) => !gone.has(r.id))
  syncReplies()
}

provide('postReply', postReply)
provide('replyActions', { currentUserId, editReply, removeReply })

const newReply = ref('')
const composerOpen = ref(false)
const submitting = ref(false)
const composeError = ref('')

function cancelReply() {
  newReply.value = ''
  composerOpen.value = false
  composeError.value = ''
}

async function submitReply() {
  const content = newReply.value.trim()
  if (!content || submitting.value) return
  submitting.value = true
  composeError.value = ''
  try {
    await postReply({ content })
    cancelReply()
  } catch (err) {
    composeError.value = err.message
  } finally {
    submitting.value = false
  }
}

const replyTree = computed(() => {
  const byId = new Map(replies.value.map((r) => [r.id, { ...r, children: [] }]))
  const roots = []
  for (const reply of byId.values()) {
    const parent = reply.parent_id ? byId.get(reply.parent_id) : null
    if (parent) parent.children.push(reply)
    else roots.push(reply)
  }
  return roots
})

const scrollToReplies = () => repliesSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })

watch(() => route.params.id, (id) => id && load(id), { immediate: true })
</script>

<template>
  <div class="py-3 mx-3">
    <RouterLink
      v-if="loading || errorMessage"
      :to="{ name: 'forum' }"
      @click.prevent="goBack"
      class="back-btn btn btn-sm btn-link p-0 mb-2"
      aria-label="Back to forum"
      title="Back to forum"
    >
      <i class="bi bi-arrow-left back-arrow"></i>
    </RouterLink>

    <div v-if="loading" class="text-center text-body-secondary py-5">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>Loading post…
    </div>

    <div v-else-if="errorMessage" class="alert alert-warning">{{ errorMessage }}</div>

    <div v-else class="row g-4">
      <div :class="hasLinks && !editingPost ? 'col-lg' : 'col-12'" style="min-width: 0">
        <article>
          <div class="d-flex justify-content-between align-items-start mb-1">
            <p class="small text-body-secondary mb-0 d-flex align-items-center">
              <RouterLink
                :to="{ name: 'forum' }"
                @click.prevent="goBack"
                class="back-btn btn btn-sm btn-link p-0"
                aria-label="Back to forum"
                title="Back to forum"
              >
                <i class="bi bi-arrow-left back-arrow"></i>
              </RouterLink>
              <span class="icon-slot"><i class="bi bi-person-circle"></i></span>
              {{ post.username }}
            </p>

            <div class="d-flex align-items-center gap-2">
              <SaveButton :saved="saved" @toggle="toggleSave(post.id)" />

              <OptionsMenu v-if="isPostOwner && !editingPost" @edit="startEditPost" @delete="removePost" />
            </div>
          </div>

          <div class="indented with-back">
            <form v-if="editingPost" class="edit-form mb-3" @submit.prevent="savePostEdit">
              <input
                v-model="postDraft.title"
                type="text"
                class="form-control mb-2"
                placeholder="Title"
                :disabled="postSaving"
                @keydown.esc="cancelEditPost"
              />
              <textarea
                v-model="postDraft.content"
                class="form-control"
                rows="6"
                placeholder="Content"
                :disabled="postSaving"
                @keydown.esc="cancelEditPost"
              ></textarea>

              <PhotoPicker v-model="postDraft.photos" class="mt-3" />

              <SongPicker v-model="postDraft.song" class="mt-3" />

              <div class="mt-2">
                <p class="small text-body-secondary mb-1">Tags</p>
                <div v-if="postDraft.tags.length" class="d-flex flex-wrap gap-2">
                  <span
                    v-for="tag in postDraft.tags"
                    :key="tag"
                    class="badge rounded-pill forum-tag d-inline-flex align-items-center fw-normal px-3 py-2"
                    :style="tagStyle(tag)"
                  >
                    #{{ tag }}
                    <button
                      type="button"
                      class="btn-close ms-2"
                      style="font-size: 0.55rem"
                      :aria-label="`Remove #${tag}`"
                      :disabled="postSaving"
                      @click="toggleTag(tag)"
                    ></button>
                  </span>
                </div>

                <div class="input-group input-group-sm mt-2">
                  <span class="input-group-text">#</span>
                  <input
                    v-model="newTag"
                    type="text"
                    class="form-control"
                    maxlength="30"
                    list="edit-post-tag-list"
                    placeholder="Type a tag, then press Enter"
                    :disabled="postSaving"
                    @keydown.enter.prevent="addCustomTag"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :disabled="!newTag.trim() || postSaving"
                    @click="addCustomTag"
                  >
                    Add
                  </button>
                </div>
                <datalist id="edit-post-tag-list">
                  <option v-for="tag in tagOptions" :key="tag" :value="tag"></option>
                </datalist>

                <p v-if="!postDraft.tags.length && !newTag.trim()" class="text-danger small mt-1 mb-0">
                  Select at least one tag.
                </p>
              </div>

              <div class="mt-3">
                <PostLinksField v-model="postDraft.links" />
              </div>

              <div class="d-flex gap-2 mt-3">
                <button
                  type="submit"
                  class="btn btn-primary btn-sm"
                  :disabled="!postDraft.title.trim() || (!postDraft.tags.length && !newTag.trim()) || postSaving"
                >
                  {{ postSaving ? 'Saving…' : 'Save' }}
                </button>
                <button type="button" class="btn btn-light btn-sm" :disabled="postSaving" @click="cancelEditPost">
                  Cancel
                </button>
              </div>
            </form>

            <template v-else>
              <h1 class="h3">{{ post.title }}</h1>
              <p v-if="post.content" class="post-caption" style="white-space: pre-wrap">{{ post.content }}</p>

              <PostImages :images="post.images ?? []" linked class="mb-3" />
            </template>

            <p v-if="postActionError" class="text-danger small">{{ postActionError }}</p>

            <div class="d-flex flex-wrap align-items-start column-gap-3 row-gap-2">
              <div class="flex-grow-1" style="min-width: 0">
                <div v-if="!editingPost && post.tags?.length" class="d-flex flex-wrap gap-1 mb-3">
                  <RouterLink
                    v-for="tag in post.tags"
                    :key="tag"
                    :to="{ name: 'forum-tags', query: { tag } }"
                    class="badge rounded-pill forum-tag text-decoration-none"
                    :style="tagStyle(tag)"
                    :title="`See all #${tag} posts`"
                  >
                    <i class="bi bi-music-note-beamed"></i> {{ tag }}
                    <i v-if="isTrending(tag)" class="bi bi-fire forum-fire" title="Trending tag"></i>
                  </RouterLink>
                </div>

                <div class="d-flex align-items-center gap-3 small">
                  <VoteButtons :up="upvotes" :down="downvotes" :current="userVote" @vote="vote" />
                  <button
                    type="button"
                    class="forum-icon-btn btn btn-sm btn-link p-0 text-decoration-none"
                    aria-label="Jump to replies"
                    @click="scrollToReplies"
                  >
                    <i class="bi bi-chat forum-icon"></i>{{ replies.length }}
                  </button>
                </div>
              </div>
              <SongEmbed v-if="post.song?.id && !editingPost" :song="post.song" class="ms-auto" />
            </div>
          </div>
        </article>

        <hr class="my-4" />

        <form class="reply-box mb-4" :class="{ open: composerOpen }" @submit.prevent="submitReply">
          <textarea
            v-model="newReply"
            class="reply-input"
            :rows="composerOpen ? 3 : 1"
            placeholder="Join the conversation"
            @focus="composerOpen = true"
            @keydown.ctrl.enter="submitReply"
            @keydown.meta.enter="submitReply"
          ></textarea>

          <div v-if="composerOpen" class="d-flex justify-content-end gap-2 mt-2">
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-3" @click="cancelReply">
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm btn-primary rounded-pill px-3"
              :disabled="!newReply.trim() || submitting"
            >
              <span v-if="submitting" class="spinner-border spinner-border-sm me-1" role="status"></span>
              Comment
            </button>
          </div>

          <p v-if="composeError" class="text-danger small mt-2 mb-0">{{ composeError }}</p>
        </form>

        <section ref="repliesSection" aria-labelledby="replies-heading">
          <h2 id="replies-heading" class="h6 text-body-secondary mb-2">Replies ({{ replies.length }})</h2>

          <p v-if="repliesError" class="text-danger small">
            {{ repliesError }} Open the browser console for the reason.
          </p>
          <p v-else-if="!replies.length" class="text-body-secondary small">No replies yet.</p>

          <ReplyItem v-for="reply in replyTree" :key="reply.id" :reply="reply" />
        </section>
      </div>

      <aside v-if="hasLinks && !editingPost" class="col-lg-auto linked-aside" style="min-width: 0">
        <div class="linked-sticky">
          <PostLinkedPanel v-if="catalog.loaded" :artists="linkedArtists" :events="linkedEvents" />
          <p v-else-if="catalog.error" class="text-body-secondary small mb-0">{{ catalog.error }}</p>
          <p v-else class="text-body-secondary small mb-0">
            <span class="spinner-border spinner-border-sm me-2"></span>Loading…
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.post-caption {
  color: var(--riffle-muted);
}
.back-btn {
  --bs-btn-color: var(--bs-secondary-color);
  --bs-btn-hover-color: var(--bs-secondary-color);
  --bs-btn-active-color: var(--bs-secondary-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  margin-right: 0.5rem;
  border: 1px solid var(--riffle-border);
  border-radius: 50%;
  background: var(--riffle-bg);
}
.back-btn:hover,
.back-btn:active {
  border-color: var(--riffle-border);
  background: var(--riffle-bg);
}
.back-arrow {
  display: inline-block;
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.15s ease;
}
.back-btn:hover .back-arrow {
  transform: scale(1.12);
}
.back-btn:active .back-arrow {
  transform: scale(0.9);
}

.icon-slot {
  display: inline-block;
  width: 1.5rem;
  flex-shrink: 0;
}
.indented {
  padding-left: 1.5rem;
}
.indented.with-back {
  padding-left: 4rem;
}

.edit-form {
  --bs-border-color: var(--riffle-faint);
}

.reply-box {
  border: 1px solid var(--bs-border-color);
  border-radius: 1.25rem;
  padding: 0.75rem 1rem;
  background: var(--bs-body-bg);
}
.reply-box:focus-within {
  border-color: var(--bs-primary);
}
.reply-input {
  width: 100%;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--bs-body-color);
}
.reply-input::placeholder {
  color: var(--bs-secondary-color);
}

@media (min-width: 992px) {
  .linked-aside {
    width: calc(340px + 1.5rem + 0.5rem);
  }
  .linked-sticky {
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - var(--navbar-height, 8rem) - 2rem);
    overflow-y: auto;
  }
}
</style>