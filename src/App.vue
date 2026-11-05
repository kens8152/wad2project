<script setup>
import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
import EventsTourHost from '@/components/events/EventsTourHost.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const subscription = userStore.startAuth()

const router = useRouter()
const scrollPositions = new Map()
const historyPosition = () => window.history.state?.position ?? 0
let lastPosition = historyPosition()
let stopRestore = null

router.beforeEach((to, from) => {
  const main = document.querySelector('.app-main')
  if (main && from.matched.length) scrollPositions.set(lastPosition, main.scrollTop)
})

router.afterEach(() => {
  stopRestore?.()
  const position = historyPosition()
  const wentBack = position < lastPosition
  lastPosition = position
  const main = document.querySelector('.app-main')
  const saved = wentBack ? scrollPositions.get(position) : undefined
  if (!main) return
  if (saved) restoreScroll(saved)
  else main.scrollTop = 0
})

function restoreScroll(top) {
  const started = performance.now()
  let timer = 0
  const cancelEvents = ['wheel', 'touchstart', 'keydown', 'mousedown']
  const stop = () => {
    clearTimeout(timer)
    cancelEvents.forEach((name) => window.removeEventListener(name, stop))
    stopRestore = null
  }
  const step = () => {
    const main = document.querySelector('.app-main')
    const elapsed = performance.now() - started
    if (!main || elapsed > 1500) return stop()
    main.scrollTop = top
    if (elapsed > 400 && Math.abs(main.scrollTop - top) <= 1) return stop()
    timer = setTimeout(step, 16)
  }
  cancelEvents.forEach((name) => window.addEventListener(name, stop, { passive: true }))
  stopRestore = stop
  timer = setTimeout(step, 0)
}

onBeforeUnmount(() => {
  subscription.unsubscribe()
  stopRestore?.()
})
</script>

<template>
  <template v-if="userStore.authReady">
    <AppNavbar />
    <main class="app-main d-flex flex-column">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="userStore.user?.id" />
        </Transition>
      </RouterView>
    </main>
    <ToastHost />
    <!-- the guide for the Events map and list (it moves between the two pages, so it lives here) -->
    <EventsTourHost />
  </template>
  <p v-else class="text-center p-4">Loading Riffle…</p>
</template>

<style>
/* Only .app-main scrolls, never the whole page */
html,
body {
  overflow: hidden;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<style scoped>
.app-main {
  flex: 1;
  min-height: 0;
  height: auto;
  overflow-y: auto;
  /* the page background behind every page: the soft glow with a faint dot grid on top.
     "local" makes the dots scroll along with the page */
  background:
    radial-gradient(var(--riffle-dots) 1.2px, transparent 1.2px) 0 0 / 30px 30px local,
    var(--riffle-glow);
}
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
