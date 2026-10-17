<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import SortDropdown from '../components/SortDropdown.vue'
import ArtistCard from '../components/ArtistCard.vue'
import { toast } from '@/composables/useToast'

const router = useRouter()
const eventsStore = useEventsStore()

onMounted(() => {
  // the artists come from the same data as the events
  if (eventsStore.events.length === 0) {
    eventsStore.fetchEvents()
  }
})

// ----- sorting (SortDropdown needs value, label and icon) -----
const sortOptions = [
  { value: 'name', label: 'Name (A-Z)', icon: 'bi-sort-alpha-down' },
  { value: 'events', label: 'Most events', icon: 'bi-fire' },
  { value: 'soonest', label: 'Next event soonest', icon: 'bi-clock' },
]
const sortBy = ref('name')

// ----- filters -----
// "draft" = what the checkboxes show right now
// "applied" = what the results use (copied over when you press Apply)
const searchText = ref('') // the search box works straight away
const draftGenres = ref([])
const draftVenues = ref([])
const appliedGenres = ref([])
const appliedVenues = ref([])
const filtersOpen = ref(false) // for the mobile Filters button

// ----- favourite artists -----
// we save the ids in the browser, so they are still there next time
const favourites = ref(JSON.parse(localStorage.getItem('favouriteArtists')) || [])

function toggleFavourite(artist) {
  // check if it is a favourite BEFORE we change the list
  const wasFavourite = favourites.value.includes(artist.id)

  toggleInList(favourites.value, artist.id)
  localStorage.setItem('favouriteArtists', JSON.stringify(favourites.value))

  // show the pop up at the bottom
  if (wasFavourite) {
    toast('Artist removed from favourites')
  } else {
    toast('Artist added to favourites')
  }
}

// add the value to the list if it is not there, remove it if it is
function toggleInList(list, value) {
  const index = list.indexOf(value)
  if (index === -1) {
    list.push(value)
  } else {
    list.splice(index, 1)
  }
}

// turn a list into text so we can check if two lists are the same
function listToText(list) {
  return list.slice().sort().join(',')
}

// true when the checkboxes were changed but Apply was not pressed yet
const isDirty = computed(() => {
  return (
    listToText(draftGenres.value) !== listToText(appliedGenres.value) ||
    listToText(draftVenues.value) !== listToText(appliedVenues.value)
  )
})

function applyFilters() {
  appliedGenres.value = draftGenres.value.slice()
  appliedVenues.value = draftVenues.value.slice()
  filtersOpen.value = false
}

function resetFilters() {
  searchText.value = ''
  draftGenres.value = []
  draftVenues.value = []
  appliedGenres.value = []
  appliedVenues.value = []
}

function clearSearch() {
  searchText.value = ''
}

// Find the soonest event that has not happened yet
// (dayOffset 0 = today, 1 = tomorrow, negative = already passed)
function getNextEvent(events) {
  let next = null
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (event.dayOffset >= 0) {
      if (next === null || event.dayOffset < next.dayOffset) {
        next = event
      }
    }
  }
  return next
}

// a lookup: genre id -> genre (name and colour)
// we use it to find the artist's own genre and its colour
const genreById = computed(() => {
  const lookup = {}
  for (let i = 0; i < eventsStore.events.length; i++) {
    const genre = eventsStore.events[i].genre
    lookup[genre.id] = genre
  }
  return lookup
})

// Step 1: turn the list of events into a list of artists
const allArtists = computed(() => {
  const artistList = []

  for (let i = 0; i < eventsStore.events.length; i++) {
    const event = eventsStore.events[i]

    // an event can have more than one artist
    for (let j = 0; j < event.artists.length; j++) {
      const eventArtist = event.artists[j]

      // check if we already added this artist (compare by name)
      let artist = null
      for (let k = 0; k < artistList.length; k++) {
        if (artistList[k].name.toLowerCase() === eventArtist.name.toLowerCase()) {
          artist = artistList[k]
        }
      }

      // if not, create a new one
      if (artist === null) {
        // the artist's own genre (if we can't find it, use this event's genre)
        let ownGenre = genreById.value[eventArtist.genreId]
        if (!ownGenre) {
          ownGenre = event.genre
        }

        artist = {
          id: eventArtist.id,
          name: eventArtist.name,
          tag: eventArtist.tag,
          genre: ownGenre, // used for the genre pill and the card colour
          genres: [],
          venues: [],
          events: [],
        }
        artistList.push(artist)
      }

      // add this event's info to the artist (no duplicates)
      if (!artist.genres.includes(event.genre.name)) {
        artist.genres.push(event.genre.name)
      }
      if (!artist.venues.includes(event.venue.name)) {
        artist.venues.push(event.venue.name)
      }
      artist.events.push(event)
    }
  }

  // work out the next event for each artist
  for (let i = 0; i < artistList.length; i++) {
    artistList[i].nextEvent = getNextEvent(artistList[i].events)
  }

  return artistList
})

