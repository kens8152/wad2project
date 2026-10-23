<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ATTRIBUTION, MAX_ZOOM, MIN_ZOOM, SG_BOUNDS, TILE_URL } from '../utils/onemap'

// Interactive map surface (OneMap tiles drawn with Leaflet, pins, genre key).
//
// This is the ONLY component that knows how the map is drawn.
//   props:  events (hydrated, with event.venue.lat/lng), genres, userLocation,
//           selectedId, hoverId
//   emits:  select(id), open(id)
//
// Leaflet draws the map itself (tiles, dragging, zooming). The pins and the "you are here"
// marker are normal Vue elements laid over the map; their pixel position is worked out from
// their lat/lng every time the map moves or zooms.
const props = defineProps({
  events: { type: Array, required: true },
  genres: { type: Array, required: true },
  userLocation: { type: Object, required: true },
  selectedId: { type: String, default: null },
  hoverId: { type: String, default: null },
})
const emit = defineEmits(['select', 'open'])

const root = ref(null)
const mapEl = ref(null)
const zoomLevel = ref(MIN_ZOOM)
const keyOpen = ref(typeof window === 'undefined' || window.innerWidth >= 768)
const zooming = ref(false) // true while a zoom animation runs, so the pins glide along with the tiles
let map = null // the Leaflet map (kept out of Vue's reactivity on purpose)
let zoomTimer = null
// Until you touch the map (drag, zoom or pick a pin), it keeps itself fitted to every event shown, whenever the
// events or the size of the box change. So the first thing you see is the same view as "Show all events".
let autoFit = true

// where each marker is on screen, in pixels from the top-left of the map box
const pixel = ref({})
const userPixel = ref(null)

function toPixel(lat, lng, center, zoom) {
  // centre and zoom can be the ones the map is about to have (during a zoom animation)
  const size = map.getSize()
  const here = map.project([lat, lng], zoom)
  const mid = map.project(center, zoom)
  return { x: here.x - mid.x + size.x / 2, y: here.y - mid.y + size.y / 2 }
}

function refresh(center = map.getCenter(), zoom = map.getZoom()) {
  if (!map) return
  const next = {}
  for (const pin of pins.value) {
    const spot = toPixel(pin.lat, pin.lng, center, zoom)
    // events at the same venue are lined up side by side so every event has a pin of its own
    next[pin.id] = { x: spot.x + pin.sideways, y: spot.y }
  }
  pixel.value = next
  userPixel.value = toPixel(props.userLocation.lat, props.userLocation.lng, center, zoom)
  zoomLevel.value = map.getZoom()
}

function zoomStep(amount) {
  autoFit = false
  map.setZoom(map.getZoom() + amount)
}

// "Show all events": zoom and move so that every pin is inside the box.
// The map starts in this same view, so the first thing you see is every event.
function fitAll(animate = true) {
  if (!pins.value.length) return
  const bounds = L.latLngBounds(pins.value.map((p) => [p.lat, p.lng]))
  map.fitBounds(bounds, { padding: [80, 80], maxZoom: 16, animate: animate })
}

// Plain scrolling scrolls the page as usual. The map only zooms with
// Ctrl (or Cmd) + scroll, and shows a small reminder otherwise.
const zoomHint = ref(false)
let hintTimer = null
let wheelLocked = false

function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) {
    zoomHint.value = true
    clearTimeout(hintTimer)
    hintTimer = setTimeout(() => (zoomHint.value = false), 1200)
    return
  }
  e.preventDefault()
  autoFit = false
  if (wheelLocked) return
  const rect = root.value.getBoundingClientRect()
  // one zoom level per wheel "notch" (or pinch), zooming towards the mouse
  const point = L.point(e.clientX - rect.left, e.clientY - rect.top)
  const next = map.getZoom() + (e.deltaY < 0 ? 1 : -1)
  map.setZoomAround(point, Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)))
  wheelLocked = true // a fast wheel or trackpad sends many events, so wait for this zoom to finish
  setTimeout(() => (wheelLocked = false), 350)
}

