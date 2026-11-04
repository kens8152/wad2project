<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import LinkCard from './linkcard.vue'
import { catalog, loadCatalog, eventArtists } from '@/services/forum/forumlinks.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  startFilter: { type: String, default: 'all' },
  modelValue: { type: Object, default: () => ({ events: [], artists: [] }) },
})
const emit = defineEmits(['close', 'confirm'])

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'events', label: 'Events' },
  { key: 'artists', label: 'Artists' },
]

const filter = ref('all')
const query = ref('')
const selEvents = ref([])
const selArtists = ref([])

const via = new Map()

const q = computed(() => query.value.trim().toLowerCase())

const shownArtists = computed(() =>
  filter.value === 'events'
    ? []
    : catalog.artists.filter((a) => !q.value || a.search.includes(q.value)),
)
const shownEvents = computed(() =>
  filter.value === 'artists'
    ? []
    : catalog.events.filter((e) => !q.value || e.search.includes(q.value)),
)

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const summary = computed(
  () => `${plural(selArtists.value.length, 'artist')} · ${plural(selEvents.value.length, 'event')} selected`,
)

function toggleArtist(artist) {
  via.delete(artist.id)
  selArtists.value = selArtists.value.includes(artist.id)
    ? selArtists.value.filter((id) => id !== artist.id)
    : [...selArtists.value, artist.id]
}

function toggleEvent(event) {
  if (selEvents.value.includes(event.id)) {
    selEvents.value = selEvents.value.filter((id) => id !== event.id)
    for (const artistId of eventArtists(event)) {
      const sources = via.get(artistId)
      if (!sources) continue
      sources.delete(event.id)
      if (!sources.size) {
        via.delete(artistId)
        selArtists.value = selArtists.value.filter((id) => id !== artistId)
      }
    }
    return
  }

  selEvents.value = [...selEvents.value, event.id]
  for (const artistId of eventArtists(event)) {
    if (!selArtists.value.includes(artistId)) {
      selArtists.value = [...selArtists.value, artistId]
      via.set(artistId, new Set([event.id]))
    } else if (via.has(artistId)) {
      via.get(artistId).add(event.id)
    }
  }
}

function confirm() {
  emit('confirm', { events: selEvents.value, artists: selArtists.value })
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  e.stopPropagation()
  emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      loadCatalog()
      filter.value = props.startFilter
      query.value = ''
      selEvents.value = [...(props.modelValue.events ?? [])]
      selArtists.value = [...(props.modelValue.artists ?? [])]
      via.clear()
      window.addEventListener('keydown', onKeydown, true)
    } else {
      window.removeEventListener('keydown', onKeydown, true)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <Teleport to="body">
    <Transition name="picker">
      <div v-if="open" class="picker">
        <header class="picker__bar">
          <h2 class="h5 mb-0">Add events &amp; artists</h2>
          <button type="button" class="btn-close" @click="emit('close')"></button>
        </header>

        <div class="picker__tools">
          <div class="btn-group">
            <button
              v-for="f in FILTERS"
              :key="f.key"
              type="button"
              class="btn btn-sm"
              :class="filter === f.key ? 'btn-primary' : 'btn-outline-secondary'"
              @click="filter = f.key"
            >
              {{ f.label }}
            </button>
          </div>

          <div class="picker__search">
            <i class="bi bi-search"></i>
            <input
              v-model="query"
              type="search"
              class="form-control"
              placeholder="Search events and artists"
            />
          </div>
        </div>

        <div class="picker__body">
          <div v-if="catalog.loading && !catalog.loaded" class="text-center text-body-secondary py-5">
            <span class="spinner-border spinner-border-sm me-2"></span>Loading…
          </div>

          <div
            v-else-if="catalog.error"
            class="alert alert-warning d-flex justify-content-between align-items-center"
          >
            {{ catalog.error }}
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="loadCatalog()">
              Try again
            </button>
          </div>

          <section v-if="shownArtists.length" class="mb-4">
            <h3 class="h6 text-body-secondary mb-2">Artists</h3>
            <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
              <div v-for="a in shownArtists" :key="a.id" class="col">
                <div
                  class="pick"
                  :class="{ 'is-selected': selArtists.includes(a.id) }"
                  tabindex="0"
                  @click="toggleArtist(a)"
                  @keydown.enter.prevent="toggleArtist(a)"
                  @keydown.space.prevent="toggleArtist(a)"
                >
                  <LinkCard :item="a" />
                  <span class="pick__check"><i class="bi bi-check-lg"></i></span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="shownEvents.length" class="mb-4">
            <h3 class="h6 text-body-secondary mb-2">Events</h3>
            <div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
              <div v-for="e in shownEvents" :key="e.id" class="col">
                <div
                  class="pick"
                  :class="{ 'is-selected': selEvents.includes(e.id) }"
                  tabindex="0"
                  @click="toggleEvent(e)"
                  @keydown.enter.prevent="toggleEvent(e)"
                  @keydown.space.prevent="toggleEvent(e)"
                >
                  <LinkCard :item="e" />
                  <span class="pick__check"><i class="bi bi-check-lg"></i></span>
                </div>
              </div>
            </div>
          </section>

          <p
            v-if="catalog.loaded && !shownArtists.length && !shownEvents.length"
            class="text-body-secondary"
          >
            Nothing matches your search.
          </p>
        </div>

        <footer class="picker__foot">
          <span class="small text-body-secondary">{{ summary }}</span>
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-light" @click="emit('close')">Cancel</button>
            <button type="button" class="btn btn-primary" @click="confirm">Confirm</button>
          </div>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.picker {
  position: fixed;
  inset: 0;
  z-index: 1075;
  display: flex;
  flex-direction: column;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
}

.picker__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.picker__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--bs-border-color);
}

.picker__search {
  position: relative;
  flex: 1;
  min-width: 12rem;
}
.picker__search i {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
  pointer-events: none;
}
.picker__search .form-control {
  padding-left: 2.4rem;
  border-radius: 999px;
}

.picker__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
}

.picker__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--bs-border-color);
}

.pick {
  position: relative;
  height: 100%;
  cursor: pointer;
  border-radius: 0.6rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.pick:focus-visible {
  outline: 3px dashed var(--bs-primary);
  outline-offset: 2px;
}
.pick.is-selected {
  outline: 3px solid var(--bs-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 0.35rem rgba(var(--bs-primary-rgb), 0.15);
}

.pick__check {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: var(--bs-primary);
  color: #fff;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.pick.is-selected .pick__check {
  opacity: 1;
  transform: scale(1);
}

.picker-enter-active,
.picker-leave-active {
  transition: opacity 0.2s ease;
}
.picker-enter-from,
.picker-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .picker-enter-active,
  .picker-leave-active,
  .pick,
  .pick__check {
    transition: none;
  }
}
</style>