<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import EventFilterSidebar from './EventFilterSidebar.vue'
import EventSearchBar from './EventSearchBar.vue'
import { useEventFilters } from '../../composables/events/useEventFilters'
import { useEventsTour } from '../../composables/events/useEventsTour'
import { useLiveLocation } from '../../composables/events/useLiveLocation'

// Layout shared by the Map and List screens: title, Map/List toggle, filter
// sidebar, and a results slot. Owns loading / error / empty states so the two
// views only have to render a non-empty result set.
defineProps({
  view: { type: String, required: true }, // 'map' | 'list'
})

const route = useRoute()
const filters = useEventFilters()
const filtersOpen = ref(false) // mobile only
const tour = useEventsTour()

const count = computed(() => filters.results.value.length)
const location = useLiveLocation()

onMounted(() => {
  filters.init(route.query)
  location.askOnce() // the browser asks for your location as soon as you arrive
})
watch(() => route.query, (q) => filters.ready.value && filters.applyQuery(q))
</script>

<template>
  <div class="events-shell container-xxl">
    <button
      type="button"
      class="events-shell__filter-toggle d-lg-none"
      :aria-expanded="filtersOpen"
      aria-controls="events-filters"
      @click="filtersOpen = !filtersOpen"
    >
      <i class="bi bi-sliders"></i>
      Filters
      <span v-if="filters.activeCount.value" class="events-shell__badge">{{ filters.activeCount.value }}</span>
      <i class="bi ms-auto" :class="filtersOpen ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
    </button>

    <div class="events-shell__body">
      <div id="events-filters" class="events-shell__sidebar" :class="{ 'is-open': filtersOpen }">
        <EventFilterSidebar v-if="filters.ready.value" @applied="filtersOpen = false" />
      </div>

      <section class="events-shell__main" :class="{ 'is-stretched': view === 'map' }">
        <!-- search, sort and the Map / List switch sit above the results -->
        <div class="events-shell__toolbar">
          <EventSearchBar />
          <div class="events-shell__sort"><slot name="actions" /></div>
          <button type="button" class="events-tool-btn events-guide-btn" :class="{ 'is-on': tour.open.value }" @click="tour.start()">
            <i class="bi bi-compass"></i> Guide
          </button>
          <div class="view-toggle" role="group" aria-label="Events view">
            <RouterLink :to="{ name: 'events-map' }" class="view-toggle__btn" :class="{ 'is-active': view === 'map' }" :aria-current="view === 'map' ? 'page' : undefined">
              Map
            </RouterLink>
            <RouterLink :to="{ name: 'events-list' }" class="view-toggle__btn" :class="{ 'is-active': view === 'list' }" :aria-current="view === 'list' ? 'page' : undefined">
              List
            </RouterLink>
          </div>
        </div>

        <button v-if="filters.applied.venue" type="button" class="events-shell__chip" @click="filters.clearVenue()">
          At {{ filters.venueName.value }} <i class="bi bi-x-lg"></i>
        </button>

        <div v-if="filters.loading.value && !filters.ready.value" class="events-shell__state">
          <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading events…</span></div>
        </div>

        <div v-else-if="filters.error.value" class="events-shell__state">
          <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
          <p class="mb-3">{{ filters.error.value }}</p>
          <button class="btn btn-riffle" @click="filters.init(route.query)">Try again</button>
        </div>

        <div v-else-if="!count" class="events-shell__state">
          <i class="bi bi-calendar-x fs-1 text-secondary"></i>
          <h2 class="h5 mt-2">No events match these filters</h2>
          <p class="text-secondary">Try a wider distance, a later date, or fewer genres.</p>
          <button class="btn btn-riffle" @click="filters.reset()">Reset filters</button>
        </div>

        <slot v-else :events="filters.results.value" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.events-shell {
  padding-top: 0.9rem;
  padding-bottom: 2.5rem;
}