// ---- set up / tear down ----------------------------------------------------------
let observer
onMounted(() => {
  map = L.map(mapEl.value, {
    zoomControl: false, // our own buttons are used instead
    scrollWheelZoom: false, // zoom is handled in onWheel (Ctrl / Cmd + scroll)
    zoomSnap: 1, // whole zoom levels only, so the map tiles are always drawn sharp (never stretched)
    zoomDelta: 1,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: SG_BOUNDS,
    maxBoundsViscosity: 1,
  })
  map.attributionControl.setPrefix('') // keep only the OneMap credit
  // detectRetina: on a sharp (retina) screen, ask OneMap for the next zoom level's tiles and draw them at half
  // size, so the street names are small and crisp instead of stretched
  L.tileLayer(TILE_URL, { detectRetina: true, attribution: ATTRIBUTION, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM }).addTo(map)

  map.setView([1.295, 103.8575], 14) // a first view; it is fitted to the pins once the box has a size
  map.on('move zoom', () => refresh())
  map.on('zoomanim', (e) => {
    // the zoom animation is about to start: send the pins to where they will end up
    zooming.value = true
    clearTimeout(zoomTimer)
    zoomTimer = setTimeout(() => (zooming.value = false), 400)
    refresh(e.center, e.zoom)
  })
  map.on('zoomend', () => (zooming.value = false))

  map.on('dragstart', () => (autoFit = false))

  observer = new ResizeObserver(() => {
    map.invalidateSize()
    if (autoFit && root.value.clientWidth > 0) fitAll(false)
    refresh()
  })
  observer.observe(root.value)
  refresh()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(zoomTimer)
  clearTimeout(hintTimer)
  map?.remove()
})

// ---- markers ---------------------------------------------------------------------
// the colour of a genre (the pin takes the colour of its genre)
function genreColor(genreId) {
  const genre = props.genres.find((g) => g.id === genreId)
  return genre ? genre.hex : '#2563eb'
}

// Several events can be at the same venue (so at the same place on the map). Without this their pins would
// sit exactly on top of each other. Each pin gets a few pixels to the left or right of the venue instead.
const PIN_GAP = 26
const pins = computed(() => {
  // how many events are at each venue
  const total = {}
  for (const e of props.events) {
    total[e.venueId] = (total[e.venueId] || 0) + 1
  }

  const placedSoFar = {}
  const list = []
  for (const e of props.events) {
    const place = placedSoFar[e.venueId] || 0
    placedSoFar[e.venueId] = place + 1

    list.push({
      id: e.id,
      lat: e.venue.lat,
      lng: e.venue.lng,
      // 0 for a venue with one event; -13 and +13 for two events; and so on, centred on the venue
      sideways: (place - (total[e.venueId] - 1) / 2) * PIN_GAP,
      color: genreColor(e.genreId),
      label: `${e.headliner.name} - ${e.dowLabel} ${e.timeCompact}`,
    })
  }
  return list
})
watch(pins, () => {
  if (autoFit && map) fitAll(false)
  refresh()
})

const pinHoverId = ref(null) // the pin the mouse is over
const activeId = computed(() => props.hoverId || pinHoverId.value || props.selectedId)

// Bring the selected pin into view (smoothly) when it is chosen from a pin or a card.
watch(
  () => props.selectedId,
  (id) => {
    if (!id || !map) return
    const pin = pins.value.find((p) => p.id === id)
    if (!pin) return
    const at = pixel.value[pin.id]
    const size = map.getSize()
    const margin = 90
    const visible = at && at.x > margin && at.x < size.x - margin && at.y > margin && at.y < size.y - margin
    autoFit = false
    if (!visible) {
      // far away: move there, but do not stay zoomed in too close
      map.setView([pin.lat, pin.lng], Math.min(map.getZoom(), 15), { animate: true })
    }
  },
)
</script>

