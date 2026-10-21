<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  tags: { type: Array, default: () => [] },
})
const emit = defineEmits(['create'])

const MAX_TAGS = 5

const open = ref(false)
const title = ref('')
const content = ref('')
const tagInput = ref('')
const tagList = ref([])
const titleEl = ref(null)

const suggestions = computed(() => props.tags.map((t) => t.name ?? t))
const canSubmit = computed(
  () => title.value.trim().length > 0 && (tagList.value.length > 0 || tagInput.value.trim()),
)

async function openModal() {
  open.value = true
  await nextTick()
  titleEl.value?.focus()
}

function close() {
  open.value = false
}

function addTag() {
  const t = tagInput.value.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')
  tagInput.value = ''
  if (!t || tagList.value.includes(t) || tagList.value.length >= MAX_TAGS) return
  tagList.value.push(t)
}

function removeTag(t) {
  tagList.value = tagList.value.filter((x) => x !== t)
}


function onTagKeydown(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  }
}

function reset() {
  title.value = ''
  content.value = ''
  tagInput.value = ''
  tagList.value = []
}

function submit() {
  addTag() 
  if (!title.value.trim() || tagList.value.length === 0) return

  emit('create', {
    title: title.value.trim(),
    content: content.value.trim() || undefined, 
    tags: [...tagList.value],
  })
  reset()
  close()
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}


watch(open, (isOpen) => {
  document.body.classList.toggle('overflow-hidden', isOpen)
  if (isOpen) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.classList.remove('overflow-hidden')
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  
  <button
    type="button"
    class="btn btn-primary rounded-pill shadow position-fixed bottom-0 end-0 m-4 d-inline-flex align-items-center gap-2 px-3 py-2"
    style="z-index: 1020"
    @click="openModal"
  >
    <i class="bi bi-plus-lg"></i>
    <span class="d-none d-sm-inline">Create a post</span>
  </button>

  
  <Teleport to="body">
    <div v-if="open">
      <div class="modal-backdrop show"></div>

      <div
        class="modal d-block"
        tabindex="-1"
        role="dialog"
        @click.self="close"
      >
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <form class="modal-content" @submit.prevent="submit">
            <div class="modal-header">
              <h5 id="create-post-title" class="modal-title">Create a post</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
            </div>

            <div class="modal-body vstack gap-3">
              <div>
                <label for="post-title" class="form-label">Title</label>
                <input
                  id="post-title"
                  ref="titleEl"
                  v-model="title"
                  type="text"
                  class="form-control"
                  maxlength="120"
                  placeholder="Say something!"
                  required
                />
              </div>

              <div>
                <label for="post-content" class="form-label">
                  Content <span class="text-body-secondary small">(optional)</span>
                </label>
                <textarea
                  id="post-content"
                  v-model="content"
                  class="form-control"
                  rows="5"
                  maxlength="2000"
                  placeholder="Add more details"
                ></textarea>
              </div>

              <div>
                <label for="post-tags" class="form-label">
                  Tags <span class="text-body-secondary small">(up to {{ MAX_TAGS }})</span>
                </label>

                <div v-if="tagList.length" class="d-flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="t in tagList"
                    :key="t"
                    class="badge rounded-pill text-bg-primary d-inline-flex align-items-center fw-normal px-3 py-2"
                  >
                    #{{ t }}
                    <button
                      type="button"
                      class="btn-close btn-close-white ms-2"
                      style="font-size: 0.55rem"
                      @click="removeTag(t)"
                    ></button>
                  </span>
                </div>

                <div class="input-group">
                  <input
                    id="post-tags"
                    v-model="tagInput"
                    type="text"
                    class="form-control"
                    list="create-post-tag-list"
                    maxlength="30"
                    placeholder="Type a tag, then press Enter"
                    :disabled="tagList.length >= MAX_TAGS"
                    @keydown="onTagKeydown"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :disabled="!tagInput.trim() || tagList.length >= MAX_TAGS"
                    @click="addTag"
                  >
                    Add
                  </button>
                </div>
                <datalist id="create-post-tag-list">
                  <option v-for="s in suggestions" :key="s" :value="s"></option>
                </datalist>
                <div class="form-text">Add at least one tag.</div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" @click="close">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="!canSubmit">Post</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </Teleport>
</template>