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
      <RouterView :key="userStore.user.id" />
    </main>
    <ToastHost />
  </template>
  <p v-else class="text-center p-4">Loading Riffle…</p>
</template>

<style scoped>
.app-main {
  height: calc(100vh - var(--navbar-height));
}
</style>