// Step 2: the checkbox lists in the sidebar (name, colour, how many artists)

// look for an option with this name, or create it if it does not exist yet
function findOrAddOption(options, name, color) {
  for (let i = 0; i < options.length; i++) {
    if (options[i].name === name) {
      return options[i]
    }
  }
  const option = { name: name, color: color, count: 0 }
  options.push(option)
  return option
}

const genreOptions = computed(() => {
  const options = []

  // first get every genre and its colour from the events
  for (let i = 0; i < eventsStore.events.length; i++) {
    const genre = eventsStore.events[i].genre
    findOrAddOption(options, genre.name, genre.color)
  }

  // then count how many artists have each genre
  for (let i = 0; i < allArtists.value.length; i++) {
    const genres = allArtists.value[i].genres
    for (let j = 0; j < genres.length; j++) {
      findOrAddOption(options, genres[j], '').count++
    }
  }

  return options.sort(function (a, b) {
    return a.name.localeCompare(b.name)
  })
})

const venueOptions = computed(() => {
  const options = []

  for (let i = 0; i < allArtists.value.length; i++) {
    const venues = allArtists.value[i].venues
    for (let j = 0; j < venues.length; j++) {
      findOrAddOption(options, venues[j], '').count++
    }
  }

  return options.sort(function (a, b) {
    return a.name.localeCompare(b.name)
  })
})

// is at least one of the artist's items in the chosen list?
function hasAny(artistItems, chosenItems) {
  for (let i = 0; i < artistItems.length; i++) {
    if (chosenItems.includes(artistItems[i])) {
      return true
    }
  }
  return false
}

// Step 3: apply the filters and the sorting
const filteredArtists = computed(() => {
  const result = []
  const search = searchText.value.trim().toLowerCase()

  for (let i = 0; i < allArtists.value.length; i++) {
    const artist = allArtists.value[i]

    // search by name
    if (search !== '' && !artist.name.toLowerCase().includes(search)) {
      continue
    }
    // genre filter (if none are ticked, show all)
    if (appliedGenres.value.length > 0 && !hasAny(artist.genres, appliedGenres.value)) {
      continue
    }
    // venue filter (if none are ticked, show all)
    if (appliedVenues.value.length > 0 && !hasAny(artist.venues, appliedVenues.value)) {
      continue
    }

    result.push(artist)
  }

  // sorting
  if (sortBy.value === 'name') {
    result.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    })
  } else if (sortBy.value === 'events') {
    result.sort(function (a, b) {
      return b.events.length - a.events.length
    })
  } else if (sortBy.value === 'soonest') {
    result.sort(function (a, b) {
      // artists with no upcoming event go to the bottom
      const dayA = a.nextEvent === null ? 999 : a.nextEvent.dayOffset
      const dayB = b.nextEvent === null ? 999 : b.nextEvent.dayOffset
      return dayA - dayB
    })
  }

  // favourite artists go first (everyone keeps the order of the chosen sort)
  const favouriteArtists = []
  const otherArtists = []
  for (let i = 0; i < result.length; i++) {
    if (favourites.value.includes(result[i].id)) {
      favouriteArtists.push(result[i])
    } else {
      otherArtists.push(result[i])
    }
  }

  return favouriteArtists.concat(otherArtists)
})

// the line under the title, like on the events page
const subtitle = computed(() => {
  const n = filteredArtists.value.length
  const noun = n + (n === 1 ? ' artist' : ' artists')
  if (searchText.value.trim() !== '') {
    return noun + ' matching “' + searchText.value.trim() + '”'
  }
  return noun + ' performing near you'
})

// the number badge on the mobile Filters button
const activeCount = computed(() => {
  let count = 0
  if (searchText.value.trim() !== '') count++
  if (appliedGenres.value.length > 0) count++
  if (appliedVenues.value.length > 0) count++
  return count
})

