<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
</script>

<template>
  <AppNavbar />
  <main class="app-main">
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  </main>
  <ToastHost />
</template>

<style scoped>
.app-main {
  min-height: calc(100vh - var(--navbar-height));
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
