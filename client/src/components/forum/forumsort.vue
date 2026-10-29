<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'


const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ key: 'date', dir: 'desc' }),
  },
})
const emit = defineEmits(['update:modelValue'])

const FIELDS = [
  { key: 'date', label: 'Date posted', desc: 'Newest first', asc: 'Oldest first' },
  { key: 'upvotes', label: 'Upvotes', desc: 'Most first', asc: 'Fewest first' },
  { key: 'comments', label: 'Comments', desc: 'Most first', asc: 'Fewest first' },
]

const open = ref(false)
const root = ref(null)

const current = computed(() => FIELDS.find((f) => f.key === props.modelValue.key) ?? FIELDS[0])
const dir = computed(() => (props.modelValue.dir === 'asc' ? 'asc' : 'desc'))


function chooseField(key) {
  if (key === current.value.key) return
  emit('update:modelValue', { key, dir: 'desc' })
}

function chooseDir(d) {
  emit('update:modelValue', { key: current.value.key, dir: d })
}

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
</script>

<template>
  <div ref="root" class="forumsort flex-shrink-0">
    <button
      type="button"
      class="btn d-flex align-items-center gap-2 text-body-secondary bg-body-tertiary border rounded-pill px-3 py-2"
      @click="open = !open"
    >
      <i class="bi" :class="dir === 'desc' ? 'bi-sort-down' : 'bi-sort-up'"></i>
      <span class="d-none d-sm-inline">{{ current.label }}</span>
    </button>

    <div v-if="open" class="menu border rounded-3 shadow-sm py-1" role="menu" aria-label="Sort posts">
      <p class="menu-heading">Sort by</p>
      <button
        v-for="f in FIELDS"
        :key="f.key"
        type="button"
        role="menuitemradio"
        class="menu-item"
        @click="chooseField(f.key)"
      >
        <span class="check-slot"><i v-if="f.key === current.key" class="bi bi-check2"></i></span>
        {{ f.label }}
      </button>

      <hr class="my-1" />

      <p class="menu-heading">Order</p>
      <button
        type="button"
        role="menuitemradio"
        class="menu-item"
        @click="chooseDir('desc')"
      >
        <span class="check-slot"><i v-if="dir === 'desc'" class="bi bi-check2"></i></span>
        {{ current.desc }}
      </button>
      <button
        type="button"
        role="menuitemradio"
        class="menu-item"
        @click="chooseDir('asc')"
      >
        <span class="check-slot"><i v-if="dir === 'asc'" class="bi bi-check2"></i></span>
        {{ current.asc }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.forumsort {
  position: relative;
}
.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 0.25rem);
  z-index: 10;
  min-width: 12rem;
  background: var(--bs-body-bg);
}
.menu-heading {
  margin: 0;
  padding: 0.25rem 0.9rem;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
.check-slot {
  display: inline-block;
  width: 1.25rem;
}
</style>