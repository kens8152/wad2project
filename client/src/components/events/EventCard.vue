<script setup>
const props = defineProps({
  event: Object,
})
</script>

<template>
  <div class="card h-100 event-card" :style="{ borderLeftColor: event.genre.color }">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <small class="text-secondary fw-bold">{{ event.dateLabel }} · {{ event.timeLabel }}</small>
        <span class="badge rounded-pill text-bg-light">{{ event.price === 0 ? 'Free' : '$' + event.price }}</span>
      </div>

      <h3 class="h5 mb-1">
        <RouterLink :to="{ name: 'event-detail', params: { id: event.id } }" class="stretched-link event-title">
          {{ event.title }}
        </RouterLink>
      </h3>
      <p class="mb-1 text-secondary">{{ event.venue.name }} · {{ event.distance.toFixed(1) }}km</p>

      <span class="badge" :style="{ backgroundColor: event.genre.color }">{{ event.genre.name }}</span>
      <small class="text-secondary ms-2">{{ event.going }} going</small>
    </div>
  </div>
</template>

<style scoped>
.event-card {
  border-left: 5px solid;
  border-radius: 12px;
}
.event-title {
  color: var(--riffle-ink);
  text-decoration: none;
}
</style>