<template>
  <div ref="root" class="event-map" @wheel="onWheel">
    <!-- the OneMap map (Leaflet draws it in here) -->
    <div ref="mapEl" class="event-map__tiles"></div>

    <!-- markers laid over the map -->
    <div class="event-map__markers" :class="{ 'is-zooming': zooming }">
      <!-- your location -->
      <div
        v-if="userPixel"
        class="event-map__marker event-map__marker--you"
        :style="{ left: `${userPixel.x}px`, top: `${userPixel.y}px` }"
      >
        <span class="event-map__you-wave"></span>
        <span class="event-map__you-wave event-map__you-wave--2"></span>
        <span class="event-map__you" title="You are here"></span>
      </div>

      <!-- event pins -->
      <template v-for="pin in pins" :key="pin.id">
        <div
          v-if="pixel[pin.id]"
          class="event-map__marker"
          :class="{ 'is-active': activeId === pin.id }"
          :style="{ left: `${pixel[pin.id].x}px`, top: `${pixel[pin.id].y}px` }"
        >
          <button
            type="button"
            class="event-map__pin"
            :style="{ '--pin': pin.color }"
            :aria-label="pin.label"
            @pointerenter="pinHoverId = pin.id"
            @pointerleave="pinHoverId = null"
            @click.stop="emit('select', pin.id)"
            @dblclick.stop="emit('open', pin.id)"
          ></button>
          <span v-if="activeId === pin.id" class="event-map__label">{{ pin.label }}</span>
        </div>
      </template>
    </div>

    <!-- shown briefly when scrolling over the map -->
    <Transition name="zoom-hint">
      <div v-if="zoomHint" class="event-map__hint">Use Ctrl + scroll to zoom the map</div>
    </Transition>

    <!-- genre key -->
    <div class="event-map__key" @wheel.stop>
      <button type="button" class="event-map__key-head" :aria-expanded="keyOpen" @click="keyOpen = !keyOpen">
        Genre key <i class="bi" :class="keyOpen ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </button>
      <ul v-if="keyOpen" class="event-map__key-list">
        <li v-for="g in genres" :key="g.id"><span class="dot" :style="{ background: g.color }"></span>{{ g.label }}</li>
        <li class="event-map__key-you"><span class="dot dot--you"></span>Your location</li>
      </ul>
    </div>

    <!-- zoom -->
    <div class="event-map__zoom" @wheel.stop>
      <button type="button" aria-label="Zoom in" :disabled="zoomLevel >= MAX_ZOOM - 0.001" @click="zoomStep(1)">
        <i class="bi bi-plus-lg"></i>
      </button>
      <button type="button" aria-label="Zoom out" :disabled="zoomLevel <= MIN_ZOOM + 0.001" @click="zoomStep(-1)">
        <i class="bi bi-dash-lg"></i>
      </button>
      <button type="button" aria-label="Show all events" title="Show all events" @click="fitAll()">
        <i class="bi bi-arrows-fullscreen"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.event-map {
  position: relative;
  overflow: hidden;
  height: 100%;
  min-height: 420px;
  border-radius: var(--riffle-radius);
  background: #e9edf4;
  user-select: none;
}

/* the Leaflet map fills the box; isolation keeps Leaflet's own layers below our markers and buttons */
.event-map__tiles {
  position: absolute;
  inset: 0;
  z-index: 0;
  isolation: isolate;
  background: #e9edf4;
}

/* the markers sit over the map; empty space lets mouse and touch through to the map below */
.event-map__markers {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}
/* while the map zooms, the markers glide to their new place at the same speed as the tiles */
.event-map__markers.is-zooming .event-map__marker {
  transition:
    left 0.25s cubic-bezier(0, 0, 0.25, 1),
    top 0.25s cubic-bezier(0, 0, 0.25, 1);
}

.event-map__marker {
  --inv: 1; /* pins keep the same size at every zoom level */
  position: absolute;
  width: 0;
  height: 0;
  z-index: 2;
}
.event-map__marker.is-active {
  z-index: 5;
}

