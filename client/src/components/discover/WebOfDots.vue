<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatFans, getGraph } from '../../data/discover/discoverGraph'
import { pictureOf } from '@/utils/discover/dotPicture'

// The web of dots: one dot per artist, a line between two artists who share fans.
//   drag to move · scroll or the + / - buttons to zoom · hover a dot to see who it is
//   click a dot: it grows into the artist's picture, the artists who share their fans pop out around it on lines
//   that draw themselves, and its card (follow, gigs, artist page) opens on the right
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

const router = useRouter()
const graph = getGraph()
const nodes = graph.nodes

const MAX_NEIGHBOURS_SHOWN = 5
const CARD_WIDTH = 290
const SIDE_CARD_MIN = 760 // when the map has this much room beside the panels, the opened card sits on its right; otherwise along the bottom

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
  // the middle of the free space; with no right panel open, the middle of the whole screen if the web still clears the left panel
  let middle = props.insetLeft + freeWidth() / 2
  if (props.insetRight === 0 && boxWidth.value / 2 - (webWidth * z) / 2 >= props.insetLeft) middle = boxWidth.value / 2
  return {
    z: z,
    x: middle - centreX * z,
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
  const z = Math.min(fitZoom * 5, Math.max(fitZoom * 0.55, current.z * factor))
  view.value = {
    x: screenX - ((screenX - current.x) / current.z) * z,
    y: screenY - ((screenY - current.y) / current.z) * z,
    z: z,
  }
}

// zoom around the middle of the free space; when the user has a taste profile circle, zoom towards it instead
function zoomCentre(factor) {
  const middleX = props.insetLeft + freeWidth() / 2
  const middleY = freeHeight() / 2
  if (!props.tasteSpot) {
    zoomAt(factor, middleX, middleY)
    return
  }

  const z = Math.min(fitZoom * 5, Math.max(fitZoom * 0.55, view.value.z * factor))
  view.value = {
    x: middleX - props.tasteSpot.x * z,
    y: middleY - props.tasteSpot.y * z,
    z: z,
  }
}

// the + and - buttons
function zoomStep(factor) {
  closeForZoom()
  measure()
  glide()
  zoomCentre(factor)
}

// When the window changes size (a browser window dragged, a phone turned) the web follows it live, frame by frame, so
// it stays in the middle instead of sliding behind the edge and then catching up.
// A web that is in its fitted view is fitted again; one the user zoomed or moved keeps its place relative to the middle.
let resizeFrame = 0
let resizing = false
let resizeDone = null

function onResize() {
  resizing = true
  clearTimeout(resizeDone)
  resizeDone = setTimeout(() => (resizing = false), 250)

  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    const oldWidth = boxWidth.value
    const oldHeight = boxHeight.value
    const wasFitted = Math.abs(view.value.z - fitZoom) < 0.01

    measure()
    smooth.value = false

    if (props.pickedId) {
      frameCluster(props.pickedId, false)
    } else if (wasFitted) {
      const next = fittedView()
      fitZoom = next.z
      view.value = next
    } else {
      fitZoom = fittedView().z
      view.value = { x: view.value.x + (boxWidth.value - oldWidth) / 2, y: view.value.y + (boxHeight.value - oldHeight) / 2, z: view.value.z }
    }
  })
}

onMounted(() => {
  measure()
  const next = fittedView()
  fitZoom = next.z
  view.value = next
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(resizeFrame)
  clearTimeout(resizeDone)
})

// when a panel opens or closes, move the web into the free space
watch(() => props.insetLeft + props.insetBottom, () => {
  // while the window is being resized the resize handler already keeps the web in place
  if (!resizing) refit()
})

// the camera: when a dot is picked (click, search, the card's list), glide so it sits in the middle of the
// space that is left of the card, zoomed in until the linked artists have room
// does the opened card sit on the right of the map? (only when the panels leave enough room)
function cardOnSide() {
  return boxWidth.value - props.insetLeft - props.insetRight >= SIDE_CARD_MIN
}

