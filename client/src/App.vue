<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
</script>

<template>
  <AppNavbar />
  <main class="app-main">
    <RouterView />
  </main>
  <ToastHost />
</template>

<style scoped>
.app-main {
  min-height: calc(100vh - var(--navbar-height));
}
</style>
