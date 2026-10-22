<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSavedArtists, getArtistDetails, removeSavedArtist } from '@/services/matchmakingApi';
import { useUserStore } from '@/stores/user';
import LoginPrompt from '@/components/layout/LoginPrompt.vue';

const userStore = useUserStore();

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
    [artist.name, artist.genre, artist.tag, artist.hometown].join(' ').toLowerCase().includes(query)
  );
});

function formatSavedDate(savedAt) {
  return new Date(savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadSavedArtists() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const rows = await getSavedArtists();
    const details = await getArtistDetails(rows.map(row => row.artist_id));
    savedArtists.value = details.map((artist, i) => ({ ...artist, savedAt: rows[i].saved_at }));
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
  <div v-if="userStore.isLoggedIn" class="container py-4">
    <!-- Header -->
    <div class="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
      <div>
        <RouterLink :to="{ name: 'profile' }" class="small text-decoration-none">
          <i class="bi bi-arrow-left"></i> Profile
        </RouterLink>
        <h1 class="fw-bold mt-1 mb-1">Saved artists</h1>
      </div>
    </div>

    <!-- Search -->
    <div class="filters-search mb-4">
      <i class="bi bi-search"></i>
      <input v-model="search" type="search" placeholder="Search artists" />
      <button v-if="search" type="button" class="filters-clear" @click="search = ''">
        <i class="bi bi-x-lg"></i>
      </button>
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
    <div v-else class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
      <div v-for="artist in filteredArtists" :key="artist.id" class="col">
        <div class="card h-100 border-0 shadow-sm rounded-4 overflow-hidden">
          <div class="ratio ratio-1x1" :style="{ backgroundColor: artist.genreColor }">
            <img
              :src="artist.image"
              :alt="artist.name"
              class="object-fit-cover"
              @error="e => { e.target.alt = ''; e.target.removeAttribute('src'); }"
            />
          </div>

          <!-- Unsave button -->
          <button
            class="btn btn-light btn-sm rounded-circle shadow position-absolute top-0 end-0 m-2 z-2"
            :aria-label="'Remove ' + artist.name + ' from saved'"
            @click="unsave(artist)"
          >
            <i class="bi bi-bookmark-fill text-primary"></i>
          </button>

          <div class="card-body pb-2">
            <h2 class="h6 fw-bold mb-1 text-truncate">
              <RouterLink
                :to="{ name: 'artist-detail', params: { id: artist.id } }"
                class="stretched-link text-reset text-decoration-none"
              >
                {{ artist.name }}
              </RouterLink>
            </h2>
            <p v-if="artist.hometown" class="small text-secondary mb-2 text-truncate">
              <i class="bi bi-geo-alt"></i> {{ artist.hometown }}
            </p>
            <span v-if="artist.genre" class="badge rounded-pill fw-normal" :style="{ backgroundColor: artist.genreColor }">
              {{ artist.genre }}
            </span>
          </div>

          <div class="card-footer bg-transparent border-0 pt-0 small text-secondary">
            Saved {{ formatSavedDate(artist.savedAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <LoginPrompt v-else message="to see your saved artists." />
</template>

<style scoped>
/* Search box (same as the Artists page) */
.filters-search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.4rem 0.2rem 0.9rem;
  border-radius: 999px;
  background: #eef0f8;
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
