<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  getMatchHistory, getArtistDetails, changeMatchAction, undoMatchAction,
  getSavedArtists, addSavedArtist, removeSavedArtist,
} from '@/services/matchmakingApi';
import { toast } from '@/composables/useToast';
import { useUserStore } from '@/stores/user';
import LoginPrompt from '@/components/layout/LoginPrompt.vue';

const userStore = useUserStore();
const busyId = ref(null);
const savedIds = ref([]);

const history = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const filter = ref('all');

const filters = [
  { value: 'all', label: 'All' },
  { value: 'follow', label: 'Liked' },
  { value: 'skip', label: 'Skipped' },
];

const filteredHistory = computed(() => {
  if (filter.value === 'all') return history.value;
  return history.value.filter(item => item.action === filter.value);
});

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// Swiped the wrong way: change skip <-> like (a like is stored as "follow")
async function changeAction(item, action) {
  if (item.action === action || busyId.value) return;
  busyId.value = item.artist.id;

  try {
    await changeMatchAction(item.artist.id, action);
    history.value.forEach(h => {
      if (h.artist.id === item.artist.id) h.action = action;
    });
  } catch (err) {
    console.error('Could not change swipe', err);
    toast('Could not change this swipe. Please try again.');
  } finally {
    busyId.value = null;
  }
}

// Bookmark (separate from liking and following)
async function toggleSave(artist) {
  const wasSaved = savedIds.value.includes(artist.id);
  savedIds.value = wasSaved ? savedIds.value.filter(id => id !== artist.id) : [...savedIds.value, artist.id];

  try {
    if (wasSaved) {
      await removeSavedArtist(artist.id);
    } else {
      await addSavedArtist(artist.id);
    }
    toast(wasSaved ? 'Removed ' + artist.name + ' from saved' : 'Saved ' + artist.name);
  } catch (err) {
    savedIds.value = wasSaved ? [...savedIds.value, artist.id] : savedIds.value.filter(id => id !== artist.id);
    console.error('Could not update saved artist', err);
    toast('Could not update this artist. Please try again.');
  }
}

// Undo the swipe completely, so the artist can show up in matchmaking again
async function undo(item) {
  if (busyId.value) return;
  busyId.value = item.artist.id;

  try {
    await undoMatchAction(item.artist.id);
    history.value = history.value.filter(h => h.artist.id !== item.artist.id);
    toast(item.artist.name + ' can show up in matchmaking again');
  } catch (err) {
    console.error('Could not undo swipe', err);
    toast('Could not undo this swipe. Please try again.');
  } finally {
    busyId.value = null;
  }
}

async function loadHistory() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const [rows, savedRows] = await Promise.all([getMatchHistory(), getSavedArtists()]);
    const details = await getArtistDetails([...new Set(rows.map(row => row.artist_id))]);
    savedIds.value = savedRows.map(row => row.artist_id);

    history.value = rows
      .map(row => ({
        artist: details.find(artist => artist.id === row.artist_id),
        action: row.action,
        date: row.created_at,
      }))
      .filter(item => item.artist);
  } catch (err) {
    console.error('Could not load match history', err);
    errorMessage.value = 'Your match history could not be loaded. Please try again.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) loadHistory();
})
</script>

