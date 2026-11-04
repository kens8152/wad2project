<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DiscoverTour from '../discover/DiscoverTour.vue'
import { useEventsTour } from '../../composables/events/useEventsTour'
import { useEventFilters } from '../../composables/events/useEventFilters'
import { bringOnScreen, forgetSeen, hasSettled, isOnScreen, isStill, scrollHasStopped } from '../../utils/tourChecks'

// The guide for the Events pages. It lives outside the pages (in App.vue) because it starts on the map and ends on the
// list, and a guide inside a page would be closed when the page changes.
//
// Each step says which page it is on ("page"), whether a pin is picked ("pick") and whether the map is zoomed in on it
// ("zoom"). When a step needs something different from the one before (another page, another pin, the page has to
// scroll), the spotlight first fades out, the page changes, and the spotlight comes back once the parts are there and
// have stopped moving. That is what keeps it from flashing or sliding across the screen.

const route = useRoute()
const router = useRouter()
const tour = useEventsTour()
const filters = useEventFilters()

const ROUTES = { map: 'events-map', list: 'events-list' }

// the event the guide picks on the map: the first one in the row of cards
const pickedId = ref(null)

// Wide screens show the filters next to the map. On a small screen they are folded away behind a "Filters" button,
// so the preferences step is left out there (it is inside the folded filters).
const wide = ref(true)

function pinOf(id) {
  return `.event-map__marker[data-pin-id="${id}"] .event-map__pin` // the pin itself (its holder has no size)
}
function cardOf(id) {
  return `.map-stage__card-wrap[data-event-id="${id}"] .map-card`
}

const steps = computed(() => {
  const id = pickedId.value
  const list = [
    {
      page: 'map',
      title: 'Filter the events',
      text: wide.value
        ? 'Search, or narrow the events down by genre, artist, distance and date. Press Apply filters to update the map and the list.'
        : 'Open Filters to search, or narrow the events down by genre, artist, distance and date. You can save your choices as your preferences there.',
      targets: [wide.value ? '.events-shell__sidebar .filters' : '.events-shell__filter-toggle', '.events-search'],
    },
    wide.value && {
      page: 'map',
      title: 'Save your preferences',
      text: 'Found filters you like? Tap the heart to save them as your preferences, then turn the switch on to bring them back any time.',
      targets: ['.filters__prefs'],
    },
    {
      page: 'map',
      title: 'Every event on a map',
      text: 'Each pin is an event at its venue, coloured by its genre (see the Genre key). The blue dot is where you are.',
      targets: ['.map-stage__map'],
    },
    {
      page: 'map',
      pick: true,
      title: 'Pick a pin',
      text: 'Click a pin to see its event highlighted in the row below. Click it again to let go, or double-click to open the event.',
      targets: [pinOf(id), cardOf(id)],
    },
    {
      page: 'map',
      pick: true,
      zoom: true,
      title: 'Zoom in and out',
      text: 'Use + and − to zoom, the arrows to see every event again, and the target to fly in to the picked event. Ctrl + scroll zooms too.',
      targets: ['.event-map__zoom', '.map-stage__map'],
    },
    {
      page: 'map',
      title: 'Browse the events',
      text: 'The cards under the map scroll sideways. Point at a card to find its pin, or click it to open the event.',
      targets: ['.map-stage__cards'],
    },
    {
      page: 'map',
      title: 'Prefer a list?',
      text: 'Switch between the map and a list of every event here. Press Next to see the list.',
      targets: ['.view-toggle'],
    },
    {
      page: 'list',
      title: 'The list view',
      text: 'The same events and filters, as cards. Use Sort to change their order, and open any card to see the full event.',
      targets: ['.events-shell__sort', '.events-list__grid > :first-child'],
    },
    {
      page: 'list',
      title: 'Come back anytime',
      text: 'Reopen this guide anytime with the Guide button. Every event page has a guide of its own too.',
      targets: ['.events-guide-btn'],
    },
  ].filter(Boolean)

  return list.map((step, number) => ({
    title: step.title,
    text: step.text,
    target: () => step.targets,
    // Does going to this step change the page? (then the spotlight fades out first, and waits for the page)
    changes: (from) => {
      const before = list[from] || {}
      return (
        route.name !== ROUTES[step.page] ||
        Boolean(before.pick) !== Boolean(step.pick) ||
        // zooming in happens inside the lit-up map (so it can be watched), but zooming back out moves the pin
        (Boolean(before.zoom) && !step.zoom) ||
        step.targets.some((target) => target && !isOnScreen(target))
      )
    },
    // Each part is lit up once the page has finished changing: it is there, the page has stopped scrolling,
    // the page's entrance animation is over, and the part itself has stopped moving.
    ready: () => {
      const pageDone = hasSettled('.events-shell') && scrollHasStopped()
      return step.targets.map((target) => pageDone && isStill(target))
    },
    number,
    step,
  }))
})

// what the map is showing right now
let mapPicked = false
let mapZoomed = false

function onStep(number) {
  const { step } = steps.value[number]

  // the right page
  const wanted = ROUTES[step.page]
  if (route.name !== wanted) {
    const query = { ...route.query }
    delete query.focus
    router.push({ name: wanted, query })
  }

  // the map: a picked pin (and zoomed in on it), or nothing picked and every event in view
  if (step.page === 'map') {
    if (step.pick) {
      if (!step.zoom && mapZoomed) tour.send('fit')
      tour.send('select', pickedId.value)
      if (step.zoom) tour.send('zoom', pickedId.value)
      mapPicked = true
      mapZoomed = Boolean(step.zoom)
    } else if (mapPicked) {
      tour.send('clear')
      tour.send('fit')
      mapPicked = false
      mapZoomed = false
    }
  }

  // the parts of this step on the screen (the page scrolls inside .app-main)
  requestAnimationFrame(() => step.targets.forEach((target) => target && bringOnScreen(target)))
}

const shown = ref(false)
watch(
  () => tour.open.value,
  (open) => {
    if (open) {
      wide.value = window.innerWidth >= 992
      pickedId.value = filters.results.value[0]?.id || null
      mapPicked = false
      mapZoomed = false
      forgetSeen()
      const main = document.querySelector('.app-main')
      if (main) main.scrollTop = 0
    }
    shown.value = open
  },
)

function finish() {
  tour.stop()
}

// leaving the Events pages (or opening an event) closes the guide
watch(
  () => route.name,
  (name) => {
    if (tour.open.value && name !== ROUTES.map && name !== ROUTES.list) tour.stop()
  },
)
</script>

<template>
  <DiscoverTour v-if="shown && pickedId" label="Events" :steps="steps" @step="onStep" @finish="finish" @skip="finish" />
</template>
