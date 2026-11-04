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
  { key: 'date', label: 'Date posted', icon: 'bi-calendar3', desc: 'Newest first', asc: 'Oldest first' },
  { key: 'upvotes', label: 'Upvotes', icon: 'bi-arrow-up-circle', desc: 'Most first', asc: 'Fewest first' },
  { key: 'comments', label: 'Comments', icon: 'bi-chat', desc: 'Most first', asc: 'Fewest first' },
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
    <!-- Closed button: same look as the Sort by dropdown on Artists and Events -->
    <button
      type="button"
      class="sort-btn"
      :class="{ 'is-open': open }"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="sort-badge" aria-hidden="true">
        <span class="eq" :class="{ 'is-playing': open }"><i></i><i></i><i></i><i></i></span>
      </span>
      <span class="sort-prefix d-none d-sm-inline">Sort by</span>
      <strong class="d-none d-sm-inline">{{ current.label }}</strong>
      <i class="bi bi-chevron-down sort-chevron" aria-hidden="true"></i>
    </button>

    <Transition name="sort-menu">
      <div v-if="open" class="menu" role="menu" aria-label="Sort posts">
        <p class="menu-heading">Sort by</p>
        <button
          v-for="f in FIELDS"
          :key="f.key"
          type="button"
          role="menuitemradio"
          :aria-checked="f.key === current.key"
          class="menu-item"
          :class="{ 'is-selected': f.key === current.key }"
          @click="chooseField(f.key)"
        >
          <i class="bi menu-icon" :class="f.icon"></i>
          {{ f.label }}
          <i v-if="f.key === current.key" class="bi bi-check2 menu-check"></i>
        </button>

        <hr class="menu-divider" />

        <p class="menu-heading">Order</p>
        <button
          type="button"
          role="menuitemradio"
          :aria-checked="dir === 'desc'"
          class="menu-item"
          :class="{ 'is-selected': dir === 'desc' }"
          @click="chooseDir('desc')"
        >
          <i class="bi bi-sort-down menu-icon"></i>
          {{ current.desc }}
          <i v-if="dir === 'desc'" class="bi bi-check2 menu-check"></i>
        </button>
        <button
          type="button"
          role="menuitemradio"
          :aria-checked="dir === 'asc'"
          class="menu-item"
          :class="{ 'is-selected': dir === 'asc' }"
          @click="chooseDir('asc')"
        >
          <i class="bi bi-sort-up menu-icon"></i>
          {{ current.asc }}
          <i v-if="dir === 'asc'" class="bi bi-check2 menu-check"></i>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Closed button (same as the Sort by dropdown on Artists and Events) */
.sort-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem 0.5rem 0.8rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  font-size: 0.92rem;
  white-space: nowrap;
  box-shadow: var(--riffle-shadow-sm);
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.sort-btn:hover {
  border-color: #c9d3ee;
  transform: translateY(-1px);
}
.sort-btn.is-open {
  border-color: var(--riffle-blue);
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.15);
}
.sort-prefix {
  color: var(--riffle-muted);
}
.sort-chevron {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--riffle-muted);
  transition: transform 0.2s ease;
}
.sort-btn.is-open .sort-chevron {
  transform: rotate(180deg);
}
.sort-badge {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin: -0.15rem 0.1rem -0.15rem -0.45rem;
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
.sort-btn:hover .eq i {
  animation: eq-dance 0.9s ease-in-out infinite;
}
.eq.is-playing i:nth-child(2),
.sort-btn:hover .eq i:nth-child(2) {
  animation-delay: -0.3s;
}
.eq.is-playing i:nth-child(3),
.sort-btn:hover .eq i:nth-child(3) {
  animation-delay: -0.6s;
}
.eq.is-playing i:nth-child(4),
.sort-btn:hover .eq i:nth-child(4) {
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
/* Menu (same panel and rows as the Sort by dropdown, with ticks for the chosen options) */
.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 30;
  min-width: 100%;
  width: max-content;
  padding: 0.4rem;
  border: 1px solid var(--riffle-border);
  border-radius: 16px;
  background: var(--riffle-surface);
  box-shadow: 0 14px 34px rgba(20, 35, 90, 0.16);
}
.menu-heading {
  margin: 0;
  padding: 0.35rem 0.7rem 0.2rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--riffle-muted);
}
.menu-divider {
  margin: 0.35rem 0.3rem;
  border-color: var(--riffle-border);
  opacity: 1;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--riffle-text);
  font-size: 0.92rem;
  font-weight: 600;
  text-align: left;
  transition: background 0.12s;
}
.menu-item:hover,
.menu-item:focus-visible {
  background: #f1f4fd;
}
.menu-icon {
  width: 1.1rem;
  color: var(--riffle-muted);
}
.menu-item.is-selected {
  color: var(--riffle-ink);
  font-weight: 800;
}
.menu-item.is-selected .menu-icon {
  color: var(--riffle-blue);
}
.menu-check {
  margin-left: auto;
  padding-left: 1rem;
  color: var(--riffle-blue);
  font-size: 1rem;
}
:root[data-theme='dark'] .menu-item:hover,
:root[data-theme='dark'] .menu-item:focus-visible {
  background: rgba(255, 255, 255, 0.06);
}

.sort-menu-enter-active,
.sort-menu-leave-active {
  transition: opacity 0.15s, transform 0.15s;
  transform-origin: top right;
}
.sort-menu-enter-from,
.sort-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>