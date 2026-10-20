<script setup>
import { onBeforeUnmount } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const subscription = userStore.startAuth()

onBeforeUnmount(() => {
  subscription.unsubscribe()
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
  </template>
  <p v-else class="text-center p-4">Loading Riffle…</p>
</template>

<style scoped>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
  min-height: 0;
  height: auto;
}
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