// how tall the card along the bottom of a small screen is
function sheetHeight() {
  // a phone held sideways has hardly any height: the card gets small so the map stays visible
  if (boxHeight.value < 520) return 150
  return Math.min(330, boxHeight.value * 0.4)
}

function frameCluster(id, animate = true) {
  const node = nodeById(id)
  if (!node) return

  measure()
  if (animate) glide()
  else smooth.value = false

  const group = [node, ...graph.neighbours[node.index].map(index => nodes[index])]
  let minX = node.x
  let maxX = node.x
  let minY = node.y
  let maxY = node.y
  let zoomToSeparate = 0 // the zoom at which every picture and name has room

  for (let i = 0; i < group.length; i++) {
    minX = Math.min(minX, group[i].x)
    maxX = Math.max(maxX, group[i].x)
    minY = Math.min(minY, group[i].y)
    maxY = Math.max(maxY, group[i].y)
    for (let j = i + 1; j < group.length; j++) {
      const distance = Math.hypot(group[i].x - group[j].x, group[i].y - group[j].y)
      // the opened artist and its name need a little more room than two linked artists
      const needed = compact.value ? (i === 0 ? 82 : 78) : (i === 0 ? 105 : 100)
      zoomToSeparate = Math.max(zoomToSeparate, needed / Math.max(distance, 1))
    }
  }

  // the card is on the right on a wide screen, along the bottom on a small one
  const wide = cardOnSide()
  const side = compact.value ? 56 : 50
  const left = props.insetLeft + side
  const right = boxWidth.value - props.insetRight - (wide ? CARD_WIDTH + 40 : 0) - side
  // on a small screen the search bar and Help button are over the top of the map, and the card covers the bottom
  // (with the left panel open the search bar is inside it, so the top of the map is free)
  const top = wide || props.insetLeft > 0 ? 64 : boxHeight.value < 520 ? 96 : 150
  const bottom = boxHeight.value - props.insetBottom - (wide ? 0 : sheetHeight()) - 52
  const roomWidth = Math.max(200, right - left)
  const roomHeight = Math.max(200, bottom - top)

  // zoom in until nothing touches, but never past what fits on the screen
  const zoomToFit = Math.min(roomWidth / Math.max(maxX - minX, 40), roomHeight / Math.max(maxY - minY, 40))
  const z = Math.min(fitZoom * 4.5, Math.max(fitZoom * 1.2, Math.min(zoomToSeparate, zoomToFit)))
  view.value = {
    x: left + roomWidth / 2 - ((minX + maxX) / 2) * z,
    y: top + roomHeight / 2 - ((minY + maxY) / 2) * z,
    z: z,
  }
}

// zooming by hand closes the opened dot, and the view stays where the user put it
let closedByZoom = false
function closeForZoom() {
  if (props.pickedId === null) return
  closedByZoom = true
  emit('pick', null)
}

