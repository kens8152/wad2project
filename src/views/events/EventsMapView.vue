<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EventsShell from '../../components/events/EventsShell.vue'
import EventMap from '../../components/events/EventMap.vue'
import EventMapCard from '../../components/events/EventMapCard.vue'
import SortDropdown from '../../components/events/SortDropdown.vue'
import { SORTS, useEventFilters } from '../../composables/events/useEventFilters'
import { useEventsData } from '../../composables/events/useEventsData'
import { useEventsTour } from '../../composables/events/useEventsTour'

const route = useRoute()
const router = useRouter()
const filters = useEventFilters()
const data = useEventsData()

const selectedId = ref(null) // the pin that was clicked
const highlightId = ref(null) // its card, highlighted once the strip has stopped scrolling
const hoverId = ref(null) // the card the mouse is over (the map lights up that pin too)
const cardsEl = ref(null) // the scrolling strip of cards under the map (template ref)
let highlightTimer = null // the 80 ms check inside select() that waits for the strip to stop scrolling

// go to the event's own page
function open(id) {
  router.push({ name: 'event-detail', params: { id } })
}

// Pin click → scroll its card into view (clicking the same pin again un-selects it), then highlight the card once the
// strip has stopped moving, so it is obvious which event was picked.
function select(id) {
  clearInterval(highlightTimer)

  // clicking the selected pin again removes the highlight
  if (selectedId.value === id) {
    selectedId.value = null
    highlightId.value = null
    return
  }

  selectedId.value = id
  highlightId.value = null

  const strip = cardsEl.value
  const card = strip?.querySelector(`[data-event-id="${id}"]`)
  if (!card) {
    highlightId.value = id
    return
  }

  // where the card is inside the (horizontally scrolling) strip
  const cardLeft = card.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft
  // keep a margin so the glow is not cut off, but never ask for more than the strip can scroll
  // (the last cards cannot reach the left edge, which used to make the highlight wait)
  const maxScroll = strip.scrollWidth - strip.clientWidth
  const target = Math.min(maxScroll, Math.max(0, cardLeft - 28))
  if (Math.abs(strip.scrollLeft - target) < 2) {
    // already in view: highlight straight away
    highlightId.value = id
    return
  }

  strip.scrollTo({ left: target, behavior: 'smooth' })
  // the cards are under the map, so make sure the strip itself is on screen too
  strip.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  // check every 80ms: highlight when the strip arrives (or has stopped moving)
  const startPosition = strip.scrollLeft
  let lastPosition = startPosition
  let moved = false
  let stillTicks = 0
  let ticks = 0
  highlightTimer = setInterval(() => {
    ticks++
    const now = strip.scrollLeft
    if (now !== startPosition) moved = true
    if (now === lastPosition) stillTicks++
    else stillTicks = 0
    lastPosition = now

    const arrived = Math.abs(now - target) < 2
    const stopped = moved && stillTicks >= 4
    const notMoving = !moved && ticks > 6 // nothing to scroll, so do not keep the user waiting
    if (arrived || stopped || notMoving || ticks > 40) {
      clearInterval(highlightTimer)
      highlightId.value = id
    }
  }, 80)
}

// Sorting only re-arranges the cards: show the row from its first card, in the new order.
// (It must not jump to the selected event, which is where the browser would otherwise
// keep the row scrolled to - see overflow-anchor below.)
watch(filters.sort, async () => {
  clearInterval(highlightTimer)
  await nextTick() // wait until the cards have been re-ordered
  cardsEl.value?.scrollTo({ left: 0, behavior: 'auto' })
})

// "View on map" on an event page comes here with ?focus=<event id>: that event is selected and the map shows it close up.
// If the filters hide that event, the map shows the events at its venue instead (the same as the venue links elsewhere).
const focusId = computed(() => {
  const id = Array.isArray(route.query.focus) ? route.query.focus[0] : route.query.focus
  return id || null
})
// the map is only asked to show the event while that event is among the results
function focusInResults(events) {
  return focusId.value && events.some((e) => e.id === focusId.value) ? focusId.value : null
}

