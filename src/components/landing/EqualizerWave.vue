<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { prefersReducedMotion } from '@/composables/landing/useLandingMotion'

const props = defineProps({
  bars: { type: Number, default: 64 },
  energy: { type: Number, default: 0.6 },
})

const root = ref(null)
const heights = ref(Array.from({ length: props.bars }, (_, i) => 0.25 + 0.2 * Math.sin(i / 3)))

let frame = 0
let visible = true
let observer = null
let boost = 0
let scroller = null

function onScroll() {
  boost = Math.min(boost + 0.25, 1)
}

function tick(time) {
  frame = requestAnimationFrame(tick)
  if (!visible) return
  const t = time / 1000
  boost *= 0.94
  const level = Math.min(props.energy + boost * 0.5, 1)
  heights.value = heights.value.map((_, i) => {
    const wave = Math.sin(t * 2.2 + i * 0.35) * 0.5 + Math.sin(t * 3.7 + i * 0.9) * 0.3 + Math.sin(t * 1.1 - i * 0.18) * 0.2
    return Math.max(0.08, Math.min(1, 0.35 + wave * 0.45 * level + level * 0.2))
  })
}

onMounted(() => {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting))
  observer.observe(root.value)
  scroller = document.querySelector('.app-main')
  scroller?.addEventListener('scroll', onScroll, { passive: true })
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
  scroller?.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div ref="root" class="eq-wave" aria-hidden="true">
    <span v-for="(h, i) in heights" :key="i" class="eq-wave__bar" :style="{ transform: `scaleY(${h})` }"></span>
  </div>
</template>

<style scoped>
.eq-wave {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  width: 100%;
  height: 100%;
}
.eq-wave__bar {
  flex: 1;
  height: 100%;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(180deg, #ff4d8d, #7c4dff);
  transform-origin: bottom;
  opacity: 0.85;
}
</style>
