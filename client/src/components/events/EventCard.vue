<script setup>
const props = defineProps({
  event: Object,
})
</script>

<template>
  <div class="card h-100 event-card">
    <div class="event-image-wrap">
      <img :src="event.image" :alt="event.title" class="event-image" />

      <div class="date-badge" :style="{ borderColor: event.genre.color }">
        <span class="dow" :style="{ color: event.genre.color }">{{ event.dow }}</span>
        <strong>{{ event.dayNumber }}</strong>
        <span class="month">{{ event.month }}</span>
      </div>

      <span class="genre-pill">
        <span class="genre-dot" :style="{ backgroundColor: event.genre.color }"></span>
        {{ event.genre.name }}
      </span>
    </div>

    <div class="card-body">
      <h3 class="h5 mb-1">
        <RouterLink :to="{ name: 'event-detail', params: { id: event.id } }" class="stretched-link event-title">
          {{ event.title }}
        </RouterLink>
      </h3>
      <p class="mb-1 text-secondary">{{ event.venue.name }} · {{ event.distance.toFixed(1) }}km</p>
      <p class="mb-2 text-secondary small">{{ event.timeLabel }}</p>

      <div class="d-flex flex-wrap gap-2">
        <span class="chip chip-tag">#{{ event.tag }}</span>
        <span class="chip chip-price" :style="{ color: event.genre.color }">
          {{ event.price === 0 ? 'Free' : '$' + event.price }}
        </span>
        <span class="chip chip-going">{{ event.going }} going</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-card {
  border-radius: 16px;
  padding: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(20, 35, 90, 0.06);
}
.event-image-wrap {
  position: relative;
}
.event-image {
  width: 100%;
  aspect-ratio: 5 / 3;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}
.date-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  min-width: 52px;
  padding: 4px 8px;
  text-align: center;
  line-height: 1.15;
  background: #fff;
  border: 2px solid;
  border-radius: 10px;
}
.date-badge .dow {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
}
.date-badge strong {
  display: block;
  font-size: 1.3rem;
  color: var(--riffle-ink);
}
.date-badge .month {
  display: block;
  font-size: 0.66rem;
  color: var(--riffle-muted);
}
.genre-pill {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.genre-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 4px;
}
.event-title {
  color: var(--riffle-ink);
  text-decoration: none;
}
.chip {
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}
.chip-tag {
  background: #ece9ff;
  color: #5b45c9;
}
.chip-price {
  background: #f1f4fb;
}
.chip-going {
  background: #e6efff;
  color: #2d5fd0;
}
</style>
