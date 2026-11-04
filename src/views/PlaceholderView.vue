<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <section class="container py-5 text-center placeholder-view">
    <i class="bi bi-cone-striped display-4 text-secondary"></i>
    <h1 class="h3 mt-3">{{ route.meta.title }}</h1>
    <p class="text-secondary mb-4">
      This section isn't built yet<span v-if="route.meta.owner"> — it's {{ route.meta.owner }}'s part of the project</span>.
    </p>
    <RouterLink :to="{ name: 'events-map' }" class="btn btn-riffle">Back to Events</RouterLink>
  </section>
</template>

<style scoped>
.placeholder-view {
  max-width: 560px;
}
</style>
