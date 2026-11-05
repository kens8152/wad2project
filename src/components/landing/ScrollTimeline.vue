<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  length: { type: Number, default: 222 },
})

const progress = ref(0)
const track = ref('Intro')
let scroller = null
let sections = []

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

function update() {
  if (!scroller) return
  const max = scroller.scrollHeight - scroller.clientHeight
  progress.value = max > 0 ? scroller.scrollTop / max : 0
  const middle = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.4
  for (const s of sections) {
    const box = s.getBoundingClientRect()
    if (box.top <= middle && box.bottom > middle) track.value = s.dataset.track
  }
}

onMounted(() => {
  scroller = document.querySelector('.app-main')
  sections = [...document.querySelectorAll('[data-track]')]
  scroller?.addEventListener('scroll', update, { passive: true })
  update()
})
onBeforeUnmount(() => scroller?.removeEventListener('scroll', update))
</script>

<template>
  <div class="timeline" role="progressbar" aria-label="Page progress" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(progress * 100)">
    <span class="timeline__now"><i class="bi bi-music-note-beamed"></i> {{ track }}</span>
    <span class="timeline__time">{{ clock(progress * props.length) }}</span>
    <span class="timeline__bar">
      <span class="timeline__fill" :style="{ transform: `scaleX(${progress})` }"></span>
      <span class="timeline__head" :style="{ left: progress * 100 + '%' }"></span>
    </span>
    <span class="timeline__time">{{ clock(props.length) }}</span>
  </div>
</template>

<style scoped>
.timeline {
  position: sticky;
  top: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.45rem 1rem;
  background: color-mix(in srgb, var(--riffle-surface) 82%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--riffle-border);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--riffle-muted);
}
.timeline__now {
  min-width: 8.5rem;
  color: var(--riffle-ink);
  white-space: nowrap;
}
.timeline__now i {
  color: #ff4d8d;
}
.timeline__time {
  font-variant-numeric: tabular-nums;
}
.timeline__bar {
  position: relative;
  flex: 1;
  height: 4px;
  border-radius: 4px;
  background: var(--riffle-border);
}
.timeline__fill {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: linear-gradient(90deg, #ff4d8d, #7c4dff);
  transform-origin: left;
}
.timeline__head {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 0 3px #7c4dff;
  transform: translate(-50%, -50%);
}
@media (max-width: 575.98px) {
  .timeline__now {
    min-width: 0;
  }
  .timeline__time:first-of-type {
    display: none;
  }
}
</style>
