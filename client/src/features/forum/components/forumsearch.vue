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
  <div class="forum-search d-flex align-items-center flex-grow-1">
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
    <Transition name="glass">
      <div v-if="open" class="glass-root">
        <div class="glass-backdrop" @click="close"></div>

        <div class="glass-panel">
          <div class="d-flex align-items-center justify-content-between">
            <h5 class="glass-title">Search the forum</h5>
            <button type="button" class="glass-close" @click="close">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <form class="glass-form" @submit.prevent="submit">
            <div class="glass-input-wrap">
              <i class="bi bi-search"></i>
              <input
                ref="inputEl"
                v-model="term"
                type="search"
                class="glass-input"
                placeholder="Search posts, topics, or people"
              />
            </div>
            <button type="submit" class="glass-submit" :disabled="!term.trim()">Search</button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.forum-search {
  min-width: 0;
  height: var(--forum-search-height, 3.5rem);
}

.glass-root {
  position: fixed;
  inset: 0;
  z-index: 1055;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.glass-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(20, 24, 40, 0.28);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
}

.glass-panel {
  --glass-a: rgba(255, 255, 255, 0.62);
  --glass-b: rgba(255, 255, 255, 0.22);
  --glass-edge: rgba(255, 255, 255, 0.65);
  --glass-shadow: rgba(40, 50, 120, 0.28);
  --glass-field: rgba(255, 255, 255, 0.55);

  position: relative;
  width: 100%;
  max-width: 34rem;
  padding: 1.25rem 1.25rem 1.5rem;
  overflow: hidden;
  border-radius: 1.75rem;
  color: var(--bs-body-color);
  background: linear-gradient(135deg, var(--glass-a), var(--glass-b));
  -webkit-backdrop-filter: blur(28px) saturate(180%) brightness(1.05);
  backdrop-filter: blur(28px) saturate(180%) brightness(1.05);
  border: 1px solid var(--glass-edge);
  box-shadow:
    0 24px 60px var(--glass-shadow),
    inset 0 1.5px 0 rgba(255, 255, 255, 0.8),
    inset 0 -1px 0 rgba(255, 255, 255, 0.2),
    inset 0 0 24px rgba(255, 255, 255, 0.18);
}

.glass-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(255, 255, 255, 0.55), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(255, 255, 255, 0.25), transparent 60%);
}

.glass-panel > * {
  position: relative;
}

.glass-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 650;
}

.glass-close {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  border: 1px solid var(--glass-edge);
  background: var(--glass-field);
  color: inherit;
  transition: transform 0.15s ease, background 0.15s ease;
}
.glass-close:hover {
  transform: scale(1.08);
  background: rgba(255, 255, 255, 0.8);
}

.glass-form {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.glass-input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}
.glass-input-wrap i {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
  pointer-events: none;
}

.glass-input {
  width: 100%;
  padding: 0.7rem 1rem 0.7rem 2.6rem;
  border-radius: 999px;
  border: 1px solid var(--glass-edge);
  background: var(--glass-field);
  color: inherit;
  outline: 0;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease, background 0.2s ease;
}
.glass-input::placeholder {
  color: var(--bs-secondary-color);
}
.glass-input:focus {
  background: rgba(255, 255, 255, 0.8);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.06),
    0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

.glass-submit {
  padding: 0.7rem 1.25rem;
  border: 0;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
  background: linear-gradient(
    180deg,
    rgba(var(--bs-primary-rgb), 0.95),
    rgba(var(--bs-primary-rgb), 0.75)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 6px 16px rgba(var(--bs-primary-rgb), 0.35);
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.glass-submit:hover:not(:disabled) {
  transform: translateY(-1px);
}
.glass-submit:disabled {
  opacity: 0.45;
}

:global([data-bs-theme='dark']) .glass-panel {
  --glass-a: rgba(40, 44, 60, 0.62);
  --glass-b: rgba(20, 24, 36, 0.32);
  --glass-edge: rgba(255, 255, 255, 0.18);
  --glass-shadow: rgba(0, 0, 0, 0.55);
  --glass-field: rgba(255, 255, 255, 0.1);
}
:global([data-bs-theme='dark']) .glass-panel::before {
  opacity: 0.35;
}
:global([data-bs-theme='dark']) .glass-close:hover,
:global([data-bs-theme='dark']) .glass-input:focus {
  background: rgba(255, 255, 255, 0.18);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass-panel {
    background: var(--bs-body-bg);
  }
}

.glass-enter-active,
.glass-leave-active {
  transition: opacity 0.25s ease;
}
.glass-enter-active .glass-panel,
.glass-leave-active .glass-panel {
  transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 0.25s ease;
}
.glass-enter-from,
.glass-leave-to {
  opacity: 0;
}
.glass-enter-from .glass-panel,
.glass-leave-to .glass-panel {
  transform: translateY(14px) scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .glass-enter-active,
  .glass-leave-active,
  .glass-enter-active .glass-panel,
  .glass-leave-active .glass-panel,
  .glass-close,
  .glass-input,
  .glass-submit {
    transition: none;
  }
}
</style>