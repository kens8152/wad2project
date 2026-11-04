<script setup>
// Page title with an optional back link above it and a subtitle under it (same sizes as the Artists page)
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  // where the back link goes, e.g. { name: 'profile' }; leave out for no back link
  backTo: { type: [String, Object], default: null },
  backLabel: { type: String, default: 'Back' },
})
</script>

<template>
  <div class="page-header mb-3">
    <RouterLink v-if="backTo" :to="backTo" class="small text-decoration-none">
      <i class="bi bi-arrow-left"></i> {{ backLabel }}
    </RouterLink>
    <h1 class="page-title mt-1 mb-0">{{ title }}</h1>
    <p v-if="subtitle" class="page-subtitle mb-0">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 2.3rem;
  line-height: 1.1;
}
.page-subtitle {
  margin-top: 0.2rem;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--riffle-muted);
}
@media (max-width: 575.98px) {
  .page-title {
    font-size: 2rem;
  }
}
</style>
