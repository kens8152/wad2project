<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import DrumShape from './DrumShape.vue'
import { playDrum, muted, setMuted } from '../../composables/forum/useDrumSound.js'


const props = defineProps({
  tags: { type: Array, default: () => [] },
  title: { type: String, default: 'Top tags' },
})


const KINDS = [
  { shape: 'kick', sound: 'kick', body: 150, color: '#7c4dff' },
  { shape: 'tom', sound: 'tomLow', body: 118, color: '#ff4d8d' },
  { shape: 'tom', sound: 'tomMid', body: 92, color: '#1f6feb' },
  { shape: 'snare', sound: 'snare', body: 66, color: '#0f9d8a' },
  { shape: 'tomHigh', sound: 'tomHigh', body: 44, color: '#f59e0b' },
]


const ORDER = [4, 2, 1, 3, 5]

const hits = ref([0, 0, 0, 0, 0])

const slots = computed(() =>
  ORDER.filter((rank) => rank <= props.tags.length).map((rank) => {
    const tag = props.tags[rank - 1]
    return { rank, tag, ...KINDS[rank - 1] }
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
const PLACES = ['1st', '2nd', '3rd', '4th', '5th']
</script>

<template>
  <section class="mx-3">
    <h2 class="drums__title h5 mb-2">{{ title }}</h2>

    <div class="drums">
    <div class="d-flex justify-content-end">
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

    <div class="kit">
      <div v-for="s in slots" :key="s.rank" class="slot" :class="{ 'has-medal': s.rank <= 3 }" :style="{ '--c': s.color }">
        <div class="label">
          <svg v-if="s.rank === 1" class="crown" viewBox="0 0 64 36" aria-hidden="true">
            <defs>
              <linearGradient id="crown-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#ffe680" />
                <stop offset="0.55" stop-color="#ffc824" />
                <stop offset="1" stop-color="#e09a00" />
              </linearGradient>
            </defs>
            <g fill="#ffcf2e" stroke="#e6a400" stroke-width="0.8" stroke-linejoin="round">
              <path d="M3 9 L11 14 L9 16.5 Z" />
              <path d="M1 21 L10 20 L10 23 Z" />
              <path d="M61 9 L53 14 L55 16.5 Z" />
              <path d="M63 21 L54 20 L54 23 Z" />
            </g>
            <path d="M19 28 L16.5 11 L24.5 18.5 L32 7 L39.5 18.5 L47.5 11 L45 28 Z" fill="url(#crown-gold)" stroke="#c98a00" stroke-width="1.2" stroke-linejoin="round" />
            <rect x="18.5" y="27.5" width="27" height="5" rx="1.6" fill="#f2b400" stroke="#c98a00" stroke-width="1" />
            <g fill="#ffd84a" stroke="#c98a00" stroke-width="0.8">
              <circle cx="16.5" cy="10.5" r="2.4" />
              <circle cx="24.5" cy="17.5" r="1.7" />
              <circle cx="32" cy="5" r="2.8" />
              <circle cx="39.5" cy="17.5" r="1.7" />
              <circle cx="47.5" cy="10.5" r="2.4" />
            </g>
            <path d="M32 16 L35.5 20.5 L32 25 L28.5 20.5 Z" fill="#7c4dff" stroke="#5b34e6" stroke-width="0.8" />
            <path d="M32 16 L33.6 20.5 L32 25 Z" fill="#a98bff" />
          </svg>
          <RouterLink
            :to="{ name: 'forum-tags', query: { tag: s.tag.name } }"
            class="tag-btn"
            :title="`See posts tagged #${s.tag.name}`"
          >
            <span class="tag-btn__rank">{{ PLACES[s.rank - 1] }}</span>
            <span class="tag-btn__name">#{{ s.tag.name }}</span>
          </RouterLink>
          <p class="label__count">{{ s.tag.count }} {{ postWord(s.tag.count) }}</p>
        </div>

        <button type="button" class="drum-btn" @click="hit(s.rank)">
          <DrumShape
            :key="hits[s.rank - 1]"
            :kind="s.shape"
            :color="s.color"
            :uid="s.rank"
            :body="s.body"
            :lit="hits[s.rank - 1] > 0"
          />
          <span v-if="s.rank <= 3" class="medal" :class="`medal--${s.rank}`" aria-hidden="true">
            <span class="medal__coin">{{ s.rank }}</span>
          </span>
          <span class="visually-hidden">Play the #{{ s.tag.name }} drum</span>
        </button>
      </div>
    </div>
    </div>
  </section>
</template>

<style scoped>
.drums {
  width: fit-content;
  max-width: 100%;
  margin-inline: auto;
  padding: 1rem 1.25rem 1.1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 16px;
  background: var(--riffle-surface);
  box-shadow: var(--riffle-shadow-sm);
}
.drums__title {
  color: var(--riffle-ink);
  font-weight: 800;
}
.kit {
  --u: clamp(0.4px, 0.085vw, 0.85px);
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


.medal {
  position: absolute;
  left: 50%;
  top: calc(var(--u) * -46);
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  pointer-events: none;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
}
.medal::before,
.medal::after {
  content: '';
  position: absolute;
  top: calc(var(--u) * 40);
  width: calc(var(--u) * 18);
  height: calc(var(--u) * 30);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
}
.medal::before {
  left: calc(var(--u) * 9);
  background: var(--ribbon-a);
  transform: rotate(14deg);
}
.medal::after {
  right: calc(var(--u) * 9);
  background: var(--ribbon-b);
  transform: rotate(-14deg);
}
.medal__coin {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: calc(var(--u) * 56);
  height: calc(var(--u) * 56);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, var(--medal-light), var(--medal-mid) 55%, var(--medal-dark));
  box-shadow:
    inset 0 0 0 calc(var(--u) * 3) var(--medal-rim),
    inset 0 0 0 calc(var(--u) * 7) var(--medal-light),
    inset 0 0 0 calc(var(--u) * 8) var(--medal-rim);
  color: var(--medal-text);
  font-size: calc(var(--u) * 28);
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}
.medal--1 {
  --medal-light: #fff4b8;
  --medal-mid: #ffc824;
  --medal-dark: #d99400;
  --medal-rim: #e8a800;
  --medal-text: #7a4f00;
  --ribbon-a: #e8323c;
  --ribbon-b: #c81e2a;
}
.medal--2 {
  --medal-light: #ffffff;
  --medal-mid: #d3d8e0;
  --medal-dark: #9aa3b0;
  --medal-rim: #aab2be;
  --medal-text: #4a5260;
  --ribbon-a: #2f7bff;
  --ribbon-b: #1f5fd6;
}
.medal--3 {
  --medal-light: #ffe0c2;
  --medal-mid: #e09a5c;
  --medal-dark: #a8602a;
  --medal-rim: #b86d33;
  --medal-text: #5e3110;
  --ribbon-a: #ff8a1f;
  --ribbon-b: #e06b00;
}

.label {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 0.35rem;
  text-align: center;
}
.slot.has-medal .label {
  padding-bottom: calc(var(--u) * 56);
}
.crown {
  width: 5rem;
  height: auto;
  margin-bottom: 0.1rem;
  overflow: visible;
  filter: drop-shadow(0 2px 3px rgba(201, 138, 0, 0.35));
  transform-origin: 50% 100%;
  animation: crown-hop 1.6s ease-in-out infinite;
}

@keyframes crown-hop {
  0%,
  100% {
    transform: translateY(0) rotate(0) scale(1, 1);
  }
  12% {
    transform: translateY(0) rotate(0) scale(1.1, 0.88);
  }
  35% {
    transform: translateY(-9px) rotate(-5deg) scale(0.96, 1.06);
  }
  55% {
    transform: translateY(0) rotate(0) scale(1.06, 0.92);
  }
  65% {
    transform: translateY(-3px) rotate(3deg) scale(1, 1);
  }
  75% {
    transform: translateY(0) rotate(0) scale(1, 1);
  }
}

.tag-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 5rem;
  padding: 0 0.25rem 0.25rem;
  border-radius: 14px;
  background: var(--c);
  text-align: center;
  white-space: nowrap;
  text-decoration: none;
  box-shadow:
    0 3px 0 color-mix(in srgb, var(--c) 65%, #000),
    0 6px 14px color-mix(in srgb, var(--c) 30%, transparent);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tag-btn:hover,
.tag-btn:focus-visible {
  transform: translateY(-2px);
  box-shadow:
    0 5px 0 color-mix(in srgb, var(--c) 65%, #000),
    0 10px 20px color-mix(in srgb, var(--c) 35%, transparent);
}
.tag-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--c) 65%, #000);
}
.tag-btn__rank {
  padding: 0.2rem 0.5rem 0.15rem;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-transform: uppercase;
}
.tag-btn__name {
  padding: 0.3rem 0.7rem;
  border-radius: 10px;
  background: var(--riffle-surface);
  color: color-mix(in srgb, var(--c) 85%, var(--riffle-ink));
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
}
.label__count {
  display: inline-block;
  margin: 0.4rem 0 0;
  padding: 0.1rem 0.65rem;
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 14%, var(--riffle-surface));
  color: color-mix(in srgb, var(--c) 85%, var(--riffle-ink));
  font-size: 0.75rem;
  font-weight: 700;
}

@media (max-width: 575.98px) {
  .kit {
    gap: 0.25rem;
  }
  .label {
    width: 0;
    min-width: 100%;
  }
  .tag-btn {
    width: 100%;
    min-width: 0;
    padding: 0 0.15rem 0.15rem;
    border-radius: 10px;
  }
  .tag-btn__rank {
    padding: 0.1rem 0;
    font-size: 0.55rem;
  }
  .tag-btn__name {
    min-width: 0;
    padding: 0.2rem 0.2rem;
    border-radius: 7px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.68rem;
  }
  .label__count {
    padding: 0.05rem 0.4rem;
    font-size: 0.62rem;
  }
  .crown {
    width: 3.2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crown {
    animation: none;
  }
  .drum-btn {
    transition: none;
  }
  .drum-btn:hover,
  .drum-btn:active {
    transform: none;
  }
}
</style>