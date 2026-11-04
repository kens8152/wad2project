<script setup>
import { ref } from 'vue'
// the card receives one artist from the parent page
const props = defineProps({
  artist: { type: Object, required: true },
  isFavourite: { type: Boolean, default: false },
})

// tell the parent page when the card or the heart is clicked
const emit = defineEmits(['select', 'toggle-favourite'])
const imageFailed = ref(false)

function handleClick() {
  emit('select', props.artist)
}

function handleHeartClick() {
  emit('toggle-favourite', props.artist)
}
</script>

<template>
  <!-- --genre is the colour used by the CSS below (same idea as the event cards) -->
  <article
    class="artist-card riffle-card"
    tabindex="0"
    :style="{ '--genre': artist.genre.color || '#2563eb' }"
    @click="handleClick"
    @keyup.enter="handleClick"
  >
  <div class="artist-card__media">
      <img v-if="artist.image && !imageFailed" :src="artist.image" :alt="artist.name" class="artist-card__img"
        @error="imageFailed = true" />
      <!-- shown when there is no picture -->
      <div v-else class="artist-card__fallback" aria-hidden="true">
        <i class="bi bi-music-note-beamed"></i>
      </div>

      <span class="artist-card__genre"><i class="dot"></i>{{ artist.genre.name }}</span>

      <!-- .stop stops the click from also opening the artist -->
      <button
        type="button"
        class="artist-card__heart"
        :class="{ 'is-saved': isFavourite }"
        :aria-pressed="isFavourite"
        :aria-label="isFavourite ? 'Remove from favourites' : 'Add to favourites'"
        @click.stop="handleHeartClick"
      >
        <i class="bi" :class="isFavourite ? 'bi-heart-fill' : 'bi-heart'"></i>
      </button>
    </div>

    <div class="artist-card__body">
      <h3 class="artist-card__title">{{ artist.name }}</h3>
      <p class="artist-card__venue">{{ artist.venues.join(', ') }}</p>

      <!-- only show this line if the artist has an upcoming event -->
      <p v-if="artist.nextEvent" class="artist-card__time">
        Next: {{ artist.nextEvent.dateLabel }} · {{ artist.nextEvent.timeLabel }}
      </p>

      <div class="artist-card__chips">
        <span v-if="artist.tag" class="chip chip--tag">#{{ artist.tag }}</span>
        <span class="chip chip--price">{{ artist.events.length }} {{ artist.events.length === 1 ? 'event' : 'events' }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.artist-card {
  position: relative;
  overflow: hidden; /* keeps the shine inside the card */
  padding: 0.7rem;
  cursor: pointer;
  /* springy pop on hover, same feel as the event cards */
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

/* hover (or keyboard focus): the card lifts, takes its genre colour and glows */
.artist-card:hover,
.artist-card:focus-within {
  transform: translateY(-6px) scale(1.02);
  background: linear-gradient(180deg, color-mix(in srgb, var(--genre) 10%, #fff), #fff 65%);
  box-shadow:
    0 0 0 2px var(--genre),
    0 16px 30px color-mix(in srgb, var(--genre) 35%, transparent);
}

/* a light sweep across the card, repeating while it is hovered */
.artist-card::after {
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
.artist-card:hover::after,
.artist-card:focus-within::after {
  opacity: 1;
  animation: artist-card-shine 1.9s ease-in-out infinite;
}
@keyframes artist-card-shine {
  0% {
    left: -60%;
  }
  80%,
  100% {
    left: 130%;
  }
}

.artist-card__media {
  position: relative;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
}
.artist-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.artist-card__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 3rem;
  color: #fff;
  background: linear-gradient(135deg, var(--genre), color-mix(in srgb, var(--genre) 45%, #7c4dff));
}

.artist-card__genre {
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
.artist-card__genre .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
}

.artist-card__heart {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: #ee4a4a;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  transition: transform 0.15s;
}
.artist-card__heart:hover {
  transform: scale(1.08);
}
.artist-card__heart:not(.is-saved) {
  color: var(--riffle-muted);
}

.artist-card__body {
  padding: 0.85rem 0.35rem 0.4rem;
}
.artist-card__title {
  margin: 0;
  font-size: 1.12rem;
  line-height: 1.25;
  color: var(--riffle-ink);
}
.artist-card__venue,
.artist-card__time {
  margin: 0.2rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.95rem;
}
.artist-card__time {
  font-size: 0.85rem;
  color: var(--riffle-faint);
}

.artist-card__chips {
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
</style>