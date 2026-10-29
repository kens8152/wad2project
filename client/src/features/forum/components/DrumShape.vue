<script setup>
import { computed } from 'vue'

const props = defineProps({
  kind: { type: String, default: 'tom' },
  color: { type: String, default: '#2563eb' },
  uid: { type: [String, Number], default: 0 },
  lit: { type: Boolean, default: false },
})

const SHAPES = {
  kick: { rx: 70, h: 72, legs: true },
  tom: { rx: 56, h: 62 },
  snare: { rx: 58, h: 34, wires: true },
  tomHigh: { rx: 44, h: 54 },
}
const PAD = 10

const g = computed(() => {
  const s = SHAPES[props.kind] ?? SHAPES.tom
  const rx = s.rx
  const ry = Math.round(rx * 0.2)
  const cx = rx + PAD
  const top = ry + PAD
  const bottom = top + s.h
  const extra = s.legs ? 14 : 0

  const lugs = [-60, -30, 0, 30, 60].map((deg) => {
    const rad = (deg * Math.PI) / 180
    const front = ry * Math.cos(rad)
    return {
      x: cx + rx * Math.sin(rad),
      y1: top + front + 3,
      y2: bottom + front - 3,
      bolt: top + front,
    }
  })

  return {
    rx,
    ry,
    cx,
    top,
    bottom,
    lugs,
    width: (rx + PAD) * 2,
    height: bottom + ry + PAD + extra,
    body: `M${cx - rx} ${top} V${bottom} A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom} V${top} Z`,
    bottomRim: `M${cx - rx} ${bottom} A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom}`,
    wires: s.wires
      ? `M${cx - rx} ${bottom - 9} A${rx} ${ry} 0 0 0 ${cx + rx} ${bottom - 9}`
      : null,
    legs: s.legs
      ? [
          `M${cx - rx + 10} ${bottom + ry * 0.8} L${cx - rx - 4} ${bottom + ry + 10}`,
          `M${cx + rx - 10} ${bottom + ry * 0.8} L${cx + rx + 4} ${bottom + ry + 10}`,
        ]
      : null,
  }
})
</script>

<template>
  <svg
    class="drum"
    :class="{ 'is-lit': lit }"
    :viewBox="`0 0 ${g.width} ${g.height}`"
    :style="{ color, width: `calc(var(--u, 0.8px) * ${g.width})` }"
  >
    <defs>
      <linearGradient :id="`shade-${uid}`" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.3" />
        <stop offset="0.3" stop-color="#fff" stop-opacity="0.22" />
        <stop offset="0.6" stop-color="#000" stop-opacity="0.02" />
        <stop offset="1" stop-color="#000" stop-opacity="0.34" />
      </linearGradient>
    </defs>

    <template v-if="g.legs">
      <path
        v-for="(d, i) in g.legs"
        :key="'leg' + i"
        :d="d"
        fill="none"
        stroke="#9aa2b0"
        stroke-width="5"
        stroke-linecap="round"
      />
    </template>

    <path :d="g.body" fill="currentColor" />
    <path :d="g.body" :fill="`url(#shade-${uid})`" />

    <path
      v-if="g.wires"
      :d="g.wires"
      fill="none"
      stroke="rgba(0,0,0,0.4)"
      stroke-width="1.6"
      stroke-dasharray="2 2.5"
    />

    <path :d="g.bottomRim" fill="none" stroke="#aab1bd" stroke-width="5" stroke-linecap="round" />

    <rect
      v-for="(l, i) in g.lugs"
      :key="'lug' + i"
      :x="l.x - 3"
      :y="l.y1"
      width="6"
      :height="l.y2 - l.y1"
      rx="2.5"
      fill="#dfe3ea"
      stroke="#9aa2b0"
      stroke-width="1"
    />

    <ellipse :cx="g.cx" :cy="g.top" :rx="g.rx" :ry="g.ry" fill="#f7f2e8" />
    <ellipse class="drum__glow" :cx="g.cx" :cy="g.top" :rx="g.rx - 4" :ry="g.ry - 2" fill="currentColor" />
    <ellipse
      :cx="g.cx"
      :cy="g.top"
      :rx="g.rx"
      :ry="g.ry"
      fill="none"
      stroke="#cdd2db"
      stroke-width="5"
    />
    <ellipse
      :cx="g.cx"
      :cy="g.top"
      :rx="g.rx - 3"
      :ry="g.ry - 2"
      fill="none"
      stroke="rgba(255,255,255,0.75)"
      stroke-width="1"
    />
    <circle
      v-for="(l, i) in g.lugs"
      :key="'bolt' + i"
      :cx="l.x"
      :cy="l.bolt"
      r="2.6"
      fill="#8f97a5"
    />

    <ellipse
      class="drum__ripple"
      :cx="g.cx"
      :cy="g.top"
      :rx="g.rx"
      :ry="g.ry"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    />
  </svg>
</template>

<style scoped>
.drum {
  display: block;
  height: auto;
  overflow: visible;
  transform-origin: 50% 100%;
}

.drum__glow,
.drum__ripple {
  opacity: 0;
}
.drum__ripple {
  transform-box: fill-box;
  transform-origin: center;
}

.drum.is-lit {
  animation: drum-hit 0.6s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.drum.is-lit .drum__glow {
  animation: drum-glow 0.6s ease-out;
}
.drum.is-lit .drum__ripple {
  animation: drum-ripple 0.6s ease-out;
}

@keyframes drum-hit {
  0% {
    transform: scale(1, 1);
    filter: drop-shadow(0 0 0 transparent) brightness(1);
  }
  12% {
    transform: scale(1.05, 0.9);
    filter: drop-shadow(0 0 16px currentColor) brightness(1.2);
  }
  45% {
    transform: scale(0.99, 1.03);
    filter: drop-shadow(0 0 8px currentColor) brightness(1.05);
  }
  100% {
    transform: scale(1, 1);
    filter: drop-shadow(0 0 0 transparent) brightness(1);
  }
}
@keyframes drum-glow {
  0% {
    opacity: 0;
  }
  10% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
  }
}
@keyframes drum-ripple {
  0% {
    opacity: 0.9;
    transform: scale(0.9);
  }
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

@media (prefers-reduced-motion: reduce) {
  .drum.is-lit,
  .drum.is-lit .drum__ripple {
    animation: none;
  }
}
</style>