function openArtist(artist) {
  // go to the events list and search for this artist
  router.push({ name: 'events-list', query: { q: artist.name } })
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

      <div class="artists-shell__actions">
        <SortDropdown v-model="sortBy" :options="sortOptions" />
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
        <aside class="filters riffle-card">
          <!-- Search -->
          <div class="filters__search">
            <i class="bi bi-search"></i>
            <input v-model="searchText" type="search" placeholder="Search artists" />
            <button v-if="searchText" type="button" class="filters__clear" @click="clearSearch">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Genre -->
          <section class="filters__group">
            <h2 class="filters__heading">Genre</h2>
            <label v-for="g in genreOptions" :key="g.name" class="filters__option">
              <input
                class="form-check-input"
                type="checkbox"
                :checked="draftGenres.includes(g.name)"
                @change="toggleInList(draftGenres, g.name)"
              />
              <span class="filters__chip" :style="{ background: g.color }"></span>
              <span class="filters__option-label">{{ g.name }}</span>
              <span class="filters__count">{{ g.count }}</span>
            </label>
          </section>

          <!-- Venue -->
          <section class="filters__group">
            <h2 class="filters__heading">Venue</h2>
            <label v-for="v in venueOptions" :key="v.name" class="filters__option">
              <input
                class="form-check-input"
                type="checkbox"
                :checked="draftVenues.includes(v.name)"
                @change="toggleInList(draftVenues, v.name)"
              />
              <span class="filters__option-label">{{ v.name }}</span>
              <span class="filters__count">{{ v.count }}</span>
            </label>
          </section>

          <!-- Apply and reset buttons -->
          <div class="filters__footer">
            <button
              type="button"
              class="btn btn-riffle filters__apply"
              :class="{ 'is-dirty': isDirty }"
              @click="applyFilters"
            >
              {{ isDirty ? 'Apply changes' : 'Apply filters' }}
            </button>
            <button type="button" class="filters__reset" @click="resetFilters">Reset filters</button>
          </div>
        </aside>
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
        <div v-else-if="filteredArtists.length === 0" class="artists-shell__state">
          <i class="bi bi-person-x fs-1 text-secondary"></i>
          <h2 class="h5 mt-2">No artists match these filters</h2>
          <p class="text-secondary">Try fewer genres or venues.</p>
          <button class="btn btn-riffle" @click="resetFilters">Reset filters</button>
        </div>

        <!-- Artist grid -->
        <div v-else class="artists-grid">
          <ArtistCard
            v-for="artist in filteredArtists"
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

/* ---------- filter sidebar (same look as the events filters) ---------- */
.filters {
  padding: 0.75rem 1rem;
}

.filters__search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.4rem 0.2rem 0.9rem;
  border-radius: 999px;
  background: #eef0f8;
  color: var(--riffle-muted);
}
.filters__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 1rem;
  color: var(--riffle-ink);
  padding: 0.35rem 0;
}
.filters__search input::placeholder {
  color: var(--riffle-muted);
}
.filters__search:focus-within {
  box-shadow: 0 0 0 2px var(--riffle-blue);
}
.filters__search input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}
.filters__clear {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 0.8rem;
}
.filters__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}

.filters__group {
  padding: 0.45rem 0 0.1rem;
}
.filters__group + .filters__group {
  border-top: 1px solid var(--riffle-border);
  margin-top: 0.2rem;
}
.filters__heading {
  margin: 0 0 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--riffle-muted);
}

.filters__option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.09rem 0;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--riffle-ink);
}
.filters__option .form-check-input {
  flex: none;
  margin: 0;
  width: 1.15rem;
  height: 1.15rem;
  cursor: pointer;
}
.filters__chip {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
}
.filters__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.filters__count {
  font-size: 0.82rem;
  color: var(--riffle-faint);
}

.filters__footer {
  position: sticky;
  bottom: -0.75rem;
  z-index: 5;
  margin: 0.5rem -1rem -0.75rem;
  padding: 0.5rem 1rem 0.45rem;
  background: #fff;
  border-top: 1px solid var(--riffle-border);
  border-radius: 0 0 var(--riffle-radius) var(--riffle-radius);
  box-shadow: 0 -8px 16px rgba(20, 35, 90, 0.05);
}
.filters__apply {
  width: 100%;
  padding: 0.55rem;
  font-size: 1rem;
}
/* when you changed a checkbox but did not press Apply yet */
.filters__apply.is-dirty {
  background: linear-gradient(135deg, #1b3fbf 0%, #2f7bff 60%, #22c1e8 100%);
}
.filters__reset {
  display: block;
  margin: 0.15rem auto 0;
  padding: 0.15rem 0.7rem;
  border: 0;
  background: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: #dc2626;
}
.filters__reset:hover {
  color: #b91c1c;
  text-decoration: underline;
}
</style>