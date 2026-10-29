<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import DrumShape from './DrumShape.vue'
import { playDrum, muted, setMuted } from '../../composables/forum/useDrumSound.js'
import { tagColor } from '../../composables/forum/tagColor.js'


const props = defineProps({
  tags: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
  title: { type: String, default: 'Top tags' },
})
const emit = defineEmits(['select'])


const KINDS = [
  { shape: 'kick', sound: 'kick', height: 130 },
  { shape: 'tom', sound: 'tomLow', height: 104 },
  { shape: 'tom', sound: 'tomMid', height: 84 },
  { shape: 'snare', sound: 'snare', height: 64 },
  { shape: 'tomHigh', sound: 'tomHigh', height: 48 },
]


const ORDER = [4, 2, 1, 3, 5]

const hits = ref([0, 0, 0, 0, 0])

const slots = computed(() =>
  ORDER.filter((rank) => rank <= props.tags.length).map((rank) => {
    const tag = props.tags[rank - 1]
    return { rank, tag, color: tag.color ?? tagColor(tag.key), ...KINDS[rank - 1] }
  }),
)

function hit(rank) {
  hits.value[rank - 1]++
  playDrum(KINDS[rank - 1].sound)
}


function onKeydown(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
  const n = Number(e.key)
  if (n >= 1 && n <= props.tags.length) hit(n)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const postWord = (n) => (n === 1 ? 'post' : 'posts')
</script>

<template>
  <section class="drums px-3">
    <div class="d-flex align-items-center justify-content-between mb-1">
      <h2 class="h6 text-body-secondary mb-0">{{ title }}</h2>
      <button
        type="button"
        class="btn btn-sm btn-link text-body-secondary p-0"
        :title="muted ? 'Turn sound on' : 'Turn sound off'"
        @click="setMuted(!muted)"
      >
        <i class="bi fs-5" :class="muted ? 'bi-volume-mute-fill' : 'bi-volume-up-fill'"></i>
        <span class="visually-hidden">{{ muted ? 'Turn sound on' : 'Turn sound off' }}</span>
      </button>
    </div>

    <div class="podium">
      <div
        v-for="s in slots"
        :key="s.rank"
        class="slot"
        :class="{ 'is-selected': s.tag.key === selected }"
        :style="{ '--c': s.color, '--h': s.height }"
      >
        <button type="button" class="drum-btn" @click="hit(s.rank)">
          <DrumShape
            :key="hits[s.rank - 1]"
            :kind="s.shape"
            :color="s.color"
            :uid="s.rank"
            :lit="hits[s.rank - 1] > 0"
          />
          <span class="visually-hidden">Play the #{{ s.tag.name }} drum</span>
        </button>

        <div class="block">
          <span class="block__rank">{{ s.rank }}</span>
        </div>

        <div class="label">
          <p class="label__name text-truncate" :title="'#' + s.tag.name">#{{ s.tag.name }}</p>
          <p class="label__count">{{ s.tag.count }} {{ postWord(s.tag.count) }}</p>
          <button type="button" class="btn btn-sm btn-link p-0" @click="emit('select', s.tag.name)">
            {{ s.tag.key === selected ? 'Hide posts' : 'See posts' }}
          </button>
        </div>
      </div>
    </div>

    <p class="small text-body-secondary text-center mt-2 mb-0">
      Tap a drum, or press 1{{ slots.length > 1 ? ` to ${slots.length}` : '' }}
    </p>
  </section>
</template>

<style scoped>
.podium {
  --u: clamp(0.4px, 0.085vw, 0.85px);
  --k: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
}

.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  min-width: 3.6rem;
}

.drum-btn {
  position: relative;
  z-index: 1;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  margin-bottom: calc(var(--u) * -9);
  transition: transform 0.15s ease;
}
.drum-btn:hover {
  transform: translateY(-3px);
}
.drum-btn:active {
  transform: translateY(0) scale(0.98);
}
.drum-btn:focus-visible {
  outline: 3px solid var(--c);
  outline-offset: 4px;
  border-radius: 0.5rem;
}

.block {
  display: grid;
  place-items: center;
  align-self: stretch;
  height: calc(var(--h) * var(--k) * 1px);
  border-radius: 0.6rem 0.6rem 0 0;
  color: #fff;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--c) 60%, #fff),
    color-mix(in srgb, var(--c) 85%, #000)
  );
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.4);
}
.block__rank {
  font-size: clamp(1.4rem, 4vw, 2.3rem);
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.slot.is-selected .block {
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.4),
    0 0 0 3px var(--c);
}
.slot.is-selected .label__name {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.label {
  width: 0;
  min-width: 100%;
  padding-top: 0.5rem;
  text-align: center;
}
.label__name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--c);
}
.label__count {
  margin: 0;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}
.label .btn {
  font-size: 0.75rem;
}

@media (max-width: 575.98px) {
  .podium {
    --k: 0.7;
    gap: 0.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drum-btn {
    transition: none;
  }
  .drum-btn:hover,
  .drum-btn:active {
    transform: none;
  }
}
</style>