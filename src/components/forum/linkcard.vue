<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const imageFailed = ref(false)
const showImage = computed(() => props.item.image && !imageFailed.value)
const isEvent = computed(() => props.item.type === 'event')
const priceLabel = computed(() => (props.item.price > 0 ? `$${props.item.price}` : 'Free'))
const upcoming = computed(() => props.item.upcomingCount ?? 0)
const upcomingLabel = computed(() => `${upcoming.value} ${upcoming.value === 1 ? 'upcoming event' : 'upcoming events'}`)
const upper = (text) => (text ? String(text).toUpperCase() : '')
</script>

<template>
  <article v-if="isEvent" class="link-card event-card riffle-card" :style="{ '--genre': item.genreColor || '#2563eb' }">
    <div class="event-card__media">
      <img
        v-if="showImage"
        :src="item.image"
        :alt="item.title"
        class="event-card__img"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="link-card__fallback">
        <i class="bi bi-calendar-event"></i>
      </div>

      <div v-if="item.dayNumber != null" class="event-card__date" aria-hidden="true">
        <span class="event-card__dow">{{ upper(item.dow) }}</span>
        <strong>{{ item.dayNumber }}</strong>
        <span class="event-card__month">{{ upper(item.month) }}</span>
      </div>

      <span v-if="item.genreName" class="link-card__genre event-card__genre"><i class="dot"></i>{{ item.genreName }}</span>
    </div>

    <div class="event-card__body">
      <h3 class="link-card__title">{{ item.title }}</h3>
      <p v-if="item.venueName" class="link-card__line">{{ item.venueName }}</p>
      <p v-if="item.timeLabel" class="link-card__time">{{ item.timeLabel }}</p>

      <span class="chip event-card__price">{{ priceLabel }}</span>

      <div class="link-card__chips event-card__chips">
        <span v-if="item.tag" class="chip chip--tag">#{{ item.tag }}</span>
        <span class="chip chip--going">{{ item.going }} going</span>
      </div>
    </div>
  </article>

  <article v-else class="link-card artist-card riffle-card" :style="{ '--genre': item.genreColor || '#2563eb' }">
    <div class="artist-card__media">
      <img
        v-if="showImage"
        :src="item.image"
        :alt="item.title"
        class="artist-card__img"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="link-card__fallback">
        <i class="bi bi-music-note-beamed"></i>
      </div>
    </div>

    <span v-if="item.genreName" class="link-card__genre artist-card__genre"><i class="dot"></i>{{ item.genreName }}</span>

    <div class="artist-card__body">
      <h3 class="link-card__title">{{ item.title }}</h3>
      <p v-if="item.venues.length" class="link-card__line">{{ item.venues.join(', ') }}</p>
      <p v-if="item.nextEvent" class="link-card__time">
        Next: {{ item.nextEvent.dateLabel }} · {{ item.nextEvent.timeLabel }}
      </p>

      <div class="link-card__chips artist-card__chips">
        <span v-if="item.tag" class="chip chip--tag">#{{ item.tag }}</span>
        <span class="chip chip--count">{{ upcomingLabel }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.link-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.7rem;
  transition:
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.3s,
    background 0.3s;
  animation: link-card-in 0.35s ease backwards;
}
@keyframes link-card-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.link-card:hover {
  transform: translateY(-6px) scale(1.02);
  background: linear-gradient(180deg, color-mix(in srgb, var(--genre) 10%, var(--riffle-surface)), var(--riffle-surface) 65%);
  box-shadow:
    0 0 0 2px var(--genre),
    0 16px 30px color-mix(in srgb, var(--genre) 35%, transparent);
}

.link-card::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 45%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: skewX(-18deg);
  opacity: 0;
  pointer-events: none;
}
.link-card:hover::after {
  opacity: 1;
  animation: link-card-shine 1.9s ease-in-out infinite;
}
@keyframes link-card-shine {
  0% {
    left: -60%;
  }
  80%,
  100% {
    left: 130%;
  }
}

.link-card__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 3rem;
  color: #fff;
  background: linear-gradient(135deg, var(--genre), color-mix(in srgb, var(--genre) 45%, #7c4dff));
}

.link-card__genre {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  color: var(--riffle-ink);
  font-size: 0.8rem;
  font-weight: 700;
}
.link-card__genre .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
}

.link-card__title {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.25;
  color: var(--riffle-ink);
}
.link-card__line,
.link-card__time {
  margin: 0.2rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.95rem;
}
.link-card__time {
  font-size: 0.85rem;
  color: var(--riffle-faint);
}

.link-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: auto;
  padding-top: 0.8rem;
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
.chip--going {
  background: #e6efff;
  color: #2d5fd0;
}
.chip--count {
  background: color-mix(in srgb, var(--genre) 14%, var(--riffle-surface));
  color: var(--genre);
}

.event-card__media {
  position: relative;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
}
.event-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.event-card__date {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 52px;
  padding: 0.25rem 0.5rem 0.3rem;
  border-radius: 10px;
  background: var(--riffle-surface);
  border: 2px solid var(--genre);
  line-height: 1.1;
}
.event-card__dow {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--genre);
}
.event-card__date strong {
  font-size: 1.35rem;
  color: var(--riffle-ink);
}
.event-card__month {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--riffle-muted);
}
.event-card__genre {
  position: absolute;
  left: 10px;
  bottom: 10px;
  background: var(--riffle-surface);
}
.event-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0.85rem 0.35rem 0.4rem;
}
.event-card__chips {
  padding-right: 3rem;
}
.event-card__price {
  position: absolute;
  right: 0.9rem;
  bottom: 0.7rem;
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  padding: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--genre) 14%, var(--riffle-surface));
  color: var(--genre);
}

.artist-card__media {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0.4rem auto 0;
  border: 3px solid var(--genre);
}
.artist-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.artist-card__genre {
  margin: 0.5rem auto 0;
  background: var(--riffle-surface-soft);
}
.artist-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.35rem 0.4rem;
  text-align: center;
}
.artist-card__chips {
  justify-content: center;
}

:root[data-theme='dark'] .link-card::after {
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.12), transparent);
}
:root[data-theme='dark'] .chip--tag {
  background: rgba(124, 77, 255, 0.2);
  color: #cdbfff;
}
:root[data-theme='dark'] .chip--going {
  background: rgba(45, 95, 208, 0.25);
  color: #b7ccff;
}

@media (prefers-reduced-motion: reduce) {
  .link-card {
    animation: none;
    transition: none;
  }
  .link-card:hover::after {
    animation: none;
  }
}
</style>
