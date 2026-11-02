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
      <span class="sort-badge" aria-hidden="true">
        <span class="eq" :class="{ 'is-playing': open }"><i></i><i></i><i></i><i></i></span>
      </span>
      <span class="d-none d-sm-inline">{{ current.label }}</span>
      <i class="bi bi-chevron-down sort-chevron" :class="{ 'is-open': open }" aria-hidden="true"></i>
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
.sort-chevron {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}
.sort-chevron.is-open {
  transform: rotate(180deg);
}
.sort-badge {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin: -0.15rem 0 -0.15rem -0.6rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4d8d 0%, #7c4dff 100%);
  box-shadow: 0 2px 6px rgba(124, 77, 255, 0.4);
}
.eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}
.eq i {
  display: block;
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: #fff;
  transform: scaleY(0.4);
  transform-origin: bottom;
}
.eq i:nth-child(2) {
  height: 70%;
}
.eq i:nth-child(3) {
  height: 90%;
}
.eq.is-playing i,
.forumsort > .btn:hover .eq i {
  animation: eq-dance 0.9s ease-in-out infinite;
}
.eq.is-playing i:nth-child(2),
.forumsort > .btn:hover .eq i:nth-child(2) {
  animation-delay: -0.3s;
}
.eq.is-playing i:nth-child(3),
.forumsort > .btn:hover .eq i:nth-child(3) {
  animation-delay: -0.6s;
}
.eq.is-playing i:nth-child(4),
.forumsort > .btn:hover .eq i:nth-child(4) {
  animation-delay: -0.15s;
}
@keyframes eq-dance {
  0%,
  100% {
    transform: scaleY(0.35);
  }
  50% {
    transform: scaleY(1);
  }
}
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