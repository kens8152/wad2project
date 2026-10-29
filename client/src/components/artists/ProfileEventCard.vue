<script setup>
import { ref, computed } from 'vue'

// one event card for the artist profile page
const props = defineProps({
  event: { type: Object, required: true },
})

const imageFailed = ref(false)

// dayOffset 0 or more = has not happened yet
const isUpcoming = computed(() => props.event.dayOffset >= 0)

const priceLabel = computed(() => {
  if (props.event.price === 0) {
    return 'Free'
  }
  return '$' + props.event.price
})

const goingLabel = computed(() => {
  if (isUpcoming.value) {
    return props.event.going + ' going'
  }
  return props.event.going + ' attended'
})
</script>

<template>
  <article
    class="profile-card riffle-card"
    :class="{ 'is-upcoming': isUpcoming }"
    :style="{ '--genre': event.genre.color || '#2563eb' }"
  >
    <div class="profile-card__media">
      <img
        v-if="event.image && !imageFailed"
        :src="event.image"
        :alt="event.title"
        class="profile-card__img"
        @error="imageFailed = true"
      />
      <div v-else class="profile-card__fallback" aria-hidden="true">
        <i class="bi bi-music-note-beamed"></i>
      </div>

      <!-- date badge (top left) -->
      <div class="profile-card__date" aria-hidden="true">
        <span class="profile-card__dow">{{ event.dow }}</span>
        <strong>{{ event.dayNumber }}</strong>
        <span class="profile-card__month">{{ event.month }}</span>
      </div>

      <!-- upcoming / past (top right) -->
      <span class="profile-card__status" :class="{ 'is-past': !isUpcoming }">
        {{ isUpcoming ? 'Upcoming' : 'Past' }}
      </span>

      <!-- genre pill (bottom left) -->
      <span class="profile-card__genre"><i class="dot"></i>{{ event.genre.name }}</span>
    </div>

    <div class="profile-card__body">
      <h3 class="profile-card__title">
        <!-- only upcoming events have an event page to open -->
        <RouterLink
          v-if="isUpcoming"
          :to="{ name: 'event-detail', params: { id: event.id } }"
          class="stretched-link"
        >
          {{ event.title }}
        </RouterLink>
        <span v-else>{{ event.title }}</span>
      </h3>
      <p class="profile-card__venue">{{ event.venue.name }}</p>
      <p class="profile-card__time">{{ event.dateLabel }} · {{ event.timeLabel }}</p>

      <div class="profile-card__chips">
        <span v-if="event.tag" class="chip chip--tag">#{{ event.tag }}</span>
        <span class="chip chip--price">{{ priceLabel }}</span>
        <span class="chip chip--going">{{ goingLabel }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.profile-card {
  position: relative;
  overflow: hidden;
  padding: 0.7rem;
  transition:
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s,
    background 0.3s;
  animation: card-in 0.35s ease backwards;
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* only upcoming events (the ones you can click) get the hover effect */
.profile-card.is-upcoming:hover,
.profile-card.is-upcoming:focus-within {
  transform: translateY(-6px) scale(1.02);
  background: linear-gradient(180deg, color-mix(in srgb, var(--genre) 10%, #fff), #fff 65%);
  box-shadow:
    0 0 0 2px var(--genre),
    0 16px 30px color-mix(in srgb, var(--genre) 35%, transparent);
}

.profile-card__media {
  position: relative;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
}
.profile-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.profile-card__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 3rem;
  color: #fff;
  background: linear-gradient(135deg, var(--genre), color-mix(in srgb, var(--genre) 45%, #7c4dff));
}

.profile-card__date {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 52px;
  padding: 0.25rem 0.5rem 0.3rem;
  border-radius: 10px;
  background: #fff;
  border: 2px solid var(--genre);
  line-height: 1.1;
}
.profile-card__dow {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--genre);
}
.profile-card__date strong {
  font-size: 1.3rem;
  color: var(--riffle-ink);
}
.profile-card__month {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--riffle-muted);
}

.profile-card__status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.75rem;
  font-weight: 800;
}
.profile-card__status.is-past {
  background: rgba(24, 24, 24, 0.75);
  color: #fff;
}

.profile-card__genre {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.8rem;
  font-weight: 700;
}
.profile-card__genre .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
}

.profile-card__body {
  padding: 0.85rem 0.35rem 0.4rem;
}
.profile-card__title {
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.25;
}
.profile-card__title a,
.profile-card__title span {
  color: var(--riffle-ink);
  text-decoration: none;
}
.profile-card__venue,
.profile-card__time {
  margin: 0.2rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.95rem;
}
.profile-card__time {
  font-size: 0.85rem;
  color: var(--riffle-faint);
}

.profile-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.8rem;
}
.chip {
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
}
.chip--tag {
  background: #ece9ff;
  color: #5b45c9;
}
.chip--price {
  background: color-mix(in srgb, var(--genre) 14%, #fff);
  color: var(--genre);
}
.chip--going {
  background: #e6efff;
  color: #2d5fd0;
}
</style>