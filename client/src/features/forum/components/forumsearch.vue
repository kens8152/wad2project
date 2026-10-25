<script setup>
import { ref, nextTick, watch, onBeforeUnmount } from 'vue'

const emit = defineEmits(['search'])

const open = ref(false)
const term = ref('')
const inputEl = ref(null)

async function openModal() {
  open.value = true
  await nextTick()
  inputEl.value?.focus()
}

function close() {
  open.value = false
}

function submit() {
  const q = term.value.trim()
  if (!q) return
  emit('search', q)
  term.value = ''
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
  <div class=" forum-search d-flex align-items-center flex-grow-1">
    <button
      type="button"
      class="btn w-100 d-flex align-items-center text-start text-body-secondary bg-body-tertiary border rounded-pill px-3 py-2"
      @click="openModal"
    >
      <i class="bi bi-search me-2"></i>
      <span>Search the forum…</span>
    </button>
  </div>


  <Teleport to="body">
    <div v-if="open">
      <div class="modal-backdrop show"></div>

      <div
        class="modal d-block"
        tabindex="-1"
        role="dialog"
        @click.self="close"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 id="forum-search-title" class="modal-title">Search the forum</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
            </div>

            <form class="modal-body" role="search" @submit.prevent="submit">
              <div class="input-group">
                <input
                  ref="inputEl"
                  v-model="term"
                  type="search"
                  class="form-control"
                  placeholder="Search posts, topics, or people"
                />
                <button type="submit" class="btn btn-primary" :disabled="!term.trim()">
                  <i class="bi bi-search me-1"></i> Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.forum-search {
  min-width: 0;
  height: var(--forum-search-height, 3.5rem);
}
</style>