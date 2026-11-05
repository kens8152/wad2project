<script setup>
import { computed } from 'vue'
import EventCover from './EventCover.vue'
import { cardStamp } from '../../utils/events/date'
import { formatDistance } from '../../utils/events/geo'

const props = defineProps({
  event: { type: Object, required: true },
  active: { type: Boolean, default: false },
})
defineEmits(['open', 'hover', 'select'])

const stamp = computed(() => cardStamp(props.event.startsAt))
const priceLabel = computed(() => (props.event.free ? 'Free' : `$${props.event.price}`))
const friendsLabel = computed(() => {
  const n = props.event.friends.length
  return `${n} friend${n === 1 ? '' : 's'}`
})
</script>

<template>
  <article
    class="map-card"
    :class="{ 'is-active': active }"
    :style="{ '--genre': event.genre.color }"
    @mouseenter="$emit('hover', event.id)"
    @mouseleave="$emit('hover', null)"
  >
    <RouterLink
      :to="{ name: 'event-detail', params: { id: event.id } }"
      class="map-card__link"
      :aria-label="`${event.title}, ${stamp}. View event`"
      @focus="$emit('hover', event.id)"
      @blur="$emit('hover', null)"
    >
      <div class="map-card__thumb">
        <EventCover :palette="event.palette" :seed="event.id" />
        <i class="map-card__dot" :title="event.genre.label"></i>
      </div>

      <div class="map-card__info">
        <div class="map-card__head">
          <span class="map-card__stamp">{{ stamp }}</span>
          <span class="map-card__price">{{ priceLabel }}</span>
        </div>
        <h3 class="map-card__title">{{ event.headliner.name }}</h3>
        <p class="map-card__venue">{{ event.venue.label }} · {{ formatDistance(event.distanceKm) }}</p>
        <p class="map-card__meta">
          <span class="map-card__genre">{{ event.genre.label }}</span>
          · {{ event.going }} going<template v-if="event.friends.length"> · {{ friendsLabel }}</template>
        </p>
      </div>
    </RouterLink>
  </article>
</template>

<style scoped>
.map-card {
  width: 100%;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--genre) 22%, var(--riffle-border));
  /* a soft wash of the genre colour from the top right corner, over the normal card colour */
  background:
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--genre) 13%, transparent), transparent 60%),
    var(--riffle-surface);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--genre) 14%, rgba(20, 35, 90, 0.12));
  transition: transform 0.15s, box-shadow 0.15s;
}
.map-card:hover {
  border-color: color-mix(in srgb, var(--genre) 45%, var(--riffle-border));
  transform: translateY(-4px);
  box-shadow: 0 12px 30px color-mix(in srgb, var(--genre) 28%, rgba(20, 35, 90, 0.16));
}
/* the card of the pin that was clicked: it pops up in its genre colour and gets a "Selected" tag */
.map-card.is-active {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, color-mix(in srgb, var(--genre) 12%, var(--riffle-surface)), var(--riffle-surface) 70%);
  transform: translateY(-6px) scale(1.04);
  box-shadow:
    0 0 0 2px var(--genre),
    0 14px 24px color-mix(in srgb, var(--genre) 40%, transparent);
  animation: card-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* a light sweep across the card, once */
.map-card.is-active::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 45%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75), transparent);
  transform: skewX(-18deg);
  animation: card-shine 1.9s ease-in-out infinite; /* keeps shining while the event is selected */
  pointer-events: none;
}
@keyframes card-pop {
  0% {
    transform: translateY(0) scale(0.94);
  }
  100% {
    transform: translateY(-6px) scale(1.04);
  }
}
@keyframes card-shine {
  0% {
    left: -60%;
  }
  80%,
  100% {
    left: 130%;
  }
}
.map-card__link {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 0.9rem 0.7rem 0.75rem;
  color: inherit;
  text-decoration: none;
}
.map-card__thumb {
  position: relative;
  flex: none;
  width: 78px;
  height: 78px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 0 2px var(--riffle-surface), 0 0 0 4px color-mix(in srgb, var(--genre) 55%, transparent); /* a ring in the genre colour */
}
.map-card__thumb :deep(.event-cover) {
  width: 100%;
  height: 100%;
  border-radius: 0;
}
.map-card__dot {
  position: absolute;
  left: 6px;
  bottom: 6px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--genre);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.map-card__info {
  min-width: 0;
  flex: 1;
}
.map-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.1rem;
}
.map-card__stamp {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: color-mix(in srgb, var(--genre) 75%, var(--riffle-ink)); /* the genre colour, nudged towards the text colour so it reads in light and dark */
  white-space: nowrap;
}
.map-card__price {
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--genre);
  background: color-mix(in srgb, var(--genre) 14%, var(--riffle-surface));
}
.map-card__title {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.map-card__venue,
.map-card__meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--riffle-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.map-card__meta {
  color: var(--riffle-faint);
}
.map-card__genre {
  font-weight: 800;
  color: color-mix(in srgb, var(--genre) 75%, var(--riffle-ink));
}

/* Dark mode: softer shine on the selected card */
:root[data-theme='dark'] .map-card.is-active::after {
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.12), transparent);
}
</style>
