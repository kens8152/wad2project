<script setup>
import { ref } from 'vue'

const props = defineProps({
  up: { type: Number, default: 0 },
  down: { type: Number, default: 0 },
  current: { type: String, default: null },
})

const emit = defineEmits(['vote'])


const ARROW = 'M12 3.4 L20.6 12.2 H15.4 V20.6 H8.6 V12.2 H3.4 Z'

const upArrow = ref(null)
const upFx = ref(null)
const upGlow = ref(null)
const downFx = ref(null)


const reduceMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches


const play = (el, keyframes, options) =>
  el && typeof el.animate === 'function' ? el.animate(keyframes, options) : null

const rand = (min, max) => min + Math.random() * (max - min)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

const NOTES = ['♪', '♫', '♬', '♩']
const NOTE_COLORS = ['#2bbf2b', '#6fdc4f', '#ffd23f', '#ff7ab8', '#4fc3f7', '#b794f6']
const NOTE_COUNT = 12
const MAX_NOTES_ON_SCREEN = 36 

function celebrate() {
  if (reduceMotion()) return


  play(
    upArrow.value,
    [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(2px) scale(0.8)', offset: 0.2 },
      { transform: 'translateY(-7px) scale(1.4)', offset: 0.5 },
      { transform: 'translateY(0) scale(1)' },
    ],
    { duration: 520, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' },
  )

  
  play(
    upGlow.value,
    [
      { transform: 'scale(0.2)', opacity: 0.8 },
      { transform: 'scale(2.2)', opacity: 0 },
    ],
    { duration: 650, easing: 'ease-out' },
  )

  const fx = upFx.value
  if (!fx) return

  for (let i = 0; i < NOTE_COUNT; i++) {
    const note = document.createElement('span')
    note.className = 'note'
    note.textContent = pick(NOTES)
    note.style.color = pick(NOTE_COLORS)
    note.style.fontSize = `${rand(16, 32)}px`
    fx.appendChild(note)

    
    const dx = rand(-50, 100)
    const rise = rand(110, 200)
    const turn = rand(-55, 55)
    const sway = rand(12, 30) * (Math.random() < 0.5 ? -1 : 1)
    const at = (x, y, scale, rot) =>
      `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale}) rotate(${rot}deg)`

    const animation = play(
      note,
      [
        { transform: at(0, 0, 0.3, 0), opacity: 0 },
        { transform: at(dx * 0.15, -rise * 0.2, 1, turn * 0.2), opacity: 1, offset: 0.15 },
        { transform: at(dx * 0.45 + sway, -rise * 0.55, 1.05, turn * 0.6), opacity: 1, offset: 0.5 },
        { transform: at(dx, -rise, 0.8, turn), opacity: 0 },
      ],
      {
        duration: rand(1100, 1700),
        delay: i * 35 + rand(0, 80), 
        easing: 'cubic-bezier(0.22, 0.7, 0.3, 1)',
        fill: 'both',
      },
    )

    if (animation) animation.onfinish = animation.oncancel = () => note.remove()
    else note.remove()
  }


  const notes = fx.querySelectorAll('.note')
  for (let i = 0; i < notes.length - MAX_NOTES_ON_SCREEN; i++) notes[i].remove()
}


const SOUR_NOTES = ['♭', '♭', '♪', '♩']
const SOUR_COLORS = ['#ec1c24', '#ec1c24', '#d63a3a', '#b42318', '#6b7694', '#5b6478']
const SOUR_COUNT = 12
const SINK_MS = 1800

function sink() {
  if (reduceMotion()) return

  const fx = downFx.value
  if (!fx) return

  
  const layer = fx.closest('.wheel-item')
  if (layer) {
    layer.style.zIndex = '6'
    clearTimeout(layer._sinkTimer)
    layer._sinkTimer = setTimeout(() => (layer.style.zIndex = ''), SINK_MS)
  }

  for (let i = 0; i < SOUR_COUNT; i++) {
    const note = document.createElement('span')
    const symbol = pick(SOUR_NOTES)
    note.className = 'note'
    note.textContent = symbol
    note.style.color = pick(SOUR_COLORS)
    note.style.fontSize = `${rand(18, 32)}px`
    fx.appendChild(note)

    const dx = rand(-70, 90)
    const hop = rand(10, 26)
    const fall = rand(110, 190)
    
    const startTurn = symbol === '♭' ? rand(-15, 15) : rand(160, 200)
    const tumble = rand(-90, 90)
    const at = (x, y, scale, rot) =>
      `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale}) rotate(${rot}deg)`

    const animation = play(
      note,
      [
        { transform: at(0, 0, 0.4, startTurn), opacity: 0 },
        { transform: at(dx * 0.2, -hop, 1, startTurn + tumble * 0.15), opacity: 0.95, offset: 0.2 },
        { transform: at(dx * 0.6, fall * 0.4, 0.95, startTurn + tumble * 0.6), opacity: 0.8, offset: 0.6 },
        { transform: at(dx, fall, 0.85, startTurn + tumble), opacity: 0 },
      ],
      {
        duration: rand(1200, 1600),
        delay: i * 30 + rand(0, 80),
        easing: 'cubic-bezier(0.5, 0, 0.85, 0.5)',
        fill: 'both',
      },
    )

    if (animation) animation.onfinish = animation.oncancel = () => note.remove()
    else note.remove()
  }

  const notes = fx.querySelectorAll('.note')
  for (let i = 0; i < notes.length - MAX_NOTES_ON_SCREEN; i++) notes[i].remove()
}


function onUp() {
  const adding = props.current !== 'up'
  emit('vote', 'up')
  if (adding) celebrate()
}

function onDown() {
  const adding = props.current !== 'down'
  emit('vote', 'down')
  if (adding) sink()
}
</script>

<template>
  <button
    type="button"
    class="vote-btn up btn btn-sm btn-link p-0 text-decoration-none position-relative z-2"
    :class="{ active: current === 'up' }"
    :aria-pressed="current === 'up'"
    aria-label="Upvote"
    @click="onUp"
  >
    <span ref="upArrow" class="arrow-wrap">
      <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path :d="ARROW" /></svg>
    </span>
    <span class="count">
      <Transition name="roll-up" mode="out-in"><span :key="up">{{ up }}</span></Transition>
    </span>
    <span ref="upFx" class="fx" aria-hidden="true"><span ref="upGlow" class="glow"></span></span>
  </button>

  <button
    type="button"
    class="vote-btn down btn btn-sm btn-link p-0 text-decoration-none position-relative z-2"
    :class="{ active: current === 'down' }"
    :aria-pressed="current === 'down'"
    aria-label="Downvote"
    @click="onDown"
  >
    <span class="arrow-wrap">
      <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path :d="ARROW" /></svg>
    </span>
    <span class="count">
      <Transition name="roll-down" mode="out-in"><span :key="down">{{ down }}</span></Transition>
    </span>
    <span ref="downFx" class="fx" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.vote-btn {
  --vote-up: #2bbf2b;
  --vote-down: #ec1c24;
  --bs-btn-color: var(--bs-secondary-color);
  --bs-btn-hover-color: var(--bs-secondary-color);
  --bs-btn-active-color: var(--bs-secondary-color);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.vote-btn.up {
  --accent: var(--vote-up);
  --glow: rgba(43, 191, 43, 0.6);
}
.vote-btn.down {
  --accent: var(--vote-down);
  --glow: rgba(236, 28, 36, 0.55);
}
.vote-btn.active {
  --bs-btn-color: var(--accent);
  --bs-btn-hover-color: var(--accent);
  --bs-btn-active-color: var(--accent);
  font-weight: 600;
}


.arrow-wrap {
  display: inline-flex;
}
.arrow {
  width: 1.4rem;
  height: 1.4rem;
  fill: transparent;
  stroke: var(--bs-secondary-color);
  stroke-width: 2.2;
  stroke-linejoin: round;
  transition: transform 0.15s ease, fill 0.2s ease, stroke 0.2s ease, filter 0.2s ease;
}
.down .arrow {
  transform: rotate(180deg);
}

.vote-btn:hover .arrow {
  transform: scale(1.12);
}
.down:hover .arrow {
  transform: rotate(180deg) scale(1.12);
}
.vote-btn:active .arrow {
  transform: scale(0.9);
}
.down:active .arrow {
  transform: rotate(180deg) scale(0.9);
}

.vote-btn.active .arrow {
  fill: var(--accent);
  stroke: var(--accent);
  filter: drop-shadow(0 0 5px var(--glow));
}


.count {
  display: inline-block;
  overflow: hidden;
  line-height: 1.5;
}
.count > span {
  display: inline-block;
}
.roll-up-enter-active,
.roll-up-leave-active,
.roll-down-enter-active,
.roll-down-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.roll-up-enter-from {
  transform: translateY(70%);
  opacity: 0;
}
.roll-up-leave-to {
  transform: translateY(-70%);
  opacity: 0;
}
.roll-down-enter-from {
  transform: translateY(-70%);
  opacity: 0;
}
.roll-down-leave-to {
  transform: translateY(70%);
  opacity: 0;
}


.fx {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 10;
}
.glow {
  position: absolute;
  left: 0;
  top: 0;
  width: 2.6rem;
  height: 2.6rem;
  margin: -1.3rem 0 0 -1.3rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(43, 191, 43, 0.55), rgba(43, 191, 43, 0) 70%);
  opacity: 0;
}
.fx :deep(.note) {
  position: absolute;
  left: 0;
  top: 0;
  line-height: 1;
  font-weight: 700;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .arrow,
  .roll-up-enter-active,
  .roll-up-leave-active,
  .roll-down-enter-active,
  .roll-down-leave-active {
    transition: none;
  }
}
</style>