.events-shell__toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem 0.7rem;
  flex: none;
  margin-bottom: 0.9rem;
}
.events-shell__toolbar .events-search {
  flex: 1 1 220px;
}
.events-shell__sort:empty {
  display: none;
}
/* the Guide button, styled like the one on Discover */
.events-tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--riffle-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(20, 35, 90, 0.07);
  color: var(--riffle-ink);
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
}
.events-tool-btn:hover {
  background: #f1f3fb;
  transform: translateY(-1px);
}
.events-guide-btn.is-on {
  border-color: var(--riffle-navy);
}
.view-toggle {
  display: inline-flex;
  padding: 4px;
  border-radius: 12px;
  background: #e9ecf6;
}
.view-toggle__btn {
  min-width: 72px;
  padding: 0.42rem 0.9rem;
  border-radius: 9px;
  font-size: 0.9rem;
  text-align: center;
  font-weight: 700;
  color: var(--riffle-muted);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.view-toggle__btn:hover {
  color: var(--riffle-ink);
}
.view-toggle__btn.is-active {
  background: var(--riffle-navy);
  color: #fff;
}

.events-shell__filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-bottom: 0.9rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 12px;
  background: #fff;
  font-weight: 700;
  color: var(--riffle-ink);
}
.events-shell__badge {
  min-width: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--riffle-coral);
  color: #fff;
  font-size: 0.75rem;
  line-height: 22px;
  text-align: center;
}

.events-shell__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  align-items: start;
}
.events-shell__sidebar {
  display: none;
}
.events-shell__sidebar.is-open {
  display: block;
}
.events-shell__main {
  min-width: 0;
}

.events-shell__chip {
  margin-bottom: 0.8rem;
  padding: 0.35rem 0.8rem;
  border: 0;
  border-radius: 999px;
  background: #e5ebff;
  color: var(--riffle-blue);
  font-weight: 700;
  font-size: 0.85rem;
}

.events-shell__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 2rem;
  text-align: center;
  border-radius: var(--riffle-radius);
  background: #fff;
  border: 1px dashed var(--riffle-border);
}

@media (min-width: 992px) {
  .events-shell__body {
    grid-template-columns: 300px minmax(0, 1fr);
  }

  /* The page scrolls inside the area below the navbar (see App.vue), so "top" is measured from the bottom of the
     navbar. A small 16px gap is all that is left between the navbar and the filter card, same as the Artists page. */
  .events-shell__sidebar {
    display: block;
    position: sticky;
    top: 16px;
  }

  /* The filter card is the thing that scrolls (so its rounded corners always show whole),
     with the scrollbar on its left side and Apply pinned at its bottom. */
  /* Tallest the card can be: the screen below the navbar, minus the 16px gap on top (the sticky "top" above)
     and the page's bottom padding (2.5rem). That way, at the end of the page its bottom lines up with the last row
     and its top never slides under the navbar. */
  .events-shell__sidebar > :deep(.filters) {
    /* always this tall (not only "at most"), so that at the end of the page its bottom lines up with the last row,
       with Apply and Reset filters at its bottom edge */
    height: calc(100vh - var(--navbar-height) - 16px - 2.5rem);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden; /* the heart's falling notes must not make a sideways scrollbar */
    direction: rtl; /* puts the scrollbar on the left ... */
  }
  .events-shell__sidebar > :deep(.filters) > * {
    flex: none;
    direction: ltr; /* ... while the content itself stays left-to-right */
  }

  /* the map column is as tall as the filter panel, so the scrollbar under the
     event cards ends exactly where the filter panel ends */
  .events-shell__main.is-stretched {
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }
  .events-shell__main.is-stretched > :deep(.map-stage) {
    flex: 1 1 auto;
  }
}

@media (max-width: 991.98px) {
  .events-shell__toolbar {
    flex-wrap: wrap;
  }
  .events-shell__toolbar .events-search {
    flex: 1 1 100%;
  }
  .events-shell__toolbar .events-shell__sort {
    flex: 1 1 0;
    min-width: 0;
  }
}

@media (max-width: 575.98px) {
  .view-toggle__btn {
    min-width: 72px;
    padding-inline: 0.8rem;
  }
}
</style>
