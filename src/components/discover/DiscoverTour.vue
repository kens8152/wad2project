<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// A guided tour: the page goes dark, one or two parts of it are lit up, and a card explains them. Next / Back move
// between the steps, and the tour can be skipped at any time.
//
// props:  steps (a list of { title, text, target, changes, ready, round, cta })
//           target: a function that gives the CSS selector (or a list of up to two) of the parts to light up.
//                   An item can also be a rectangle { top, left, width, height } on the screen.
//           changes: does this step make the page change something (open or close the card, zoom the map)? A function that
//                   is given the number of the step we come from. If it does, the lit-up areas first fade out, then the page
//                   changes, then each area is lit up again once its part is ready.
//           ready:  a function that says when each part is ready to be lit up: true or false, or a list with one answer for
//                   each part. It looks at what is really on the screen (an animation has started or has finished), not at a
//                   timer, so the spotlight is never lit around an empty place, however slow the computer is.
//           round:  light the part with a round shape (for a dot)
//           cta:    { label, to } an extra button on the card
// emits:  step(index) when a step opens (the page can open something for it), finish, skip
//
// How it moves: once per frame the tour looks where the parts to light up are, and the lit-up areas ease towards them.
// (The movement is worked out here, frame by frame, instead of with CSS transitions: a transition that is given a new
// goal every frame keeps restarting, which looks like stuttering.) A part that is not found for a moment keeps its
// place, and a lit-up area that is no longer needed fades out where it is.

const props = defineProps({
  steps: { type: Array, required: true },
  label: { type: String, default: 'Discover' }, // the page the guide is for, shown at the top of the card
})
const emit = defineEmits(['step', 'finish', 'skip'])

const SLOTS = 2 // how many parts can be lit at the same time
const GAP = 14 // space between the lit-up parts and the card
const EASE = 0.11 // seconds the lit-up areas take to cover most of the way to a new place
const FADE = 0.12 // seconds a lit-up area takes to fade in
const FADE_OUT = 0.045 // seconds a lit-up area takes to fade out (quick, so it never shows an empty place)
const FADE_WAIT = 600 // the most milliseconds to wait for the lit-up areas to fade out before the page changes
const SETTLE_MIN = 150 // milliseconds after the page changed before its parts are looked at (the animations need a moment to start)
const SETTLE_MAX = 3500 // the most milliseconds to wait for a part to be ready (then it is lit up anyway)
const JUMP = 160 // pixels a lit-up part may move and still glide there; further than that and it fades out and in instead
const LOST_AFTER = 450 // milliseconds a part can be missing before its lit-up area fades out

