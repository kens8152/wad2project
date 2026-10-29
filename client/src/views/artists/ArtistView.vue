<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import SortDropdown from '../../components/events/SortDropdown.vue'
import ArtistCard from '../../components/artists/ArtistCard.vue'
import ArtistFilterSidebar from '../../components/artists/ArtistFilterSidebar.vue'
import { ARTIST_SORTS, useArtistFilters } from '../../composables/artists/useArtistFilters'
import { useFavouriteArtists } from '../../composables/artists/useFavouriteArtists'
import { favouritesFirst } from '../../utils/artists/artists'

const router = useRouter()
const eventsStore = useEventsStore()

// all the filter and sort logic lives in useArtistFilters
const filters = useArtistFilters()
const { sortBy, subtitle, activeCount, allArtists, filteredArtists, resetFilters } = filters

// favourites live in useFavouriteArtists
const { favourites, toggleFavourite } = useFavouriteArtists()

const filtersOpen = ref(false) // for the mobile Filters button

// the artists we show: favourites first
const visibleArtists = computed(() => favouritesFirst(filteredArtists.value, favourites.value))

onMounted(() => {
  // the artists come from the same data as the events
  if (eventsStore.events.length === 0) {
    eventsStore.fetchEvents()
  }
})

function openArtist(artist) {
  router.push({ name: 'artist-detail', params: { id: artist.id } })
}
</script>

<template>
  <div class="artists-shell container-xxl">
    <!-- Header: title on the left, sort dropdown on the right -->
    <header class="artists-shell__head">
      <div>
        <h1 class="artists-shell__title">Artists</h1>
        <p class="artists-shell__subtitle">{{ subtitle }}</p>
      </div>

      <div class="artists-shell__actions d-flex flex-wrap align-items-center gap-2">
        <!-- Match with artists -->
        <RouterLink :to="{ name: 'matchmaking' }" class="btn btn-riffle text-nowrap">
          <i class="bi bi-stars me-1"></i> Discover artists
        </RouterLink>
        <SortDropdown v-model="sortBy" :options="ARTIST_SORTS" />
      </div>
    </header>

    <!-- Filters button (phones only) -->
    <button
      type="button"
      class="artists-shell__filter-toggle d-lg-none"
      @click="filtersOpen = !filtersOpen"
    >
      <i class="bi bi-sliders"></i>
      Filters
      <span v-if="activeCount" class="artists-shell__badge">{{ activeCount }}</span>
      <i class="bi ms-auto" :class="filtersOpen ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
    </button>

    <div class="artists-shell__body">
      <!-- Filter sidebar -->
      <div class="artists-shell__sidebar" :class="{ 'is-open': filtersOpen }">
        <ArtistFilterSidebar :search-text="filters.searchText" :draft-genres="filters.draftGenres"
          :draft-venues="filters.draftVenues" :genre-options="filters.genreOptions"
          :venue-options="filters.venueOptions" :is-dirty="filters.isDirty" @apply="filters.applyFilters"
          @reset="filters.resetFilters" @clear-search="filters.clearSearch" @applied="filtersOpen = false" />
      </div>

      <!-- Results -->
      <section class="artists-shell__main">
        <!-- Loading -->
        <div v-if="eventsStore.loading" class="artists-shell__state">
          <div class="spinner-border text-primary" role="status"></div>
        </div>

        <!-- Error -->
        <div v-else-if="eventsStore.error" class="artists-shell__state">
          <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
          <p class="mb-3">{{ eventsStore.error }}</p>
          <button class="btn btn-riffle" @click="eventsStore.fetchEvents()">Try again</button>
        </div>

        <!-- No results -->
        <div v-else-if="visibleArtists.length === 0" class="artists-shell__state">
          <i class="bi bi-person-x fs-1 text-secondary"></i>
          <h2 class="h5 mt-2">No artists match these filters</h2>
          <p class="text-secondary">Try fewer genres or venues.</p>
          <button class="btn btn-riffle" @click="resetFilters()">Reset filters</button>
        </div>

        <!-- Artist grid -->
        <div v-else class="artists-grid" :key="visibleArtists.map(a => a.id).join(',')">
          <ArtistCard
            v-for="artist in visibleArtists"
            :key="artist.id"
            :artist="artist"
            :is-favourite="favourites.includes(artist.id)"
            @select="openArtist"
            @toggle-favourite="toggleFavourite"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ---------- page layout (same as the events page) ---------- */
.artists-shell {
  padding-top: 1.1rem;
  padding-bottom: 2.5rem;
}

.artists-shell__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}
.artists-shell__title {
  margin: 0;
  font-size: 2.3rem;
  line-height: 1.1;
}
.artists-shell__subtitle {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  color: var(--riffle-muted);
  font-weight: 500;
}

.artists-shell__filter-toggle {
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
.artists-shell__badge {
  min-width: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--riffle-coral);
  color: #fff;
  font-size: 0.75rem;
  line-height: 22px;
  text-align: center;
}

.artists-shell__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.4rem;
  align-items: start;
}
.artists-shell__sidebar {
  display: none;
}
.artists-shell__sidebar.is-open {
  display: block;
}
.artists-shell__main {
  min-width: 0;
}

.artists-shell__state {
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

.artists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.1rem;
}

/* wide screens: sidebar on the left, results on the right */
@media (min-width: 992px) {
  .artists-shell__body {
    grid-template-columns: 300px minmax(0, 1fr);
  }
  .artists-shell__head {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    column-gap: 1.4rem;
    align-items: start;
  }
  .artists-shell__actions {
    display: flex;
    justify-content: flex-end;
  }
  .artists-shell__sidebar {
    display: block;
    position: sticky;
    top: calc(var(--navbar-height) + 16px);
  }
  .artists-shell__sidebar .filters {
    max-height: calc(100vh - var(--navbar-height) - 32px);
    overflow-y: auto;
  }
}

@media (max-width: 991.98px) {
  .artists-shell__head {
    flex-wrap: wrap;
  }
  .artists-shell__actions {
    flex: 1 1 100%;
  }
}

@media (max-width: 575.98px) {
  .artists-shell__title {
    font-size: 2rem;
  }
}
</style>