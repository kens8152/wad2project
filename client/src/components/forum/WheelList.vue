<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  itemKey: { type: String, default: 'id' },
})

const WHEEL = {
  deadZone: 0.3,
  maxTilt: 40,
  minScale: 0.78,
  minOpacity: 0.45,
  perspective: 1200,
  rampDistance: 150,
}

const list = ref(null)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let scrollTarget = window
let frame = 0

function applyWheel() {
  if (!list.value) return
  const items = list.value.querySelectorAll(':scope > .wheel-item')

  if (reduceMotion.matches) {
    items.forEach((el) => {
      el.style.transform = ''
      el.style.opacity = ''
    })
    return
  }

  const area =
    scrollTarget === window
      ? { top: 0, height: window.innerHeight }
      : scrollTarget.getBoundingClientRect()
  const half = area.height / 2 || 1
  const middle = area.top + half

  const scrolled = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop
  const strength = Math.max(0, Math.min(1, scrolled / WHEEL.rampDistance))

  items.forEach((el) => {
    const rect = el.getBoundingClientRect()
    const d = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - middle) / half))
    const t = Math.max(0, (Math.abs(d) - WHEEL.deadZone) / (1 - WHEEL.deadZone)) * strength
    const eased = t * t

    const tilt = -Math.sign(d) * t * WHEEL.maxTilt
    const scale = 1 - (1 - WHEEL.minScale) * eased
    const opacity = 1 - (1 - WHEEL.minOpacity) * eased

    el.style.transform = `perspective(${WHEEL.perspective}px) rotateX(${tilt}deg) scale(${scale})`
    el.style.opacity = String(opacity)
  })
}


function onScrollOrResize() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(applyWheel)
}

watch(() => props.items, () => nextTick(applyWheel))

onMounted(() => {
  scrollTarget = list.value?.closest('.app-main') ?? window
  scrollTarget.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize)
  reduceMotion.addEventListener('change', onScrollOrResize)
  applyWheel()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  scrollTarget.removeEventListener('scroll', onScrollOrResize)
  window.removeEventListener('resize', onScrollOrResize)
  reduceMotion.removeEventListener('change', onScrollOrResize)
})
</script>

<template>
  <div ref="list" class="wheel-list vstack gap-3">
    <div v-for="item in items" :key="item[itemKey]" class="wheel-item">
      <slot :item="item" />
    </div>
  </div>
</template>

<style scoped>
.wheel-list {
  flex: none; 
  overflow-x: clip;
}
.wheel-item {
  position: relative;
  transform-origin: center;
  will-change: transform, opacity;
}

.wheel-item:hover,
.wheel-item:focus-within {
  z-index: 5;
}
</style>
