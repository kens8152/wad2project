<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { formatFans, getGraph } from '../data/discoverGraph'

// The web of dots: one dot per artist, a line between two artists who share fans.
//   drag to move · scroll or the + / - buttons to zoom · hover a dot to see who it is
//   click a dot to open its card (who shares their fans, follow, gigs, artist page)
//
// props:  dimmed (ids of dots that the filters have faded), following (ids), signedIn,
//         tasteSpot ({ x, y } or null), insetLeft / insetRight / insetBottom (space covered by panels),
//         pickedId (the dot whose card is open)
// emits:  pick(id or null), follow(node), taste-click

const props = defineProps({
  dimmed: { type: Object, default: () => ({}) },
  following: { type: Array, default: () => [] },
  signedIn: { type: Boolean, default: false },
  tasteSpot: { type: Object, default: null },
  insetLeft: { type: Number, default: 0 },
  insetRight: { type: Number, default: 0 },
  insetBottom: { type: Number, default: 0 },
  pickedId: { type: String, default: null },
})
const emit = defineEmits(['pick', 'follow', 'taste-click'])

const graph = getGraph()
const nodes = graph.nodes

const MAX_NEIGHBOURS_SHOWN = 5

// ---- the lines, drawn as one path ----
const edgesPath = graph.edges
  .map(edge => 'M' + nodes[edge.a].x.toFixed(1) + ' ' + nodes[edge.a].y.toFixed(1) + 'L' + nodes[edge.b].x.toFixed(1) + ' ' + nodes[edge.b].y.toFixed(1))
  .join('')

// ---- the view: screen position = map position * z + (x, y) ----
const view = ref({ x: 0, y: 0, z: 1 })
const boxWidth = ref(0)
const boxHeight = ref(0)
const smooth = ref(false) // glide to the new view (buttons), but not while dragging
const dragging = ref(false)
let fitZoom = 1
let smoothTimer = null

const worldStyle = computed(() => ({
  transform: 'translate(' + view.value.x + 'px, ' + view.value.y + 'px) scale(' + view.value.z + ')',
}))

// how big the map box is on the screen
function measure() {
  const box = document.getElementById('web-of-dots')
  boxWidth.value = box.clientWidth
  boxHeight.value = box.clientHeight
}

function glide() {
  smooth.value = true
  clearTimeout(smoothTimer)
  smoothTimer = setTimeout(() => (smooth.value = false), 600)
}

// the space that is not covered by the panels
function freeWidth() {
  return Math.max(200, boxWidth.value - props.insetLeft - props.insetRight)
}
function freeHeight() {
  return Math.max(200, boxHeight.value - props.insetBottom)
}

// the view that shows the whole web in the free space
function fittedView() {
  const bounds = graph.bounds
  const webWidth = bounds.maxX - bounds.minX + 140
  const webHeight = bounds.maxY - bounds.minY + 140

  const z = Math.min(freeWidth() / webWidth, freeHeight() / webHeight, 1.7)
  const centreX = (bounds.minX + bounds.maxX) / 2
  const centreY = (bounds.minY + bounds.maxY) / 2
  return {
    z: z,
    x: props.insetLeft + freeWidth() / 2 - centreX * z - 160,
    y: freeHeight() / 2 - centreY * z,
  }
}

// move the whole web back into the free space (the Recentre button)
function refit() {
  measure()
  glide()
  const next = fittedView()
  fitZoom = next.z
  view.value = next
}

function recentre() {
  refit()
  emit('pick', null)
}

function zoomAt(factor, screenX, screenY) {
  const current = view.value
  const z = Math.min(fitZoom * 4, Math.max(fitZoom * 0.55, current.z * factor))
  view.value = {
    x: screenX - ((screenX - current.x) / current.z) * z,
    y: screenY - ((screenY - current.y) / current.z) * z,
    z: z,
  }
}

// the + and - buttons zoom around the middle of the free space
function zoomStep(factor) {
  measure()
  glide()
  zoomAt(factor, props.insetLeft + freeWidth() / 2, freeHeight() / 2)
}

// move so this dot is in the middle of the free space
function focusNode(id) {
  const node = nodeById(id)
  if (!node) return

  measure()
  glide()
  const z = Math.min(fitZoom * 4, Math.max(view.value.z, fitZoom * 1.6))
  view.value = {
    x: props.insetLeft + freeWidth() / 2 - node.x * z,
    y: freeHeight() / 2 - node.y * z,
    z: z,
  }
}

onMounted(() => {
  measure()
  const next = fittedView()
  fitZoom = next.z
  view.value = next
})