<template>
  <div v-if="userStore.isLoggedIn" class="container py-4">
    <!-- Header -->
    <div class="mb-4">
      <RouterLink :to="{ name: 'profile' }" class="small text-decoration-none">
        <i class="bi bi-arrow-left"></i> Profile
      </RouterLink>
      <h1 class="fw-bold mt-1 mb-1">Artist matchmaking history</h1>
      <p class="text-secondary mb-0">Artists you liked or skipped previously will be shown here</p>
    </div>

    <!-- Filter -->
    <div class="btn-group mb-4" role="group" aria-label="Filter history">
      <button
        v-for="option in filters"
        :key="option.value"
        type="button"
        class="btn btn-sm"
        :class="filter === option.value ? 'btn-primary' : 'btn-outline-primary'"
        @click="filter = option.value"
      >
        {{ option.label }}
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
      <button class="btn btn-sm btn-outline-danger" @click="loadHistory()">Retry</button>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredHistory.length === 0" class="text-center py-5">
      <i class="bi bi-clock-history display-4 text-primary"></i>
      <h2 class="h4 fw-bold mt-3">Nothing here yet</h2>
      <p class="text-secondary">Like or skip artists in matchmaking and they will show up here.</p>
      <RouterLink :to="{ name: 'matchmaking' }" class="btn btn-primary">Match artists</RouterLink>
    </div>

    <!-- History tiles -->
    <div v-else class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
      <div v-for="(item, i) in filteredHistory" :key="item.artist.id + i" class="col">
        <div class="history-card card h-100 rounded-4">
          <!-- Save button -->
          <button
            type="button"
            class="btn btn-sm rounded-circle position-absolute top-0 end-0 m-2 z-2"
            :class="savedIds.includes(item.artist.id) ? 'btn-primary' : 'btn-outline-primary'"
            :aria-pressed="savedIds.includes(item.artist.id)"
            :aria-label="savedIds.includes(item.artist.id) ? 'Unsave ' + item.artist.name : 'Save ' + item.artist.name"
            @click="toggleSave(item.artist)"
          >
            <i class="bi" :class="savedIds.includes(item.artist.id) ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
          </button>

          <div class="card-body d-flex align-items-center gap-3 p-3 pe-5">
            <!-- Photo with liked / skipped icon -->
            <div class="position-relative flex-shrink-0">
              <img
                :src="item.artist.image"
                :alt="item.artist.name"
                class="history-img rounded-3 object-fit-cover"
                :style="{ backgroundColor: item.artist.genreColor }"
                @error="e => { e.target.alt = ''; e.target.removeAttribute('src'); }"
              />
              <span
                class="history-action position-absolute bottom-0 end-0 rounded-circle d-flex align-items-center justify-content-center border border-2 border-white"
                :class="item.action === 'follow' ? 'text-bg-danger' : 'text-bg-secondary'"
              >
                <i class="bi" :class="item.action === 'follow' ? 'bi-heart-fill' : 'bi-x-lg'"></i>
              </span>
            </div>

            <div class="overflow-hidden">
              <RouterLink
                :to="{ name: 'artist-detail', params: { id: item.artist.id } }"
                class="stretched-link fw-bold text-reset text-decoration-none d-block text-truncate"
              >
                {{ item.artist.name }}
              </RouterLink>
              <div class="small text-secondary text-truncate">
                {{ [item.artist.genre, item.artist.hometown].filter(Boolean).join(' · ') }}
              </div>
              <div class="small text-secondary d-flex flex-wrap column-gap-3 mt-1">
                <span class="fw-semibold" :class="item.action === 'follow' ? 'text-danger' : 'text-body'">
                  {{ item.action === 'follow' ? 'Liked' : 'Skipped' }}
                </span>
                <span>{{ formatDate(item.date) }}</span>
              </div>
            </div>
          </div>

          <!-- Change or undo the swipe -->
          <div class="card-footer bg-transparent border-0 pt-0 px-3 pb-3 d-flex align-items-center gap-2 position-relative z-2">
            <button
              v-if="item.action === 'skip'"
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="busyId === item.artist.id"
              @click="changeAction(item, 'follow')"
            >
              <i class="bi bi-heart"></i> Like instead
            </button>
            <button
              v-else
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="busyId === item.artist.id"
              @click="changeAction(item, 'skip')"
            >
              <i class="bi bi-x-lg"></i> Skip instead
            </button>
            <button
              type="button"
              class="btn btn-sm btn-link text-secondary text-decoration-none ms-auto"
              :disabled="busyId === item.artist.id"
              @click="undo(item)"
            >
              <i class="bi bi-arrow-counterclockwise"></i> Undo
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <LoginPrompt v-else message="to see your artist matchmaking history." />
</template>

<style scoped>
.history-card {
  border: 1px solid #d3d8e8;
  box-shadow: 0 2px 6px rgba(20, 35, 90, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}
.history-card:hover {
  transform: translateY(-3px);
  border-color: #aab3d0;
  box-shadow: 0 8px 20px rgba(20, 35, 90, 0.15);
}

/* Dark mode: softer outline and darker shadow */
:root[data-theme='dark'] .history-card {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
}
:root[data-theme='dark'] .history-card:hover {
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
}
.history-img {
  width: 64px;
  height: 64px;
}
.history-action {
  width: 24px;
  height: 24px;
  font-size: 0.65rem;
}
</style>
