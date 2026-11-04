<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSavedArtists, getArtistDetails, removeSavedArtist } from '@/services/matchmakingApi';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { buildArtists } from '@/utils/artists/artists';
import LoginPrompt from '@/components/layout/LoginPrompt.vue';
import SortDropdown from '@/components/events/SortDropdown.vue';
import ArtistCard from '@/components/artists/ArtistCard.vue';

const userStore = useUserStore();
const eventsStore = useEventsStore();
const router = useRouter();

const SAVED_SORTS = [
  { value: 'recent', label: 'Recently saved', icon: 'bi-clock-history' },
  { value: 'oldest', label: 'Oldest saved', icon: 'bi-hourglass-bottom' },
  { value: 'name', label: 'Name (A-Z)', icon: 'bi-sort-alpha-down' },
  { value: 'genre', label: 'Genre', icon: 'bi-music-note-beamed' },
];
const sortBy = ref('recent');

// Saved artists, newest first (each one has savedAt)
const savedArtists = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const search = ref('');

// Search by name, genre, tag or hometown
const filteredArtists = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return savedArtists.value;

  return savedArtists.value.filter(artist =>
    [artist.name, artist.genre.name, artist.tag, artist.hometown].join(' ').toLowerCase().includes(query)
  );
});

// The search results in the chosen order
const sortedArtists = computed(() => {
  const list = [...filteredArtists.value];

  if (sortBy.value === 'oldest') {
    list.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
  } else if (sortBy.value === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy.value === 'genre') {
    list.sort((a, b) => a.genre.name.localeCompare(b.genre.name) || a.name.localeCompare(b.name));
  } else {
    list.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }
  return list;
});

function formatSavedDate(savedAt) {
  return new Date(savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function openArtist(artist) {
  router.push({ name: 'artist-detail', params: { id: artist.id } });
}

async function loadSavedArtists() {
  loading.value = true;
  errorMessage.value = '';

  try {
    // the cards show venues and events, which come from the events data (same as the Artists page)
    if (eventsStore.events.length === 0) await eventsStore.fetchEvents();

    const rows = await getSavedArtists();
    const details = await getArtistDetails(rows.map(row => row.artist_id));
    const eventArtists = buildArtists(eventsStore.events);

    savedArtists.value = details.map(detail => {
      const fromEvents = eventArtists.find(artist => artist.id === detail.id);
      const row = rows.find(r => r.artist_id === detail.id);

      return {
        venues: [],
        events: [],
        nextEvent: null, // artists with no events still get a card
        ...fromEvents,
        id: detail.id,
        name: detail.name,
        tag: detail.tag,
        genre: { name: detail.genre, color: detail.genreColor },
        image: detail.image,
        hometown: detail.hometown,
        savedAt: row.saved_at,
      };
    });
  } catch (err) {
    console.error('Could not load saved artists', err);
    errorMessage.value = 'Your saved artists could not be loaded. Please try again.';
  } finally {
    loading.value = false;
  }
}

async function unsave(artist) {
  savedArtists.value = savedArtists.value.filter(a => a.id !== artist.id);

  try {
    await removeSavedArtist(artist.id);
  } catch (err) {
    console.error('Could not unsave artist', err);
    await loadSavedArtists();  // put the list back to what's really saved
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) loadSavedArtists();
})
</script>

<template>
  <div v-if="userStore.isLoggedIn" class="saved-page">
    <div class="container-xxl pt-3 pb-5">
      <!-- Header -->
      <div class="mb-3">
        <RouterLink :to="{ name: 'profile' }" class="small text-decoration-none">
          <i class="bi bi-arrow-left"></i> Profile
        </RouterLink>
        <h1 class="page-title mt-1 mb-0">Saved artists</h1>
        <p class="page-subtitle mb-0">
          {{ savedArtists.length }} {{ savedArtists.length === 1 ? 'artist' : 'artists' }} saved to look at later
        </p>
      </div>

      <!-- Search and sort -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
        <div class="filters-search flex-grow-1">
          <i class="bi bi-search"></i>
          <input v-model="search" type="search" placeholder="Search artists" />
          <button v-if="search" type="button" class="filters-clear" @click="search = ''">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <SortDropdown v-model="sortBy" :options="SAVED_SORTS" />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="errorMessage" class="alert alert-danger d-flex align-items-center gap-3">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span class="flex-grow-1">{{ errorMessage }}</span>
        <button class="btn btn-sm btn-outline-danger" @click="loadSavedArtists()">Retry</button>
      </div>

      <!-- Nothing saved yet -->
      <div v-else-if="savedArtists.length === 0" class="text-center py-5">
        <i class="bi bi-bookmark-heart display-4 text-primary"></i>
        <h2 class="h4 fw-bold mt-3">No saved artists yet</h2>
        <p class="text-secondary">Tap the bookmark on an artist card while discovering to keep them here.</p>
      </div>

      <!-- No search results -->
      <div v-else-if="filteredArtists.length === 0" class="text-center py-5 text-secondary">
        <i class="bi bi-search fs-1"></i>
        <p class="mt-2 mb-0">No saved artists match "{{ search }}".</p>
      </div>

      <!-- Artist list -->
      <!-- Artist cards (same card as the Artists page, with a bookmark to unsave) -->
      <div v-else class="saved-grid">
        <ArtistCard
          v-for="artist in sortedArtists"
          :key="artist.id"
          :artist="artist"
          mode="save"
          :is-favourite="true"
          :footnote="'Saved ' + formatSavedDate(artist.savedAt)"
          @select="openArtist"
          @toggle-favourite="unsave"
        />
      </div>
    </div>
  </div>
  <LoginPrompt v-else message="to see your saved artists." />
</template>

<style scoped>
/* Same background and title sizes as the Artists page */
.saved-page {
  flex-grow: 1;
  background: var(--riffle-glow);
}
.page-title {
  font-size: 2.3rem;
  line-height: 1.1;
}
.page-subtitle {
  margin-top: 0.2rem;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--riffle-muted);
}

/* Same grid as the Artists page */
.saved-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.1rem;
}

/* Search box (same as the Artists page) */
.filters-search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.4rem 0.2rem 0.9rem;
  border-radius: 999px;
  background: var(--riffle-surface-soft);
  color: var(--riffle-muted);
}
.filters-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 1rem;
  color: var(--riffle-ink);
  padding: 0.35rem 0;
}
.filters-search input::placeholder {
  color: var(--riffle-muted);
}
.filters-search:focus-within {
  box-shadow: 0 0 0 2px var(--riffle-blue);
}
.filters-search input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}
.filters-clear {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 0.8rem;
}
.filters-clear:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
