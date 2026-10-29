<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const emit = defineEmits(['select', 'reset'])

const feeds = [
  { key: 'explore', label: 'Explore', icon: 'bi-compass', to: '/forum' },
  { key: 'trend', label: 'Trend', icon: 'bi-fire', to: '/forum/trend' },
  { key: 'tag', label: 'Tags', icon: 'bi-hash', to: '/forum/tags' },
  { key: 'lfg', label: 'Look for group', icon: 'bi-people', to: '/forum/lfg' },
  { key: 'saved', label: 'Saved Post', icon: 'bi-bookmark', to: '/forum/saved' },
  { key: 'mypost', label: 'My Post', icon: 'bi-person', to: '/forum/mypost' },
]

const activeKey = computed(() => feeds.find((f) => f.to === route.path)?.key ?? 'explore')

const collapsed = ref(window.innerWidth < 992)
const peek = ref(false)
const narrow = computed(() => collapsed.value && !peek.value)

const desktop = window.matchMedia('(min-width: 992px)')
const hoverDevice = window.matchMedia('(min-width: 992px) and (hover: hover)')

function onMouseEnter() {
  if (collapsed.value && hoverDevice.matches) peek.value = true
}
function onMouseLeave() {
  peek.value = false
}
function onFocusIn(e) {
  if (!collapsed.value || !desktop.matches) return
  if (e.target.matches?.(':focus-visible')) peek.value = true
}
function onFocusOut(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) peek.value = false
}

function closePeek() {
  peek.value = false
}
onMounted(() => window.addEventListener('blur', closePeek))
onBeforeUnmount(() => window.removeEventListener('blur', closePeek))

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  peek.value = false
}

function select(item) {
  emit('select', item.key)
  if (route.path === item.to) {
    emit('reset')
    document.querySelector('.app-main')?.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    router.push(item.to)
  }
}
</script>

<template>
  <aside
    class="forumnav flex-shrink-0 border-end border-bottom bg-body px-2 py-2"
    :class="{ 'is-collapsed': collapsed, 'is-peeking': collapsed && peek }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <button
      type="button"
      class="forumnav__item btn border-0 d-flex align-items-center w-100 text-start rounded-3"
      :class="{ 'justify-content-lg-center': narrow }"
      @click="toggleCollapsed"
    >
      <i class="bi bi-list fs-5" :class="{ 'me-3': !narrow, 'me-lg-0': narrow }"></i>
    </button>

    <ul class="nav flex-column mt-1" :class="collapsed ? 'd-none d-lg-flex' : 'd-flex'">
      <li v-for="item in feeds" :key="item.key" class="nav-item">
        <button
          type="button"
          class="forumnav__item nav-link d-flex align-items-center w-100 text-start rounded-3 link-body-emphasis"
          :class="[
            { 'is-active': activeKey === item.key },
            { 'justify-content-lg-center': narrow },
          ]"
          :title="narrow ? item.label : null"
          @click="select(item)"
        >
          <i class="bi fs-5" :class="[item.icon, narrow ? 'me-3 me-lg-0' : 'me-3']"></i>
          <span :class="{ 'd-none': narrow }">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.forumnav {
  --nav-wide: 270px;
  --nav-narrow: 72px;
  width: 70%;
  height: 100vh;
}

@media (max-width: 991.98px) {
  .forumnav.is-collapsed {
    width: auto;
    height: auto;
    align-self: flex-start;
    border: 0 !important;
  }
}

@media (min-width: 992px) {
  .forumnav {
    width: var(--nav-wide);
    position: sticky;
    top: 0;
    height: calc(100vh - var(--navbar-height, 0px));
    overflow-y: auto;
    border-bottom: 0 !important;
    transition: width 0.25s ease, margin-right 0.25s ease, box-shadow 0.25s ease;
  }
  .forumnav.is-collapsed {
    width: var(--nav-narrow);
  }

  .forumnav.is-peeking {
    width: var(--nav-wide);
    margin-right: calc(var(--nav-narrow) - var(--nav-wide));
    z-index: 1025;
    box-shadow: var(--bs-box-shadow);
  }
}

@media (prefers-reduced-motion: reduce) {
  .forumnav {
    transition: none;
  }
}

.forumnav__item:hover {
  background-color: var(--bs-secondary-bg);
}
.forumnav__item.is-active {
  background-color: var(--bs-secondary-bg);
  font-weight: 600;
}
.forumnav__item:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: -2px;
}
</style>