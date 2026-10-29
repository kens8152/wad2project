<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const imageFailed = ref(false)
const showImage = computed(() => props.item.image && !imageFailed.value)
const isEvent = computed(() => props.item.type === 'event')
const priceLabel = computed(() => (props.item.price > 0 ? `$${props.item.price}` : 'Free'))
const eventsLabel = computed(
  () => `${props.item.eventCount} ${props.item.eventCount === 1 ? 'event' : 'events'}`,
)
</script>

<template>
  <article class="link-card riffle-card" :style="{ '--genre': item.genreColor || '#2563eb' }">
    <div class="link-card__media">
      <img
        v-if="showImage"
        :src="item.image"
        :alt="item.title"
        class="link-card__img"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="link-card__fallback">
        <i class="bi" :class="isEvent ? 'bi-calendar-event' : 'bi-music-note-beamed'"></i>
      </div>

      <div v-if="isEvent && item.dayNumber != null" class="link-card__date">
        <span class="link-card__dow">{{ item.dow }}</span>
        <strong>{{ item.dayNumber }}</strong>
        <span class="link-card__month">{{ item.month }}</span>
      </div>

      <span v-if="item.genreName" class="link-card__genre"><i class="dot"></i>{{ item.genreName }}</span>
    </div>

    <div class="link-card__body">
      <h3 class="link-card__title">{{ item.title }}</h3>

      <template v-if="isEvent">
        <p v-if="item.venueName" class="link-card__line">{{ item.venueName }}</p>
        <p v-if="item.timeLabel" class="link-card__time">{{ item.timeLabel }}</p>
      </template>
      <template v-else>
        <p v-if="item.venues.length" class="link-card__line">{{ item.venues.join(', ') }}</p>
        <p v-if="item.nextEvent" class="link-card__time">
          Next: {{ item.nextEvent.dateLabel }} · {{ item.nextEvent.timeLabel }}
        </p>
      </template>

      <div class="link-card__chips">
        <span v-if="item.tag" class="chip chip--tag">#{{ item.tag }}</span>
        <template v-if="isEvent">
          <span class="chip chip--price">{{ priceLabel }}</span>
          <span class="chip chip--going">{{ item.going }} going</span>
        </template>
        <span v-else class="chip chip--price">{{ eventsLabel }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.link-card {
  position: relative;
  overflow: hidden;
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
  background: linear-gradient(180deg, color-mix(in srgb, var(--genre) 10%, #fff), #fff 65%);
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

.link-card__media {
  position: relative;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
}
.link-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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

.link-card__date {
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
.link-card__dow {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--genre);
}
.link-card__date strong {
  font-size: 1.35rem;
  color: var(--riffle-ink, #1f2430);
}
.link-card__month {
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--riffle-muted, #6b7280);
}

.link-card__genre {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: #fff;
  color: var(--riffle-ink, #1f2430);
  font-size: 0.8rem;
  font-weight: 700;
}
.link-card__genre .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
}

.link-card__body {
  padding: 0.85rem 0.35rem 0.4rem;
}
.link-card__title {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.25;
  color: var(--riffle-ink, #1f2430);
}
.link-card__line,
.link-card__time {
  margin: 0.2rem 0 0;
  color: var(--riffle-muted, #6b7280);
  font-size: 0.95rem;
}
.link-card__time {
  font-size: 0.85rem;
  color: var(--riffle-faint, #9ca3af);
}

.link-card__chips {
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