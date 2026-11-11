<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ATTRIBUTION, MAX_ZOOM, MIN_ZOOM, SG_BOUNDS, TILE_URL } from '../../utils/events/onemap'

// A small map of where one event is (OneMap tiles drawn with Leaflet, one pin on the venue).
//   props:  venue (with lat / lng / fullName), color (the colour of the pin), linkTo (the route "View on map" goes to)
const props = defineProps({
  venue: { type: Object, required: true },
  color: { type: String, default: '#2563eb' },
  linkTo: { type: Object, required: true },
})

const START_ZOOM = 16 // a street-level view of the venue
const mapEl = ref(null) // the box Leaflet draws into
const zoomLevel = ref(START_ZOOM) // kept so the + / - buttons can switch themselves off at the limits
let map = null // the Leaflet map (kept out of Vue's reactivity on purpose)
let pin = null // the one marker, on the venue
let observer = null // the ResizeObserver (see onMounted)

// the pin: the same teardrop as on the Events map, in the colour of the event's genre
// (Unlike the big map, this one uses a real Leaflet marker, because there is only one pin and no cards to sync with.
// `divIcon` lets the marker be our own HTML + CSS instead of Leaflet's default image.)
function pinIcon() {
  return L.divIcon({
    className: 'mini-pin-holder',
    html: `<span class="mini-pin" style="--pin:${props.color}"></span>`,
    iconSize: [0, 0], // the CSS places the pin so that its tip is on the venue
  })
}

// created once the box exists in the page. It uses the same OneMap tiles and settings as the big map (onemap.js).
onMounted(() => {
  const touchScreen = window.matchMedia('(pointer: coarse)').matches // true on phones and tablets
  map = L.map(mapEl.value, {
    zoomControl: false, // our own buttons are used instead
    scrollWheelZoom: false, // plain scrolling scrolls the page, not the map
    dragging: !touchScreen, // on a touch screen a finger on the map should still scroll the page
    zoomSnap: 1,
    zoomDelta: 1,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: SG_BOUNDS,
    maxBoundsViscosity: 1,
  })
  map.attributionControl.setPrefix('') // keep only the OneMap credit
  L.tileLayer(TILE_URL, { detectRetina: true, attribution: ATTRIBUTION, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM + 1 }).addTo(map) // +1: a retina screen takes one off this

  map.setView([props.venue.lat, props.venue.lng], START_ZOOM)
  pin = L.marker([props.venue.lat, props.venue.lng], { icon: pinIcon(), keyboard: false }).addTo(map)
  map.on('zoomend', () => (zoomLevel.value = map.getZoom()))

  // the box can change size (the window, the layout), so the map measures itself again
  observer = new ResizeObserver(() => map.invalidateSize())
  observer.observe(mapEl.value)
})

// clean up when leaving the page
onBeforeUnmount(() => {
  observer?.disconnect()
  map?.remove()
})

// another event (for example "More at this venue"): move the map and the pin
watch(
  () => [props.venue.lat, props.venue.lng, props.color],
  () => {
    if (!map) return
    map.setView([props.venue.lat, props.venue.lng], START_ZOOM)
    pin.setLatLng([props.venue.lat, props.venue.lng])
    pin.setIcon(pinIcon())
  },
)

// the + and - buttons (amount is 1 or -1)
function zoomStep(amount) {
  map.setZoom(map.getZoom() + amount)
}
</script>

<template>
  <section class="riffle-card mini-map">
    <div class="mini-map__box">
      <div ref="mapEl" class="mini-map__tiles" :aria-label="`Map of ${venue.fullName}`"></div>

      <div class="mini-map__zoom">
        <button type="button" aria-label="Zoom in" :disabled="zoomLevel >= MAX_ZOOM" @click="zoomStep(1)">
          <i class="bi bi-plus-lg"></i>
        </button>
        <button type="button" aria-label="Zoom out" :disabled="zoomLevel <= MIN_ZOOM" @click="zoomStep(-1)">
          <i class="bi bi-dash-lg"></i>
        </button>
      </div>
    </div>

    <div class="mini-map__foot">
      <strong>{{ venue.fullName }}</strong>
      <RouterLink :to="linkTo">View on map <i class="bi bi-arrow-right"></i></RouterLink>
    </div>
  </section>
</template>

<style scoped>
.mini-map {
  overflow: hidden;
}

.mini-map__box {
  position: relative;
  height: 280px;
}
/* the Leaflet map fills the box; isolation keeps Leaflet's own layers below the zoom buttons */
.mini-map__tiles {
  position: absolute;
  inset: 0;
  z-index: 0;
  isolation: isolate;
  background: var(--riffle-surface-soft);
}

.mini-map__zoom {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
  background: var(--riffle-surface);
  box-shadow: var(--riffle-shadow);
}
.mini-map__zoom button {
  width: 40px;
  height: 40px;
  border: 0;
  background: transparent;
  font-size: 1.1rem;
  color: var(--riffle-ink);
}
.mini-map__zoom button + button {
  border-top: 1px solid var(--riffle-border);
}
.mini-map__zoom button:hover:not(:disabled) {
  background: var(--riffle-surface-soft);
}
.mini-map__zoom button:disabled {
  color: var(--riffle-faint);
}

.mini-map__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  border-top: 1px solid var(--riffle-border);
}
.mini-map__foot strong {
  color: var(--riffle-ink);
}
.mini-map__foot a {
  flex: none;
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;
}
.mini-map__foot a:hover {
  text-decoration: underline;
}

/* The pin is drawn by Leaflet outside this component, so the styles reach it with :deep */
.mini-map :deep(.mini-pin-holder) {
  background: none;
  border: 0;
}
.mini-map :deep(.mini-pin) {
  position: absolute;
  left: 0;
  top: -26px;
  width: 26px;
  height: 26px;
  border: 2px solid #fff;
  border-radius: 50% 50% 50% 0;
  background: var(--pin);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transform-origin: 0 100%; /* the sharp corner is the tip, so it stays on the venue */
  transform: rotate(-45deg);
}
.mini-map :deep(.mini-pin)::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 9px;
  height: 9px;
  margin: -4.5px 0 0 -4.5px;
  border-radius: 50%;
  background: var(--riffle-surface);
}
</style>