watch(() => props.pickedId, id => {
  hoverId.value = null
  if (id) {
    frameCluster(id)
  } else if (closedByZoom) {
    closedByZoom = false
  } else if (view.value.z > fitZoom * 1.15) {
    // closing the card: go back to the whole web instead of staying zoomed in
    refit()
  }
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

// the wheel zooms the same way as the buttons
function onWheel(event) {
  closeForZoom()
  smooth.value = false
  const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
  zoomCentre(factor)
}

// ---- hover, click and the lit-up neighbours ----
const hoverId = ref(null)

function nodeById(id) {
  return nodes.find(node => node.id === id) || null
}

// an opened dot wins over hovering; hovering only previews a dot while nothing is open
const focusId = computed(() => (props.pickedId !== null ? props.pickedId : hoverId.value))

function hover(id) {
  hoverId.value = id
}
function unhover(id) {
  if (hoverId.value === id) hoverId.value = null
}
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
    'is-faded': focused && (props.pickedId !== null ? node.id !== props.pickedId : !litIds.value[node.id]),
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
const docked = computed(() => cardIsOpen.value && cardOnSide())

const neighbourNodes = computed(() => {
  const node = cardNode.value
  if (!node) return []
  return graph.neighbours[node.index].map(index => nodes[index])
})

const cardStyle = computed(() => {
  const node = cardNode.value
  if (!node) return {}

  // the opened card stays put (right side of the map, or along the bottom on a small screen) so it never covers the artists around the dot
  if (cardIsOpen.value) {
    if (docked.value) {
      return { left: boxWidth.value - props.insetRight - CARD_WIDTH - 24 + 'px', top: '84px', width: CARD_WIDTH + 'px', maxHeight: Math.max(240, boxHeight.value - 84 - 180) + 'px' }
    }
    const room = boxWidth.value - props.insetLeft - props.insetRight - 16
    const width = Math.min(560, room)
    return { left: props.insetLeft + 8 + (room - width) / 2 + 'px', width: width + 'px', bottom: '12px', maxHeight: sheetHeight() + 'px' }
  }

  const screenX = node.x * view.value.z + view.value.x
  const screenY = node.y * view.value.z + view.value.y
  const radius = node.r * view.value.z
  const width = 230
  const roomRight = screenX + radius + 16 + width < boxWidth.value - 8
  const left = roomRight ? screenX + radius + 16 : Math.max(8, screenX - radius - 16 - width)
  const top = Math.min(Math.max(12, screenY - 30), Math.max(12, boxHeight.value - 120))
  return { left: left + 'px', top: top + 'px', width: width + 'px' }
})

// ---- the opened dot: its picture, and the artists linked to it ----
// Every artist stays exactly where it is on the map. The picture of the opened dot and of each linked artist is
// drawn at a fixed size on the screen (the group is drawn with scale(1 / zoom)); the camera zooms in until none of
// them touch, so the lines are long and the names are all readable.
// phones get smaller pictures and names so a cluster still fits
const compact = computed(() => boxWidth.value < 600)
const heroPx = computed(() => (compact.value ? 32 : 40))
const pickedNeighbours = computed(() => (pickedNode.value ? graph.neighbours[pickedNode.value.index].map(index => nodes[index]) : []))

// the radius (screen pixels) of a linked artist's picture: bigger fan base, a little bigger picture
function bubbleRadius(node) {
  return (compact.value ? 17 : 22) + Math.min(4, node.fans / 1000)
}

// seconds: when the line to the linked artist starts drawing, and when its picture arrives
function lineDelay(position) {
  return 0.2 + position * 0.08
}
function popDelay(position) {
  return lineDelay(position) + 0.3
}

// Which names are written. A name only shows when it has room: it must not touch another picture or name, and it must be
// on the screen. The biggest fan bases are checked first. (Every name is also in the card's list.)
const shownNames = computed(() => {
  const hero = pickedNode.value
  const shown = {}
  if (!hero) return shown

  const z = view.value.z
  const letter = compact.value ? 6.2 : 6.8
  const spots = [hero].concat(pickedNeighbours.value).map(node => ({
    node: node,
    x: node.x * z + view.value.x,
    y: node.y * z + view.value.y,
    r: node === hero ? heroPx.value : bubbleRadius(node),
  }))

  // the opened artist's own name is always written; it is the first thing in the way
  const taken = [{ x1: spots[0].x - spots[0].node.name.length * 4.2, x2: spots[0].x + spots[0].node.name.length * 4.2, y1: spots[0].y + heroPx.value + 8, y2: spots[0].y + heroPx.value + 34 }]
  const byFans = spots.slice(1).sort((a, b) => b.node.fans - a.node.fans)

  for (const spot of byFans) {
    const half = (spot.node.name.length * letter) / 2
    const box = { x1: spot.x - half, x2: spot.x + half, y1: spot.y + spot.r + 6, y2: spot.y + spot.r + 22 }

    let free = box.x1 > 4 && box.x2 < boxWidth.value - 4 && box.y2 < boxHeight.value - 4
    for (const other of taken) {
      if (box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1) free = false
    }
    // not on top of any picture
    for (const other of spots) {
      if (other === spot) continue
      const nearestX = Math.max(box.x1, Math.min(other.x, box.x2))
      const nearestY = Math.max(box.y1, Math.min(other.y, box.y2))
      if (Math.hypot(nearestX - other.x, nearestY - other.y) < other.r + 4) free = false
    }

    if (free) {
      shown[spot.node.id] = true
      taken.push(box)
    }
  }
  return shown
})

// at a fixed size on the screen: the place of a dot on the map, drawn with scale(1 / zoom)
function pinTransform(node) {
  return 'translate(' + node.x + ' ' + node.y + ') scale(' + 1 / view.value.z + ')'
}

// a linked artist flies out from the opened dot: how far away it starts (screen pixels)
function flyFrom(node) {
  const hero = pickedNode.value
  return { '--x': (node.x - hero.x) * view.value.z, '--y': (node.y - hero.y) * view.value.z }
}

// only the opened dot's own circle is hidden (the stage draws its picture there)
function isPictured(node) {
  return props.pickedId === node.id
}

// The map turns off the browser's own touch scrolling (so a finger can drag the map), which would also stop the
// opened card's list from scrolling. So the card scrolls itself: it follows the finger.
let touchY = 0
function cardTouchStart(event) {
  touchY = event.touches[0].clientY
}
function cardTouchMove(event) {
  const y = event.touches[0].clientY
  event.currentTarget.scrollTop += touchY - y
  touchY = y
}

function clickBubble(node) {
  if (dragged) return
  emit('pick', node.id)
}

function openArtistPage(node) {
  if (dragged) return
  router.push('/artists/' + node.artistId)
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
        <path class="web__edges" :class="{ 'is-quiet': focusId !== null, 'is-blurred': pickedNode !== null }" :d="edgesPath" fill="none" />
        <path v-if="focusEdgesPath && !pickedNode" :key="focusId" class="web__edges web__edges--focus" :d="focusEdgesPath" fill="none" />

        <!-- your taste profile -->
        <g v-if="tasteSpot" class="web__taste" :transform="'translate(' + tasteSpot.x + ' ' + tasteSpot.y + ')'">
          <circle class="web__taste-glow" r="105" />
          <circle class="web__taste-ring" r="105" />
        </g>

        <!-- the artists (blurred while a dot is open) -->
        <g class="web__dots" :class="{ 'is-blurred': pickedNode !== null }">
          <g v-for="node in nodes" :key="node.id">
            <circle
              class="dot"
              :class="[dotClasses(node), { 'is-pictured': isPictured(node) }]"
              :cx="node.x"
              :cy="node.y"
              :r="node.r"
              :fill="node.color"
              :style="{ '--i': node.index }"
            />
          </g>
        </g>

        <!-- the opened dot: lines that draw themselves to the artists linked to it, and their pictures -->
        <g v-if="pickedNode" :key="pickedNode.id" class="stage">
          <g v-for="(other, position) in pickedNeighbours" :key="'line-' + other.id">
            <line
              class="stage__line"
              pathLength="1"
              :x1="pickedNode.x" :y1="pickedNode.y" :x2="other.x" :y2="other.y"
              :stroke="other.color"
              :stroke-width="2.5 / view.z"
              :style="{ animationDelay: lineDelay(position) + 's' }"
            />
            <line
              class="stage__spark"
              pathLength="1"
              :x1="pickedNode.x" :y1="pickedNode.y" :x2="other.x" :y2="other.y"
              :stroke-width="3.5 / view.z"
              :style="{ '--wait': popDelay(position) + 's' }"
            />
          </g>

          <!-- linked artists: they fly out from the opened dot to their own place on the map -->
          <g v-for="(other, position) in pickedNeighbours" :key="'bubble-' + other.id" :transform="pinTransform(other)">
            <g class="bubble" :style="{ ...flyFrom(other), animationDelay: popDelay(position) + 's' }">
              <g class="bubble__body" role="button" :aria-label="other.name" @pointerdown.stop @click.stop="clickBubble(other)">
                <title>{{ other.name }}</title>
                <circle :r="bubbleRadius(other) + 3" fill="#fff" />
                <circle :r="bubbleRadius(other) + 3" fill="none" :stroke="other.color" stroke-width="2" />
                <clipPath :id="'clip-' + other.id"><circle :r="bubbleRadius(other)" /></clipPath>
                <image
                  :href="pictureOf(other)"
                  :x="-bubbleRadius(other)" :y="-bubbleRadius(other)" :width="bubbleRadius(other) * 2" :height="bubbleRadius(other) * 2"
                  preserveAspectRatio="xMidYMid slice"
                  :clip-path="'url(#clip-' + other.id + ')'"
                />
              </g>
              <text v-if="shownNames[other.id]" class="bubble__name" :y="bubbleRadius(other) + 17">{{ other.name }}</text>
            </g>
          </g>

          <!-- the opened artist, the biggest of all -->
          <g :transform="pinTransform(pickedNode)">
            <g class="hero">
              <circle :r="heroPx + 4" fill="#fff" />
              <circle :r="heroPx + 4" fill="none" :stroke="pickedNode.color" stroke-width="3" />
              <clipPath :id="'clip-' + pickedNode.id"><circle :r="heroPx" /></clipPath>
              <image
                :href="pictureOf(pickedNode)"
                :x="-heroPx" :y="-heroPx" :width="heroPx * 2" :height="heroPx * 2"
                preserveAspectRatio="xMidYMid slice"
                :clip-path="'url(#clip-' + pickedNode.id + ')'"
              />
              <text class="hero__name" :y="heroPx + 26">{{ pickedNode.name }}</text>
              <g v-if="pickedNode.real" class="hero__page" role="button" :aria-label="'Open the page of ' + pickedNode.name" :transform="'translate(' + heroPx * 0.72 + ' ' + -heroPx * 0.72 + ')'" @pointerdown.stop @click.stop="openArtistPage(pickedNode)">
                <circle r="13" />
                <text y="5">↗</text>
              </g>
            </g>
          </g>
        </g>

        <!-- a bigger, invisible circle on every dot so small dots are easy to hover and click -->
        <g v-for="node in nodes" :key="'hit-' + node.id">
          <circle
            v-if="!isPictured(node)"
            class="dot-hit"
            :cx="node.x"
            :cy="node.y"
            :r="Math.max(node.r + 3, 10)"
            fill="transparent"
            tabindex="0"
            role="button"
            :aria-label="node.name + ', ' + genreOf(node).label"
            @mouseenter="hover(node.id)"
            @mouseleave="unhover(node.id)"
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
    <div class="map-controls" :class="{ 'is-hidden': cardIsOpen && !docked }" @pointerdown.stop @click.stop>
      
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
      @wheel.stop
      @touchstart="cardTouchStart"
      @touchmove="cardTouchMove"
    >
      <div class="card-head">
        <img class="card-avatar" :src="pictureOf(cardNode)" alt="" :style="{ borderColor: cardNode.color }" />
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
              <img class="card-thumb" :src="pictureOf(other)" alt="" :style="{ borderColor: other.color }" />
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
        <p v-else class="card-demo">A rising local act. They don't have an artist page yet.</p>
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
  background-color: var(--riffle-bg);
  background-image: radial-gradient(var(--riffle-dots) 1.2px, transparent 1.2px);
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
.web__edges.is-blurred {
  filter: blur(2px);
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
.web__dots {
  transition: filter 0.45s ease;
}
.web__dots.is-blurred {
  filter: blur(2.5px);
}
.dot.is-pictured {
  opacity: 0;
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

/* ---- the opened dot ---- */
.stage {
  pointer-events: none;
}

/* a line draws itself from the opened artist to each linked artist, then a soft spark keeps running along it */
.stage__line {
  stroke-linecap: round;
  stroke-dasharray: 1;
  opacity: 0.85;
  animation: line-draw 0.55s cubic-bezier(0.3, 0.7, 0.3, 1) backwards;
}
@keyframes line-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
.stage__spark {
  stroke: #fff;
  stroke-linecap: round;
  stroke-dasharray: 0.04 0.96;
  opacity: 0;
  animation: spark-run 2.2s linear infinite var(--wait), spark-show 0.3s ease forwards var(--wait);
}
@keyframes spark-run {
  from {
    stroke-dashoffset: 0.04;
  }
  to {
    stroke-dashoffset: -0.96;
  }
}
@keyframes spark-show {
  to {
    opacity: 0.8;
  }
}

/* the linked artists glide out from the opened dot and settle */
.bubble {
  animation: bubble-fly 0.7s cubic-bezier(0.2, 1.15, 0.35, 1) backwards;
}
@keyframes bubble-fly {
  from {
    opacity: 0;
    transform: translate(calc(var(--x) * -1px), calc(var(--y) * -1px)) scale(0.3);
  }
  to {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
}
.bubble__body {
  pointer-events: auto;
  cursor: pointer;
  transform-origin: 0 0;
  transition: transform 0.2s cubic-bezier(0.3, 1.6, 0.5, 1);
  filter: drop-shadow(0 4px 8px rgba(20, 35, 90, 0.3));
}
.bubble__body:hover {
  transform: scale(1.1);
}
.bubble__name,
.hero__name {
  fill: var(--riffle-ink);
  font-weight: 800;
  text-anchor: middle;
  stroke: #fff;
  stroke-linejoin: round;
  paint-order: stroke;
  pointer-events: none;
}
.bubble__name {
  font-size: 12px;
  stroke-width: 4px;
}
@media (max-width: 599.98px) {
  .bubble__name {
    font-size: 11px;
  }
  .hero__name {
    font-size: 13px;
  }
}

/* the opened artist */
.hero {
  transform-origin: 0 0;
  filter: drop-shadow(0 8px 16px rgba(20, 35, 90, 0.3));
  animation: hero-pop 0.6s cubic-bezier(0.2, 1.3, 0.4, 1) backwards;
}
@keyframes hero-pop {
  from {
    opacity: 0;
    transform: scale(0.3);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.hero__name {
  font-size: 15px;
  stroke-width: 5px;
  animation: label-in 0.4s ease 0.5s backwards;
}
@keyframes label-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
.hero__page {
  pointer-events: auto;
  cursor: pointer;
}
.hero__page circle {
  fill: var(--riffle-navy);
  stroke: #fff;
  stroke-width: 2.5px;
}
.hero__page text {
  fill: #fff;
  font-size: 15px;
  font-weight: 800;
  text-anchor: middle;
}
.hero__page:hover circle {
  fill: #e0245e;
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
  overflow-y: auto;
  pointer-events: auto;
  cursor: default;
  animation: card-slide 0.45s cubic-bezier(0.2, 0.9, 0.3, 1) 0.25s backwards;
}
@keyframes card-slide {
  from {
    opacity: 0;
    transform: translateX(28px);
  }
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
  flex: none;
  width: 46px;
  height: 46px;
  border: 2.5px solid;
  border-radius: 50%;
  object-fit: cover;
  background: #15123a center / cover;
}
.card-thumb {
  flex: none;
  width: 26px;
  height: 26px;
  margin-right: 0.55rem;
  border: 2px solid;
  border-radius: 50%;
  object-fit: cover;
  background: #15123a center / cover;
}
.card-demo {
  margin: 0.7rem 0 0;
  color: var(--riffle-faint);
  font-size: 0.78rem;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 0.65rem;
  padding: 0.55rem 0.6rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #e0245e, #7b2a9e);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.card-profile:hover {
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(224, 36, 94, 0.35);
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
.map-controls.is-hidden {
  display: none;
}
@media (max-width: 991.98px) {
  .map-controls {
    right: 12px;
    bottom: 12px;
  }
}
</style>