let selectedFromLink = null // the event already selected from the link, so it only happens once
let widenedFor = null // the event the filters were already widened for, so that also only happens once

// Runs when the link, the results or `ready` change (and once straight away, `immediate: true`).
// Once the data is ready: if the linked event is in the results, select it; otherwise show everything at its venue.
watch([focusId, filters.results, filters.ready], ([id, list, ready]) => {
  if (!id || !ready || selectedFromLink === id) return

  if (list.some((e) => e.id === id)) {
    selectedFromLink = id
    select(id)
  } else if (widenedFor !== id) {
    widenedFor = id
    const event = data.getEvent(id)
    if (event) filters.applyQuery({ venue: event.venueId })
  }
}, { immediate: true })

// The Events guide picks a pin (and lets it go again) through these commands.
const tour = useEventsTour()
watch(
  () => tour.command.value,
  (command) => {
    if (command.type === 'select' && command.id && selectedId.value !== command.id) select(command.id)
    else if (command.type === 'clear' && selectedId.value) {
      clearInterval(highlightTimer)
      selectedId.value = null
      highlightId.value = null
      cardsEl.value?.scrollTo({ left: 0, behavior: 'smooth' })
    }
  },
  { flush: 'sync' }, // every command counts, even two sent one after the other
)

// Drop a selection that's been filtered out.
watch(filters.results, (list) => {
  if (selectedId.value && !list.some((e) => e.id === selectedId.value)) {
    selectedId.value = null
    highlightId.value = null
  }
})
</script>

<template>
  <EventsShell view="map">
    <!-- Same layout as the List page: the shell does the filters and states, and this page fills its two slots.
         (No comment above <EventsShell>: a page needs ONE root element for the page-change fade to work.) -->
    <template #actions>
      <SortDropdown v-model="filters.sort.value" :options="SORTS" />
    </template>

    <template #default="{ events }">
      <div class="map-stage">
        <div class="map-stage__map">
        <!-- The map gets props down (events, genres, where you are, which pin is selected / hovered / focused)
             and sends events up (@select when a pin is clicked, @open when it is double-clicked). -->
        <EventMap
          :events="events"
          :genres="filters.genres.value"
          :user-location="filters.user.value.location"
          :selected-id="selectedId"
          :hover-id="hoverId"
          :focus-id="focusInResults(events)"
          @select="select"
          @open="open"
        />
        </div>

        <!-- the sideways-scrolling row of cards under the map. `data-event-id` is how select() finds a card to scroll to,
             and `@hover` tells this page which card the mouse is on (so the map can light up that pin). -->
        <div ref="cardsEl" class="map-stage__cards" aria-label="Events on the map">
          <div v-for="e in events" :key="e.id" :data-event-id="e.id" class="map-stage__card-wrap">
            <EventMapCard
              :event="e"
              :active="highlightId === e.id"
              @hover="hoverId = $event"
            />
          </div>
        </div>
      </div>
    </template>
  </EventsShell>
</template>

<style scoped>
.map-stage {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.map-stage__map {
  position: relative;
  height: clamp(400px, 56vh, 540px);
  border-radius: var(--riffle-radius);
  box-shadow: var(--riffle-shadow);
}
.map-stage__map > :deep(.event-map) {
  position: absolute;
  inset: 0;
  height: auto;
  min-height: 0;
}

/* wide screens: the map grows to fill whatever height is left above the card row */
@media (min-width: 992px) {
  .map-stage {
    height: 100%;
  }
  .map-stage__map {
    height: auto;
    flex: 1 1 0;
    min-height: 400px;
  }
}

/* the event cards sit directly below the map */
.map-stage__cards {
  display: flex;
  gap: 14px;
  /* room around the cards, so a selected card's lift and glow are never cut off */
  padding: 14px 28px 26px;
  overflow-x: auto;
  overflow-anchor: none; /* do not follow a card to its new place when the order changes */
}
/* the flex padding at the end of a scrolling row is ignored by some browsers */
.map-stage__cards::after {
  content: '';
  flex: 0 0 1px;
}
.map-stage__card-wrap {
  display: flex;
  flex: 0 0 min(300px, 80%);
}
</style>
