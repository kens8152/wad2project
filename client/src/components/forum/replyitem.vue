<script setup>
import { ref, computed, inject } from 'vue'
import { useVote } from '../../composables/forum/usevote.js' 
import VoteButtons from './votebuttons.vue'
import OptionsMenu from './optionsmenu.vue'


defineOptions({ name: 'ReplyItem' })


const props = defineProps({
  reply: { type: Object, required: true }, 
  depth: { type: Number, default: 0 },
})

const MAX_INDENT_DEPTH = 5

const { userVote, upvotes, downvotes, vote } = useVote(() => props.reply, {
  table: 'reply_votes',
  idColumn: 'reply_id',
})


const postReply = inject('postReply', null)
const actions = inject('replyActions', null) 

const isOwner = computed(() => {
  const me = actions?.currentUserId?.value
  return !!me && props.reply.user_id === me
})


const replying = ref(false) 
const draft = ref('')
const sending = ref(false)
const error = ref('')

function toggleReply() {
  replying.value = !replying.value
  error.value = ''
}

function cancelReply() {
  replying.value = false
  draft.value = ''
  error.value = ''
}

async function submitReply() {
  const content = draft.value.trim()
  if (!content || sending.value || !postReply) return

  sending.value = true
  error.value = ''
  try {
    await postReply({ parentId: props.reply.id, content })
    draft.value = ''
    replying.value = false
  } catch (e) {
    error.value = e?.message || 'Could not post your reply.'
  } finally {
    sending.value = false
  }
}


const editing = ref(false)
const editDraft = ref('')
const savingEdit = ref(false)
const editError = ref('')

function startEdit() {
  editDraft.value = props.reply.content
  editError.value = ''
  replying.value = false
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editError.value = ''
}

async function saveEdit() {
  const content = editDraft.value.trim()
  if (!content || savingEdit.value || !actions) return
  if (content === props.reply.content) {
    editing.value = false
    return
  }

  savingEdit.value = true
  editError.value = ''
  try {
    await actions.editReply(props.reply.id, content)
    editing.value = false
  } catch (e) {
    editError.value = e?.message || 'Could not save your changes.'
  } finally {
    savingEdit.value = false
  }
}


const deleteError = ref('')

async function confirmDelete() {
  if (!actions) return
  const extra = props.reply.children.length ? ' Its sub-replies will be deleted too.' : ''
  if (!window.confirm(`Delete this reply?${extra} This can't be undone.`)) return

  deleteError.value = ''
  try {
    await actions.removeReply(props.reply.id)
  } catch (e) {
    deleteError.value = e?.message || 'Could not delete this reply.'
  }
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''
</script>

<template>
  <div>
    <div class="py-2">
      <div class="d-flex justify-content-between align-items-start mb-1">
        <p class="small text-body-secondary mb-0 d-flex align-items-center">
          <span class="icon-slot"><i class="bi bi-person-circle"></i></span>
          {{ reply.username ?? 'Anonymous' }}
          <span class="ms-2">· {{ formatDate(reply.created_at) }}</span>
        </p>

        <OptionsMenu v-if="isOwner && !editing" @edit="startEdit" @delete="confirmDelete" />
      </div>

      <div class="indented">
        <div v-if="editing" class="mb-2">
          <textarea
            v-model="editDraft"
            class="form-control form-control-sm"
            rows="3"
            :disabled="savingEdit"
            @keydown.ctrl.enter="saveEdit"
            @keydown.meta.enter="saveEdit"
            @keydown.esc="cancelEdit"
          ></textarea>
          <div class="d-flex gap-2 mt-2">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="!editDraft.trim() || savingEdit"
              @click="saveEdit"
            >
              {{ savingEdit ? 'Saving…' : 'Save' }}
            </button>
            <button type="button" class="btn btn-light btn-sm" :disabled="savingEdit" @click="cancelEdit">
              Cancel
            </button>
          </div>
          <p v-if="editError" class="text-danger small mb-0 mt-1">{{ editError }}</p>
        </div>

        <p v-else class="mb-1" style="white-space: pre-wrap">{{ reply.content }}</p>

        <p v-if="deleteError" class="text-danger small mb-1">{{ deleteError }}</p>

        <div class="d-flex align-items-center gap-3 small">
          <VoteButtons :up="upvotes" :down="downvotes" :current="userVote" @vote="vote" />
          <button
            type="button"
            class="btn btn-sm btn-link p-0 text-decoration-none text-body-secondary"
            @click="toggleReply"
          >
            <i class="bi bi-reply me-1"></i>Reply
          </button>
        </div>

        <div v-if="replying" class="mt-2">
          <textarea
            v-model="draft"
            class="form-control form-control-sm"
            rows="3"
            :placeholder="`Reply to ${reply.username ?? 'this comment'}…`"
            :disabled="sending"
            @keydown.ctrl.enter="submitReply"
            @keydown.meta.enter="submitReply"
          ></textarea>
          <div class="d-flex gap-2 mt-2">
            <button
              type="button"
              class="btn btn-primary btn-sm"
              :disabled="!draft.trim() || sending"
              @click="submitReply"
            >
              {{ sending ? 'Posting…' : 'Reply' }}
            </button>
            <button type="button" class="btn btn-light btn-sm" :disabled="sending" @click="cancelReply">
              Cancel
            </button>
          </div>
          <p v-if="error" class="text-danger small mb-0 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <div v-if="reply.children.length" :class="depth < MAX_INDENT_DEPTH ? 'ms-3 ps-3 border-start' : ''">
      <ReplyItem v-for="child in reply.children" :key="child.id" :reply="child" :depth="depth + 1" />
    </div>
  </div>
</template>

<style scoped>
.icon-slot {
  display: inline-block;
  width: 1.5rem;
  flex-shrink: 0;
}
.indented {
  padding-left: 1.5rem;
}
</style>