const index = ref(0)
// what is drawn this frame: [{ left, top, width, height, radius, alpha }] for each slot
const drawn = ref(emptySlots())
// The dark screen is one flat shape with a hole for each lit-up part (a mask would make the browser redraw the whole screen
// in tiles on every frame, and some tiles then show up late as a bright band). Parts that overlap share one hole.
const holes = computed(() => {
  const list = drawn.value.filter((slot) => slot.alpha > 0.003 && slot.width > 1 && slot.height > 1)
  if (list.length === 2) {
    const [a, b] = list
    if (a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height) {
      const left = Math.min(a.left, b.left)
      const top = Math.min(a.top, b.top)
      return [{
        left,
        top,
        width: Math.max(a.left + a.width, b.left + b.width) - left,
        height: Math.max(a.top + a.height, b.top + b.height) - top,
        radius: Math.max(a.radius, b.radius),
        alpha: Math.max(a.alpha, b.alpha),
      }]
    }
  }
  return list
})
const dimPath = computed(() => {
  let path = 'M-50 -50H9999V9999H-50Z'
  for (const hole of holes.value) {
    const { left: x, top: y, width: w, height: h } = hole
    const r = Math.max(0, Math.min(hole.radius, w / 2, h / 2))
    path += `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  }
  return path
})
const cardEl = ref(null)
const nextEl = ref(null)
const cardStyle = ref({ opacity: 0 })
const cardReady = ref(false) // the card glides between places only after it has been put in its first place

// what the movement works on (not reactive: only the result is drawn)
const state = emptySlots().map((box) => ({ ...box, ready: false, missingSince: 0 }))
let goals = [null, null] // where the parts are right now
let placedFor = '' // the goals the card was last placed for
let lastSide = 'below' // the card keeps to the side it is on, and only moves when it has to
let changing = false // the current step is making the page change something
let pending = null // a step whose page change waits for the lit-up areas to fade out: { number, since }
let pageChangedAt = 0 // when the page was last told to change
let stepBegan = 0 // when the current step began
let frame = 0
let lastTime = 0
let focusTimer = null

function emptySlots() {
  const list = []
  for (let i = 0; i < SLOTS; i++) list.push({ left: 0, top: 0, width: 0, height: 0, radius: 0, alpha: 0 })
  return list
}

// ---- finding the parts to light up ----
let wantedNow = [] // the parts this step asks for (a slot with nothing asked for fades out at once)
function readGoals() {
  const step = props.steps[index.value]
  const wanted = [].concat(step.target ? step.target() : [])
  wantedNow = wanted
  const found = []
  for (let i = 0; i < SLOTS; i++) {
    const item = wanted[i]
    let box = null

    if (item && typeof item === 'object') {
      // a rectangle is used as it is
      box = { left: item.left, top: item.top, width: item.width, height: item.height }
    } else if (item) {
      const element = document.querySelector(item)
      if (element) {
        const rect = element.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          const pad = step.round ? 16 : 8
          box = { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
        }
      }
    }
    // a rectangle with a number missing would draw nothing (or flicker), so it counts as "not found"
    if (box && ![box.left, box.top, box.width, box.height].every(Number.isFinite)) box = null
    found.push(box)
  }
  return found
}

function cornerRadius(box, round) {
  return round ? Math.min(box.width, box.height) / 2 : Math.min(16, Math.min(box.width, box.height) / 2)
}

// ---- one frame ----
function tick(now) {
  const seconds = Math.min(0.05, (now - lastTime) / 1000 || 0.016)
  lastTime = now
  const move = 1 - Math.exp(-seconds / EASE)
  const fade = 1 - Math.exp(-seconds / FADE)
  const fadeOut = 1 - Math.exp(-seconds / FADE_OUT)
  const round = Boolean(props.steps[index.value].round)

  goals = readGoals()
  let changed = false

  // The page changes only once the lit-up areas have faded out, so that they never show an empty place.
  if (pending && (state.every((slot) => slot.alpha < 0.03) || now - pending.since > FADE_WAIT)) {
    emit('step', pending.number)
    pageChangedAt = now
    pending = null
  }

  // When the page is changing something, a part is lit up only when it is ready (its animation has started or has finished).
  const step = props.steps[index.value]
  let ready = [true, true]
  if (changing && step.ready) {
    const asked = step.ready()
    ready = Array.isArray(asked) ? asked : [asked, asked]
  }
  const settling = changing ? now - pageChangedAt : Infinity
  const allowed = (i) => !pending && (!changing || !step.ready || settling > SETTLE_MAX || (settling > SETTLE_MIN && Boolean(ready[i])))

  for (let i = 0; i < SLOTS; i++) {
    const slot = state[i]
    // A slot this step does not use fades out straight away (it must not stay lit around the last step's part).
    const holding = !allowed(i) || !wantedNow[i]
    let goal = holding ? null : goals[i]

    // A lit-up area never flies across the screen (that shows up as a streak of light): when its part is somewhere else,
    // it fades out where it is, and the new one fades in at its own place.
    if (goal && slot.ready && slot.alpha >= 0.02) {
      const jump = Math.abs(goal.left - slot.left) + Math.abs(goal.top - slot.top) + Math.abs(goal.width - slot.width) + Math.abs(goal.height - slot.height)
      if (jump > JUMP || slot.away) slot.away = true
    }
    if (goal && slot.away) {
      if (slot.alpha >= 0.02) {
        slot.alpha += (0 - slot.alpha) * fadeOut
        slot.missingSince = 0
        goal = null
        slot.skip = true
      } else {
        slot.away = false
      }
    } else {
      slot.skip = false
    }

    if (slot.skip) {
      // fading out on the spot (nothing else to do for this slot this frame)
    } else if (goal) {
      slot.missingSince = 0
      if (!slot.ready || slot.alpha < 0.02) {
        // a lit-up area that appears starts where its part is, and fades in
        Object.assign(slot, goal, { radius: cornerRadius(goal, round), ready: true, alpha: 0 })
      }
      for (const key of ['left', 'top', 'width', 'height']) slot[key] += (goal[key] - slot[key]) * move
      slot.radius += (cornerRadius(goal, round) - slot.radius) * move
      slot.alpha += (1 - slot.alpha) * fade
    } else {
      if (!slot.missingSince) slot.missingSince = now
      // fade out where it is: at once while holding, after a moment if the part cannot be found
      if (holding || now - slot.missingSince > LOST_AFTER) slot.alpha += (0 - slot.alpha) * fadeOut
    }

    const shown = drawn.value[i]
    if (
      Math.abs(slot.left - shown.left) > 0.05 ||
      Math.abs(slot.top - shown.top) > 0.05 ||
      Math.abs(slot.width - shown.width) > 0.05 ||
      Math.abs(slot.height - shown.height) > 0.05 ||
      Math.abs(slot.radius - shown.radius) > 0.05 ||
      Math.abs(slot.alpha - shown.alpha) > 0.002
    ) {
      changed = true
    }
  }

  if (changed) drawn.value = state.map((slot) => ({ left: slot.left, top: slot.top, width: slot.width, height: slot.height, radius: slot.radius, alpha: slot.alpha }))

  // The card moves only when the parts have really moved (not for every small step of the animation).
  // While the parts of a step are not there yet (the page is still opening them) the card stays where it is, instead of
  // drifting towards the middle of the screen and then going to its real place: it moves once, when they are known.
  const known = goals.some(Boolean)
  const waited = now - stepBegan > 1500
  if (known || waited) {
    const key = goals.map((g) => (g ? [g.left, g.top, g.width, g.height].map((n) => Math.round(n / 24)).join(',') : '-')).join('|')
    if (key !== placedFor) {
      placedFor = key
      placeCard()
    }
  }

  frame = requestAnimationFrame(tick)
}

// ---- the card ----
// the area (in pixels) where two rectangles overlap
function overlapArea(a, b) {
  const wide = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  const high = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  return wide > 0 && high > 0 ? wide * high : 0
}

// Put the card where it hides as little of the lit-up parts as possible: next to them (below, above, to the right or
// to the left), or in a corner of the screen. It stays on the side it is on while that side is good, and moves only
// when it has to. With nothing lit up it goes in the middle of the screen.
async function placeCard() {
  await nextTick()
  const card = cardEl.value
  if (!card) return

  const width = card.offsetWidth
  const height = card.offsetHeight
  const margin = 10
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const clampX = (x) => Math.max(margin, Math.min(x, screenWidth - width - margin))
  const clampY = (y) => Math.max(margin, Math.min(y, screenHeight - height - margin))

  let spot = { top: clampY((screenHeight - height) / 2), left: clampX((screenWidth - width) / 2) }
  let spotSide = 'middle'

  const lit = goals.filter(Boolean)
  if (lit.length) {
    // all the lit-up parts together, and each of them on its own
    const all = {
      top: Math.min(...lit.map((h) => h.top)),
      left: Math.min(...lit.map((h) => h.left)),
    }
    all.width = Math.max(...lit.map((h) => h.left + h.width)) - all.left
    all.height = Math.max(...lit.map((h) => h.top + h.height)) - all.top
    const middleX = all.left + all.width / 2
    const middleY = all.top + all.height / 2

    const tries = []
    for (const box of [all, ...lit]) {
      const x = clampX(box.left + box.width / 2 - width / 2)
      const y = clampY(box.top + box.height / 2 - height / 2)
      tries.push({ side: 'below', top: box.top + box.height + GAP, left: x })
      tries.push({ side: 'above', top: box.top - GAP - height, left: x })
      tries.push({ side: 'right', top: y, left: box.left + box.width + GAP })
      tries.push({ side: 'left', top: y, left: box.left - GAP - width })
    }
    tries.push({ side: 'corner', top: margin, left: margin })
    tries.push({ side: 'corner', top: margin, left: screenWidth - width - margin })
    tries.push({ side: 'corner', top: screenHeight - height - margin, left: margin })
    tries.push({ side: 'corner', top: screenHeight - height - margin, left: screenWidth - width - margin })

    let best = null
    for (const t of tries) {
      if (t.top < margin || t.left < margin || t.top + height > screenHeight - margin || t.left + width > screenWidth - margin) continue
      const here = { top: t.top, left: t.left, width, height }
      const covered = lit.reduce((sum, h) => sum + overlapArea(here, h), 0)
      const away = Math.hypot(t.left + width / 2 - middleX, t.top + height / 2 - middleY)
      // covering a lit-up part costs the most, then being far from them, and a card that keeps its side is a little cheaper
      const cost = covered * 1000 + away + (t.side === lastSide ? 0 : 40)
      if (best === null || cost < best.cost) best = { cost: cost, spot: t }
    }
    if (best) {
      spot = best.spot
      spotSide = best.spot.side
    }
  }
  lastSide = spotSide
  cardStyle.value = { transform: 'translate(' + Math.round(spot.left) + 'px, ' + Math.round(spot.top) + 'px)', opacity: 1 }

  if (!cardReady.value) {
    // let the first place be drawn without gliding, then switch the gliding on
    await nextTick()
    requestAnimationFrame(() => (cardReady.value = true))
  }
}

// ---- moving between the steps ----
function goTo(number) {
  const before = index.value
  const step = props.steps[number]
  const now = performance.now()

  // A step that has the page change something (open or close the card) first lets the lit-up areas fade out, then changes
  // the page. Other steps just glide from one part to the next.
  changing = typeof step.changes === 'function' ? Boolean(step.changes(before)) : Boolean(step.changes)
  stepBegan = now
  index.value = number

  if (changing && state.some((slot) => slot.alpha > 0.05)) {
    pending = { number: number, since: now }
  } else {
    pending = null
    emit('step', number)
    pageChangedAt = now
  }
  placedFor = '' // place the card again for the new step
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => nextEl.value?.focus({ preventScroll: true }), 700)
}

function next() {
  if (index.value < props.steps.length - 1) goTo(index.value + 1)
  else emit('finish')
}
function back() {
  if (index.value > 0) goTo(index.value - 1)
}

function onKey(event) {
  if (event.key === 'Escape') emit('skip')
  else if (event.key === 'ArrowRight') next()
  else if (event.key === 'ArrowLeft') back()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  goTo(0)
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(frame)
  clearTimeout(focusTimer)
})
</script>

<template>
  <Teleport to="body">
    <div class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <!-- the dark screen, with a hole cut out for every lit-up part (it also stops clicks reaching the page) -->
      <svg class="tour__dim" aria-hidden="true" @click.stop>
        <path :d="dimPath" fill="#0b122c" fill-opacity="0.66" fill-rule="evenodd" />
        <!-- a lit-up area that is still fading in or out keeps a little of the dark screen -->
        <rect
          v-for="(hole, number) in holes"
          :key="number"
          :x="hole.left"
          :y="hole.top"
          :width="hole.width"
          :height="hole.height"
          :rx="hole.radius"
          fill="#0b122c"
          :fill-opacity="0.66 * (1 - hole.alpha)"
        />
      </svg>

      <!-- a soft glowing edge around every lit-up part -->
      <div
        v-for="(slot, number) in drawn"
        :key="'ring-' + number"
        class="tour__ring"
        :style="{
          transform: 'translate(' + slot.left + 'px, ' + slot.top + 'px)',
          width: slot.width + 'px',
          height: slot.height + 'px',
          borderRadius: slot.radius + 'px',
          opacity: slot.alpha,
        }"
      ></div>

      <div ref="cardEl" class="tour__card" :class="{ 'is-ready': cardReady }" :style="cardStyle">
        <div class="tour__top">
          <span class="tour__kicker">{{ label }} · {{ index + 1 }} of {{ steps.length }}</span>
          <button type="button" class="tour__skip" @click="emit('skip')">Skip tour</button>
        </div>

        <!-- the old words fade out quickly, then the new words fade in (never both at once, which would look garbled) -->
        <div class="tour__body">
          <Transition name="tour-words" mode="out-in" @after-enter="placedFor = ''">
            <div :key="index" class="tour__words">
              <h2 id="tour-title" class="tour__title">{{ steps[index].title }}</h2>
              <p class="tour__text">{{ steps[index].text }}</p>

              <RouterLink v-if="steps[index].cta" :to="steps[index].cta.to" class="btn btn-riffle tour__cta" @click="emit('finish')">
                {{ steps[index].cta.label }}
              </RouterLink>
            </div>
          </Transition>
        </div>

        <div class="tour__bottom">
          <div class="tour__dots" aria-hidden="true">
            <i v-for="(step, number) in steps" :key="step.title" :class="{ 'is-active': number === index }"></i>
          </div>
          <div class="tour__buttons">
            <button v-if="index > 0" type="button" class="btn btn-light" @click="back">Back</button>
            <button ref="nextEl" type="button" class="btn btn-riffle" @click="next">
              {{ index === steps.length - 1 ? 'Finish tour' : 'Next →' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour {
  position: fixed;
  inset: 0;
  z-index: 3000;
  animation: tour-in 0.35s ease;
}
@keyframes tour-in {
  from {
    opacity: 0;
  }
}

/* the dark screen */
.tour__dim {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* a small screen: a smaller card, so it covers less of what is lit up */
@media (max-width: 575.98px) {
  .tour__card {
    padding: 0.7rem 1rem 0.7rem;
  }
  .tour__title {
    margin: 0.4rem 0 0.2rem;
    font-size: 1.15rem;
  }
  .tour__text {
    font-size: 0.86rem;
    line-height: 1.4;
  }
  .tour__body {
    min-height: 5rem;
  }
  .tour__bottom {
    margin-top: 0.5rem;
  }
  .tour__buttons .btn {
    padding: 0.35rem 0.8rem;
    font-size: 0.9rem;
  }
}

/* The edge of a lit-up part: a thin white line with a soft glow in the Riffle pink.
   The glow is a second layer that only changes its opacity (that is cheap to draw), so it can breathe without stutter. */
.tour__ring {
  position: absolute;
  top: 0;
  left: 0;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.14), 0 0 16px rgba(224, 36, 94, 0.5);
  pointer-events: none;
  will-change: transform, width, height, opacity;
}
.tour__ring::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  box-shadow: 0 0 26px rgba(224, 36, 94, 0.6);
  opacity: 0.35;
}
.tour__card {
  position: absolute;
  top: 0;
  left: 0;
  width: min(360px, calc(100vw - 24px));
  padding: 1.1rem 1.3rem 1.05rem;
  border-radius: 18px;
  background: var(--riffle-surface);
  box-shadow: 0 24px 60px rgba(8, 14, 40, 0.4);
  will-change: transform;
  transition: opacity 0.3s;
}
.tour__card.is-ready {
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
}

.tour__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.tour__kicker {
  color: var(--riffle-muted);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.tour__skip {
  padding: 0;
  border: 0;
  background: none;
  color: var(--riffle-muted);
  font-size: 0.85rem;
  text-decoration: underline;
}
.tour__skip:hover {
  color: var(--riffle-ink);
}

.tour__title {
  margin: 0.75rem 0 0.35rem;
  color: var(--riffle-ink);
  font-size: 1.3rem;
  line-height: 1.25;
}
.tour__text {
  margin: 0;
  color: var(--riffle-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}
.tour__cta {
  display: block;
  margin-top: 1rem;
  padding: 0.7rem 1rem;
  font-weight: 800;
}

.tour__body {
  display: grid; /* the old and the new words sit on top of each other while they cross-fade */
  min-height: 7.2rem;
}
.tour__words {
  grid-area: 1 / 1;
}
.tour-words-leave-active {
  transition: opacity 0.14s ease;
}
.tour-words-enter-active {
  transition: opacity 0.26s ease, transform 0.26s cubic-bezier(0.2, 0.8, 0.3, 1);
}
.tour-words-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.tour-words-leave-to {
  opacity: 0;
}

.tour__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
}
.tour__dots {
  display: flex;
  gap: 6px;
}
.tour__dots i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #d5d9e8;
  transition: width 0.3s, background 0.3s;
}
.tour__dots i.is-active {
  width: 22px;
  background: #e0245e;
}
.tour__buttons {
  display: flex;
  gap: 0.5rem;
}
.tour__buttons .btn {
  font-weight: 700;
  white-space: nowrap; /* "Next →" and "Finish tour" stay on one line */
}
</style>