.event-map__marker--you {
  z-index: 3;
}

/* "You are here": a dark dot with a white border, sending out soft waves in the Riffle colours */
.event-map__you-wave {
  position: absolute;
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  border: 2px solid #ff4d8d;
  border-radius: 50%;
  opacity: 0;
  transform: scale(var(--inv));
  animation: you-wave 2.4s ease-out infinite;
}
.event-map__you-wave--2 {
  border-color: #7c4dff;
  animation-delay: 1.2s;
}
@keyframes you-wave {
  0% {
    opacity: 0.85;
    transform: scale(calc(var(--inv) * 0.7));
  }
  100% {
    opacity: 0;
    transform: scale(calc(var(--inv) * 2.4));
  }
}
.event-map__you {
  pointer-events: auto; /* so the "You are here" tooltip shows */
  position: absolute;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border-radius: 50%;
  background: #0b1220;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  transform: scale(var(--inv));
}

/* Event pins: the classic map pin (a teardrop whose tip marks the venue) */
.event-map__pin {
  position: absolute;
  left: 0;
  top: -22px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 0;
  background: var(--pin);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transform-origin: 0 100%; /* the sharp corner is the tip, so it stays on the venue */
  transform: rotate(-45deg) scale(var(--inv));
  transition: box-shadow 0.15s;
  cursor: pointer;
  pointer-events: auto;
}
.event-map__pin::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  border-radius: 50%;
  background: #fff;
}
.event-map__marker.is-active .event-map__pin {
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px var(--pin), 0 3px 10px rgba(0, 0, 0, 0.45); /* a white ring and a ring in the genre colour */
  transform: rotate(-45deg) scale(calc(var(--inv) * 1.25));
}

.event-map__label {
  position: absolute;
  left: 0;
  bottom: 0;
  /* the pin head reaches about 31px above its tip (39px when selected), so keep well clear of it */
  transform: translate(-50%, -52px) scale(var(--inv));
  transform-origin: 50% 100%;
  padding: 0.38rem 0.85rem;
  border-radius: 999px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(20, 35, 90, 0.2);
  pointer-events: none;
  animation: label-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
/* little arrow pointing down at the pin */
.event-map__label::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 2px;
  background: #fff;
  transform: rotate(45deg);
}
@keyframes label-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -30px) scale(calc(var(--inv) * 0.55));
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -52px) scale(var(--inv));
  }
}

/* overlays */
.event-map__key {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  min-width: 150px;
  padding: 0.45rem 0.65rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--riffle-shadow);
  cursor: default;
}
.event-map__key-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--riffle-muted);
}
.event-map__key-list {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--riffle-ink);
}
.event-map__key-list li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.08rem 0;
}
.event-map__key-you {
  margin-top: 0.25rem;
  padding-top: 0.35rem !important;
  border-top: 1px solid var(--riffle-border);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: none;
}
.dot--you {
  background: #0b1220;
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px #d9deee;
}

.event-map__zoom {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--riffle-shadow);
}
.event-map__zoom button {
  width: 44px;
  height: 44px;
  border: 0;
  background: transparent;
  font-size: 1.1rem;
  color: var(--riffle-ink);
}
.event-map__zoom button + button {
  border-top: 1px solid var(--riffle-border);
}
.event-map__zoom button:hover:not(:disabled) {
  background: #eef1fb;
}
.event-map__zoom button:disabled {
  color: var(--riffle-faint);
}

@media (max-width: 575.98px) {
  .event-map__key {
    min-width: 0;
  }
}

.event-map__hint {
  position: absolute;
  left: 50%;
  top: 14px;
  transform: translateX(-50%);
  z-index: 11;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  background: rgba(12, 30, 74, 0.88);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  pointer-events: none;
  white-space: nowrap;
}
.zoom-hint-enter-active,
.zoom-hint-leave-active {
  transition: opacity 0.2s;
}
.zoom-hint-enter-from,
.zoom-hint-leave-to {
  opacity: 0;
}
</style>
