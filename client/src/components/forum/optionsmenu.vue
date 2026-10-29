<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'


const emit = defineEmits(['edit', 'delete'])

const open = ref(false)
const root = ref(null)

function onDocumentClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}
function onKeydown(e) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

function pick(action) {
  open.value = false
  emit(action)
}
</script>

<template>
  <div ref="root" class="options">
    <button
      type="button"
      class="btn btn-sm btn-link p-0 text-body-secondary"
      @click="open = !open"
    >
      <i class="bi bi-three-dots fs-5"></i>
    </button>

    <ul v-if="open" class="menu list-unstyled border rounded-3 shadow-sm py-1 m-0" role="menu">
      <li role="none">
        <button type="button" role="menuitem" class="menu-item" @click="pick('edit')">
          <i class="bi bi-pencil"></i>Edit
        </button>
      </li>
      <li role="none">
        <button type="button" role="menuitem" class="menu-item text-danger" @click="pick('delete')">
          <i class="bi bi-trash"></i>Delete
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.options {
  position: relative;
}
.menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 10;
  min-width: 8rem;
  background: var(--bs-body-bg);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.4rem 0.9rem;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font-size: 0.875rem;
}
.menu-item:hover,
.menu-item:focus-visible {
  background: var(--bs-tertiary-bg);
}
</style>