// when a panel opens or closes, move the web into the free space
watch(() => props.insetLeft + props.insetBottom, refit)

// when a dot is picked from outside the map (search, recommended list) and it is not near the middle, bring it there
watch(() => props.pickedId, id => {
  const node = id ? nodeById(id) : null
  if (!node) return

  const screenX = node.x * view.value.z + view.value.x
  const screenY = node.y * view.value.z + view.value.y
  const nearMiddle =
    screenX > props.insetLeft + freeWidth() * 0.15 &&
    screenX < props.insetLeft + freeWidth() * 0.85 &&
    screenY > freeHeight() * 0.15 &&
    screenY < freeHeight() * 0.85
  if (!nearMiddle) focusNode(id)
})

// ---- dragging and the wheel ----
let dragStart = null // where the mouse or finger went down
let dragged = false // the last press moved the map, so the click that follows it is not a real click

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return

  smooth.value = false
  dragged = false
  dragStart = { x: event.clientX, y: event.clientY, viewX: view.value.x, viewY: view.value.y }
}

function onPointerMove(event) {
  if (!dragStart) return

  const dx = event.clientX - dragStart.x
  const dy = event.clientY - dragStart.y
  if (!dragging.value && Math.sqrt(dx * dx + dy * dy) < 4) return

  dragging.value = true
  dragged = true
  hoverId.value = null
  view.value = { x: dragStart.viewX + dx, y: dragStart.viewY + dy, z: view.value.z }
}

function onPointerUp() {
  dragStart = null
  dragging.value = false
}

// a click on the empty map closes the open card (dots, the card and the buttons stop their clicks from reaching here)
function onBackgroundClick() {
  if (dragged) return
  emit('pick', null)
}

// the wheel zooms around the middle of the free space
function onWheel(event) {
  smooth.value = false
  const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
  zoomAt(factor, props.insetLeft + freeWidth() / 2, freeHeight() / 2)
}

// ---- hover, click and the lit-up neighbours ----
const hoverId = ref(null)

function nodeById(id) {
  return nodes.find(node => node.id === id) || null
}

const focusId = computed(() => (hoverId.value !== null ? hoverId.value : props.pickedId))
const focusNodeData = computed(() => (focusId.value ? nodeById(focusId.value) : null))
const pickedNode = computed(() => (props.pickedId ? nodeById(props.pickedId) : null))

// ids of the focused dot and the dots it shares fans with
const litIds = computed(() => {
  const lit = {}
  const node = focusNodeData.value
  if (!node) return lit
  lit[node.id] = true
  for (const index of graph.neighbours[node.index]) {
    lit[nodes[index].id] = true
  }
  return lit
})

const focusEdgesPath = computed(() => {
  const node = focusNodeData.value
  if (!node) return ''
  return graph.neighbours[node.index]
    .map(index => 'M' + node.x.toFixed(1) + ' ' + node.y.toFixed(1) + 'L' + nodes[index].x.toFixed(1) + ' ' + nodes[index].y.toFixed(1))
    .join('')
})

function dotClasses(node) {
  const focused = focusId.value !== null
  return {
    'is-filtered': props.dimmed[node.id] === true,
    'is-faded': focused && !litIds.value[node.id],
    'is-focus': focused && focusId.value === node.id,
    'is-neighbour': focused && focusId.value !== node.id && litIds.value[node.id] === true,
    'is-following': props.following.includes(node.id),
  }
}

function clickDot(node) {
  if (dragged) return
  emit('pick', props.pickedId === node.id ? null : node.id)
}

// the card of the dot that is hovered (small) or opened (large)
const cardNode = computed(() => focusNodeData.value)
const cardIsOpen = computed(() => cardNode.value !== null && props.pickedId === cardNode.value.id)

const neighbourNodes = computed(() => {
  const node = cardNode.value
  if (!node) return []
  return graph.neighbours[node.index].map(index => nodes[index])
})

const cardStyle = computed(() => {
  const node = cardNode.value
  if (!node) return {}

  const screenX = node.x * view.value.z + view.value.x
  const screenY = node.y * view.value.z + view.value.y
  const radius = node.r * view.value.z
  const width = cardIsOpen.value ? 290 : 230
  const roomRight = screenX + radius + 16 + width < boxWidth.value - 8
  const left = roomRight ? screenX + radius + 16 : Math.max(8, screenX - radius - 16 - width)
  const top = Math.min(Math.max(12, screenY - 30), Math.max(12, boxHeight.value - (cardIsOpen.value ? 330 : 120)))
  return { left: left + 'px', top: top + 'px', width: width + 'px' }
})

