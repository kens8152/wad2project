<script setup>
import { computed } from 'vue'

const props = defineProps({
  kind: { type: String, default: 'tom' },
  color: { type: String, default: '#2563eb' },
  uid: { type: [String, Number], default: 0 },
  lit: { type: Boolean, default: false },
  body: { type: Number, default: 0 },
})

const SHAPES = {
  kick: { rx: 70, h: 72 },
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
  const bottom = top + (props.body || s.h)
  const extra = s.legs ? 14 : 0

  const lugs = [-64, -32, 0, 32, 64].map((deg) => {
    const rad = (deg * Math.PI) / 180
    const front = ry * Math.cos(rad)
    const facing = Math.cos(rad)
    return {
      x: cx + rx * Math.sin(rad),
      y1: top + front + 4,
      y2: bottom + front - 4,
      mid: top + front + (bottom - top) / 2,
      bolt: top + front + 1,
      w: 2 + 3.5 * facing,
      casing: 4 + 4 * facing,
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
        <stop offset="0" stop-color="#000" stop-opacity="0.45" />
        <stop offset="0.12" stop-color="#000" stop-opacity="0.15" />
        <stop offset="0.24" stop-color="#fff" stop-opacity="0.18" />
        <stop offset="0.3" stop-color="#fff" stop-opacity="0.55" />
        <stop offset="0.36" stop-color="#fff" stop-opacity="0.15" />
        <stop offset="0.62" stop-color="#000" stop-opacity="0" />
        <stop offset="0.78" stop-color="#fff" stop-opacity="0.12" />
        <stop offset="0.9" stop-color="#000" stop-opacity="0.25" />
        <stop offset="1" stop-color="#000" stop-opacity="0.5" />
      </linearGradient>
      <linearGradient :id="`depth-${uid}`" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.18" />
        <stop offset="0.18" stop-color="#000" stop-opacity="0" />
        <stop offset="0.85" stop-color="#000" stop-opacity="0" />
        <stop offset="1" stop-color="#000" stop-opacity="0.2" />
      </linearGradient>
      <linearGradient :id="`chrome-${uid}`" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#7d8593" />
        <stop offset="0.25" stop-color="#f4f6fa" />
        <stop offset="0.45" stop-color="#aeb5c1" />
        <stop offset="0.7" stop-color="#eef1f5" />
        <stop offset="1" stop-color="#6f7785" />
      </linearGradient>
      <linearGradient :id="`rod-${uid}`" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#8a919e" />
        <stop offset="0.45" stop-color="#ffffff" />
        <stop offset="1" stop-color="#8a919e" />
      </linearGradient>
      <radialGradient :id="`head-${uid}`" cx="0.42" cy="0.4" r="0.7">
        <stop offset="0" stop-color="#fffdf8" />
        <stop offset="0.7" stop-color="#f3ecdd" />
        <stop offset="1" stop-color="#ddd3bf" />
      </radialGradient>
      <radialGradient :id="`floor-${uid}`" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#000" stop-opacity="0.28" />
        <stop offset="1" stop-color="#000" stop-opacity="0" />
      </radialGradient>
    </defs>

    <ellipse :cx="g.cx" :cy="g.bottom + 2" :rx="g.rx * 1.08" :ry="g.ry * 1.25" :fill="`url(#floor-${uid})`" />

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
    <path :d="g.body" :fill="`url(#depth-${uid})`" />

    <path
      v-if="g.wires"
      :d="g.wires"
      fill="none"
      stroke="rgba(0,0,0,0.4)"
      stroke-width="1.6"
      stroke-dasharray="2 2.5"
    />

    <path :d="g.bottomRim" fill="none" :stroke="`url(#chrome-${uid})`" stroke-width="6" stroke-linecap="round" />
    <path :d="g.bottomRim" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1" transform="translate(0 3)" />

    <template v-for="(l, i) in g.lugs" :key="'lug' + i">
      <rect :x="l.x - l.w / 2" :y="l.y1" :width="l.w" :height="l.y2 - l.y1" :rx="l.w / 2" :fill="`url(#rod-${uid})`" />
      <rect
        :x="l.x - l.casing / 2"
        :y="l.mid - 6"
        :width="l.casing"
        height="12"
        rx="2"
        :fill="`url(#rod-${uid})`"
        stroke="rgba(0,0,0,0.25)"
        stroke-width="0.6"
      />
    </template>

    <ellipse :cx="g.cx" :cy="g.top" :rx="g.rx" :ry="g.ry" :fill="`url(#head-${uid})`" />
    <ellipse
      :cx="g.cx"
      :cy="g.top"
      :rx="g.rx * 0.82"
      :ry="g.ry * 0.78"
      fill="none"
      stroke="rgba(150,130,100,0.18)"
      stroke-width="1"
    />
    <ellipse class="drum__glow" :cx="g.cx" :cy="g.top" :rx="g.rx - 4" :ry="g.ry - 2" fill="currentColor" />
    <ellipse
      :cx="g.cx"
      :cy="g.top + 1.5"
      :rx="g.rx"
      :ry="g.ry"
      fill="none"
      stroke="rgba(0,0,0,0.25)"
      stroke-width="5"
    />
    <ellipse
      :cx="g.cx"
      :cy="g.top"
      :rx="g.rx"
      :ry="g.ry"
      fill="none"
      :stroke="`url(#chrome-${uid})`"
      stroke-width="5"
    />
    <ellipse
      :cx="g.cx"
      :cy="g.top - 1"
      :rx="g.rx - 1"
      :ry="g.ry - 1"
      fill="none"
      stroke="rgba(255,255,255,0.8)"
      stroke-width="0.8"
    />
    <circle
      v-for="(l, i) in g.lugs"
      :key="'bolt' + i"
      :cx="l.x"
      :cy="l.bolt"
      :r="1.2 + l.w / 3"
      :fill="`url(#rod-${uid})`"
      stroke="rgba(0,0,0,0.35)"
      stroke-width="0.6"
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