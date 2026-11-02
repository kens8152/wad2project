<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForumNav } from '../../composables/forum/forumNav.js'

const route = useRoute()
const router = useRouter()
const emit = defineEmits(['reset'])

const feeds = [
  { key: 'explore', label: 'Explore', icon: 'bi-compass', to: { name: 'forum' } },
  { key: 'trend', label: 'Trend', icon: 'bi-fire', to: { name: 'forum-trend' } },
  { key: 'tag', label: 'Tags', icon: 'bi-hash', to: { name: 'forum-tags' } },
  { key: 'lfg', label: 'Look for group', icon: 'bi-people', to: { name: 'forum-lfg' } },
  { key: 'saved', label: 'Saved Post', icon: 'bi-bookmark', to: { name: 'forum-saved' } },
  { key: 'mypost', label: 'My Post', icon: 'bi-person', to: { name: 'forum-mypost' } },
]

const feedFor = (name) => feeds.find((f) => f.to.name === name)?.key


const previousPath = router.options.history.state.back
const previousName = typeof previousPath === 'string' ? router.resolve(previousPath).name : null
const lastFeed = ref(feedFor(route.name) ?? feedFor(previousName) ?? 'explore')
watch(
  () => route.name,
  (name) => {
    const key = feedFor(name)
    if (key) lastFeed.value = key
  },
)

const activeKey = computed(() => feedFor(route.name) ?? lastFeed.value)

const { collapsed, searchButtons } = useForumNav()
const peek = ref(false)
const narrow = computed(() => collapsed.value && !peek.value)

const desktop = window.matchMedia('(min-width: 992px)')
const hoverDevice = window.matchMedia('(min-width: 992px) and (hover: hover)')

// Below 992px the open menu slides over the page instead of pushing it down
const isMobile = ref(!desktop.matches)
function onScreenChange(e) {
  isMobile.value = !e.matches
  if (isMobile.value) collapsed.value = true
}
desktop.addEventListener('change', onScreenChange)
onBeforeUnmount(() => desktop.removeEventListener('change', onScreenChange))

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


function onSelect(item) {
  if (route.name === item.to.name) {
    emit('reset')
    document.querySelector('.app-main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  if (isMobile.value) collapsed.value = true
}
</script>

<template>
  <div v-if="isMobile && !collapsed" class="forumnav-backdrop" @click="toggleCollapsed"></div>
  <aside
    class="forumnav flex-shrink-0 border-end border-bottom bg-body px-2 py-2"
    :class="{ 'is-collapsed': collapsed, 'is-peeking': collapsed && peek, 'is-hidden-mobile': collapsed && searchButtons > 0 }"
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
        <RouterLink
          :to="item.to"
          class="forumnav__item nav-link d-flex align-items-center w-100 text-start rounded-3 link-body-emphasis"
          :class="[
            { 'is-active': activeKey === item.key },
            { 'justify-content-lg-center': narrow },
          ]"
          :aria-current="activeKey === item.key ? 'page' : null"
          :title="narrow ? item.label : null"
          @click="onSelect(item)"
        >
          <i class="bi fs-5" :class="[item.icon, narrow ? 'me-3 me-lg-0' : 'me-3']"></i>
          <span :class="{ 'd-none': narrow }">{{ item.label }}</span>
        </RouterLink>
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

  .forumnav.is-hidden-mobile {
    display: none;
  }


  .forumnav:not(.is-collapsed) {
    position: fixed;
    left: 0;
    top: var(--navbar-height, 0px);
    bottom: 0;
    width: min(280px, 80vw);
    height: auto;
    overflow-y: auto;
    z-index: 1045;
    box-shadow: var(--bs-box-shadow-lg);
  }
}

.forumnav-backdrop {
  position: fixed;
  inset: var(--navbar-height, 0px) 0 0 0;
  z-index: 1044;
  background: rgba(15, 31, 75, 0.25);
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