function initialsOf(name) {
  return name.replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join('')
}

function genreOf(node) {
  return graph.genreById[node.genre]
}

// the "Your taste profile" label sits under the dashed ring
const tastePillStyle = computed(() => {
  if (!props.tasteSpot) return {}
  return {
    left: props.tasteSpot.x * view.value.z + view.value.x + 'px',
    top: props.tasteSpot.y * view.value.z + view.value.y + 112 * view.value.z + 'px',
  }
})
</script>

<template>
  <div
    id="web-of-dots"
    class="web"
    :class="{ 'is-dragging': dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
    @click="onBackgroundClick"
    @wheel.prevent="onWheel"
  >
    <svg class="web__svg" role="application" aria-label="Web of artists. Each dot is an artist and each line joins two artists who share fans.">
      <g class="web__world" :class="{ 'is-smooth': smooth }" :style="worldStyle">

        <!-- the lines between artists who share fans -->
        <path class="web__edges" :class="{ 'is-quiet': focusId !== null }" :d="edgesPath" fill="none" />
        <path v-if="focusEdgesPath" :key="focusId" class="web__edges web__edges--focus" :d="focusEdgesPath" fill="none" />

        <!-- your taste profile -->
        <g v-if="tasteSpot" class="web__taste" :transform="'translate(' + tasteSpot.x + ' ' + tasteSpot.y + ')'">
          <circle class="web__taste-glow" r="105" />
          <circle class="web__taste-ring" r="105" />
          <circle class="web__taste-core" r="7" />
        </g>

        <!-- a ring that pulses around the opened dot -->
        <circle v-if="pickedNode" :key="pickedNode.id" class="web__pulse" :cx="pickedNode.x" :cy="pickedNode.y" :r="pickedNode.r + 4" :stroke="pickedNode.color" fill="none" />

        <!-- the artists -->
        <g v-for="node in nodes" :key="node.id">
          <circle
            class="dot"
            :class="dotClasses(node)"
            :cx="node.x"
            :cy="node.y"
            :r="node.r"
            :fill="node.color"
            :style="{ '--i': node.index }"
          />
          <!-- a bigger, invisible circle so small dots are easy to hover and click -->
          <circle
            class="dot-hit"
            :cx="node.x"
            :cy="node.y"
            :r="Math.max(node.r + 3, 10)"
            fill="transparent"
            :tabindex="node.real ? 0 : undefined"
            :role="node.real ? 'button' : undefined"
            :aria-label="node.real ? node.name + ', ' + genreOf(node).label : undefined"
            @mouseenter="hoverId = node.id"
            @mouseleave="hoverId = hoverId === node.id ? null : hoverId"
            @click.stop="clickDot(node)"
            @keydown.enter="clickDot(node)"
          />
        </g>
      </g>
    </svg>

    <!-- "Your taste profile" label -->
    <button v-if="tasteSpot" type="button" class="taste-pill" :style="tastePillStyle" @pointerdown.stop @click.stop="emit('taste-click')">
      <span class="taste-pill__dot"></span> Your taste profile
    </button>

    <!-- recentre and zoom -->
    <div class="map-controls" @pointerdown.stop @click.stop>
      
      <div class="control-card zoom">
        <button type="button" aria-label="Zoom in" @click="zoomStep(1.4)"><i class="bi bi-plus-lg"></i></button>
        <button type="button" aria-label="Zoom out" @click="zoomStep(1 / 1.4)"><i class="bi bi-dash-lg"></i></button>
      </div>
      <button type="button" class="control-card recentre" @click="recentre">
        <i class="bi bi-fullscreen"></i>
      </button>
    </div>

    <!-- hover: a small card. click: the full card -->
    <div
      v-if="cardNode"
      :key="cardNode.id + (cardIsOpen ? '-open' : '')"
      class="web__card"
      :class="{ 'is-open': cardIsOpen }"
      :style="cardStyle"
      @pointerdown.stop
      @click.stop
    >
      <div class="card-head">
        <span class="card-avatar" :style="{ background: cardNode.color }">{{ initialsOf(cardNode.name) }}</span>
        <div class="card-title">
          <strong>{{ cardNode.name }}</strong>
          <span><i class="card-dot" :style="{ background: genreOf(cardNode).color }"></i>{{ genreOf(cardNode).label }} · {{ formatFans(cardNode.fans) }} fans</span>
        </div>
        <button v-if="cardIsOpen" type="button" class="card-close" aria-label="Close" @click="emit('pick', null)">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <p class="card-shares">
        <template v-if="neighbourNodes.length">
          Shares fans with <b>{{ neighbourNodes.length }}</b> artist{{ neighbourNodes.length === 1 ? '' : 's' }}
        </template>
        <template v-else>No shared audiences yet</template>
      </p>

      <p v-if="!cardIsOpen" class="card-hint">Click to open</p>

      <template v-if="cardIsOpen">
        <ul v-if="neighbourNodes.length" class="card-links list-unstyled">
          <li v-for="other in neighbourNodes.slice(0, MAX_NEIGHBOURS_SHOWN)" :key="other.id">
            <button type="button" class="card-link" @click="emit('pick', other.id)">
              <i class="card-dot" :style="{ background: other.color }"></i>
              <span>{{ other.name }}</span>
              <small>{{ formatFans(other.fans) }}</small>
            </button>
          </li>
          <li v-if="neighbourNodes.length > MAX_NEIGHBOURS_SHOWN" class="card-more">+{{ neighbourNodes.length - MAX_NEIGHBOURS_SHOWN }} more on the map</li>
        </ul>

        <div class="card-actions">
          <RouterLink v-if="!signedIn" to="/signup" class="card-button card-button--primary">Sign up to follow</RouterLink>
          <button
            v-else
            type="button"
            class="card-button"
            :class="following.includes(cardNode.id) ? 'card-button--on' : 'card-button--primary'"
            @click="emit('follow', cardNode)"
          >
            <i class="bi" :class="following.includes(cardNode.id) ? 'bi-check-lg' : 'bi-plus-lg'"></i>
            {{ following.includes(cardNode.id) ? 'Following' : 'Follow' }}
          </button>

          <RouterLink
            v-if="cardNode.real"
            :to="{ name: 'events-list', query: { artist: cardNode.artistId } }"
            class="card-button"
          >See gigs</RouterLink>
          <span v-else class="card-note">No gigs announced yet</span>
        </div>
        <RouterLink v-if="cardNode.real" :to="'/artists/' + cardNode.artistId" class="card-profile">
          Go to artist page <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.web {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
  background-color: #fbfaf8;
  background-image: radial-gradient(#e6e3ee 1.2px, transparent 1.2px);
  background-size: 30px 30px;
}
.web.is-dragging {
  cursor: grabbing;
}
.web__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.web__world {
  transform-origin: 0 0;
  will-change: transform;
}
.web__world.is-smooth {
  transition: transform 0.55s cubic-bezier(0.22, 0.8, 0.3, 1);
}


/* lines */
.web__edges {
  stroke: #666a82;
  stroke-width: 1;
  opacity: 0.6;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
  transition: opacity 0.25s;
  animation: fade-in 1s ease 0.4s backwards;
}
.web__edges.is-quiet {
  opacity: 0.1;
}
.web__edges--focus {
  stroke: #0f1f4b;
  stroke-width: 2px;
  opacity: 1;
  animation: lines-in 0.3s ease backwards;
}
@keyframes lines-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* dots */
.dot {
  stroke: #fff;
  stroke-width: 1.5px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 0.25s, transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1), stroke 0.2s;
  animation: dot-in 0.6s cubic-bezier(0.3, 1.6, 0.5, 1) backwards;
  animation-delay: calc(var(--i) * 8ms);
}
.dot.is-filtered {
  opacity: 0.1;
}
.dot.is-faded {
  opacity: 0.16;
}
.dot.is-neighbour {
  stroke: #0f1f4b;
  stroke-width: 2px;
}
.dot.is-focus {
  transform: scale(1.4);
  stroke: #0f1f4b;
  stroke-width: 2.5px;
}
.dot.is-following {
  stroke: #e0245e;
  stroke-width: 2.5px;
}
.dot-hit {
  cursor: pointer;
  outline: none;
}
.dot-hit:focus-visible {
  stroke: var(--riffle-blue);
  stroke-width: 2px;
}
@keyframes dot-in {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes fade-in {
  from {
    opacity: 0;
  }
}

.web__pulse {
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
  transform-box: fill-box;
  transform-origin: center;
  animation: pulse 1.6s ease-out infinite;
}
@keyframes pulse {
  from {
    opacity: 0.9;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(3.2);
  }
}

/* your taste profile */
.web__taste {
  pointer-events: none;
}
.web__taste-glow {
  fill: rgba(224, 36, 94, 0.05);
  animation: breathe 3.5s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.web__taste-ring {
  fill: none;
  stroke: #e0245e;
  stroke-width: 1.6px;
  stroke-dasharray: 7 7;
  vector-effect: non-scaling-stroke;
  transform-box: fill-box;
  transform-origin: center;
  animation: spin 40s linear infinite;
}
.web__taste-core {
  fill: #e0245e;
  stroke: #fff;
  stroke-width: 2px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.taste-pill {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.9rem;
  border: 1px solid #e0245e;
  border-radius: 999px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.85rem;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(20, 35, 90, 0.14);
  transform: translateX(-50%);
  transition: box-shadow 0.2s, scale 0.2s;
}
.taste-pill:hover {
  scale: 1.05;
  box-shadow: 0 8px 22px rgba(224, 36, 94, 0.28);
}
.taste-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e0245e;
}

/* ---- the card ---- */
.web__card {
  position: absolute;
  z-index: 6;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--riffle-border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 14px 36px rgba(20, 35, 90, 0.18);
  pointer-events: none;
  animation: card-pop 0.2s cubic-bezier(0.3, 1.4, 0.5, 1);
  transform-origin: left top;
}
.web__card.is-open {
  pointer-events: auto;
  cursor: default;
}
@keyframes card-pop {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.card-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.card-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 800;
}
.card-title {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.card-title strong {
  overflow: hidden;
  color: var(--riffle-ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-title span {
  color: var(--riffle-muted);
  font-size: 0.78rem;
}
.card-dot {
  display: inline-block;
  flex: none;
  width: 8px;
  height: 8px;
  margin-right: 0.35rem;
  border-radius: 50%;
}
.card-close {
  align-self: flex-start;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 0.75rem;
}
.card-close:hover {
  background: #eef1fb;
  color: var(--riffle-ink);
}
.card-shares {
  margin: 0.7rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.82rem;
}
.card-shares b {
  color: var(--riffle-ink);
}
.card-hint {
  margin: 0.3rem 0 0;
  color: var(--riffle-faint);
  font-size: 0.72rem;
}
.card-links {
  margin: 0.55rem 0 0;
}
.card-link {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.38rem 0.5rem;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--riffle-ink);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  transition: background 0.12s, transform 0.12s;
}
.card-link:hover {
  background: #eef1fb;
  transform: translateX(2px);
}
.card-link span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-link small {
  color: var(--riffle-faint);
}
.card-more {
  padding: 0.25rem 0.5rem;
  color: var(--riffle-faint);
  font-size: 0.78rem;
}
.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.card-button {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.5rem 0.6rem;
  border: 1.5px solid var(--riffle-ink);
  border-radius: 10px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s, transform 0.15s;
}
.card-button:hover {
  background: #eef1fb;
  color: var(--riffle-ink);
  transform: translateY(-1px);
}
.card-button--primary {
  border-color: var(--riffle-navy);
  background: var(--riffle-navy);
  color: #fff;
}
.card-button--primary:hover {
  background: var(--riffle-navy-soft);
  color: #fff;
}
.card-button--on {
  border-color: #e0245e;
  background: #fff1f5;
  color: #c2185b;
}
.card-note {
  flex: 1;
  color: var(--riffle-faint);
  font-size: 0.75rem;
  line-height: 1.25;
  text-align: center;
}
.card-profile {
  display: inline-block;
  margin-top: 0.65rem;
  color: var(--riffle-blue);
  font-size: 0.82rem;
  font-weight: 700;
  text-decoration: none;
}
.card-profile:hover {
  text-decoration: underline;
}

/* ---- recentre and zoom ---- */
.map-controls {
  position: absolute;
  right: 24px;
  bottom: 24px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
}
.control-card {
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(20, 35, 90, 0.07);
}
.recentre {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 1.1rem;
  border: 1.5px solid var(--riffle-coral);
  color: var(--riffle-ink);
  font-weight: 800;
  transition: background 0.15s, transform 0.15s;
}
.recentre:hover {
  background: #fff5f4;
  transform: translateY(-1px);
}
.recentre-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--riffle-coral);
}
.zoom {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.zoom button {
  width: 100%;
  height: 42px;
  border: 0;
  background: transparent;
  color: var(--riffle-ink);
  font-size: 1rem;
  transition: background 0.12s;
}
.zoom button + button {
  border-top: 1px solid var(--riffle-border);
}
.zoom button:hover {
  background: #eef1fb;
}
@media (max-width: 991.98px) {
  .map-controls {
    right: 12px;
    bottom: 12px;
  }
}
</style>
