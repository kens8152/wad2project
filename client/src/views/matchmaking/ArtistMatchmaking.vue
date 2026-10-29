<script setup>
import { ref, onMounted, computed, watchEffect } from 'vue'
import { getArtists, getArtistDetails, getTodaysArtistRows, saveTodaysArtists, setArtistAction, removeArtistAction } from '@/services/matchmakingApi'
import { useFavouriteArtists } from '@/composables/artists/useFavouriteArtists'
import { toast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user';
import LoginPrompt from '@/components/layout/LoginPrompt.vue';
import FlashMessage from '@/components/layout/FlashMessage.vue';
import SongPreview from '@/components/matchmaking/SongPreview.vue';

const userStore = useUserStore();

const { favourites, loadFavourites, toggleFavourite } = useFavouriteArtists()
const actionBusy = ref(false)
const saveFlash = ref(0)

const DISPLAY_COUNT = 5;

// List of artists returned by the server
const artists = ref([]);
const current = ref(0);

// Variables for controlling animation states and flow
// 4 Different duration variations for cards when they render out all cards have been swiped.
const FLY_UP_DURATIONS = [0.5, 0.3, 0.7, 0.4, 0.6];
const hasSwipedCards = ref(false);
const artistsFinished = ref(false); // True after users has swiped all cards
const showFinishedMessage = ref(false);


const displayedArtists = computed(() => {
  const half = Math.floor(DISPLAY_COUNT / 2);
  const slots = [];

  for (let offset = -half; offset <= half; offset++) {
    const index = current.value + offset;
    const artist = (index >= 0 && index < artists.value.length) ? artists.value[index] : null;
    slots.push({ offset, index, artist });
  }

  return slots;
});

// Move every card one slot to the left and bring in the next artist
function nextArtist() {
  if (artistsFinished.value || !artists.value.length) return;

  // Swiped the last artist: end the session instead of moving on
  if (current.value >= artists.value.length - 1) {
    finishSwiping();
    return;
  }

  hasSwipedCards.value = true;
  openSong.value = 0;
  current.value++;
}

function finishSwiping() {
  artistsFinished.value = true;
  setTimeout(() => {
    showFinishedMessage.value = true;
  }, (FLY_UP_DURATIONS[2] + 0.2)*1000); // Second index is the longest
}

// Set a specific saved state instead of blindly toggling it.
async function setSharedSaved(artist, shouldSave) {
  const accountId = userStore.user.id

  await loadFavourites()

  if (!userStore.isLoggedIn || userStore.user.id !== accountId) {
    throw new Error('Your account changed. Please try again.')
  }

  const alreadySaved = favourites.value.includes(artist.id)

  if (alreadySaved !== shouldSave) {
    await toggleFavourite(artist)
  }

  if (!userStore.isLoggedIn || userStore.user.id !== accountId) {
    throw new Error('Your account changed. Please try again.')
  }

  // toggleFavourite handles its own errors, so verify the result.
  if (favourites.value.includes(artist.id) !== shouldSave) {
    throw new Error('The saved artist could not be updated.')
  }
}

async function updateArtistAction(action) {
  const artist = artists.value[current.value]
  if (!artist || artistsFinished.value || !userStore.isLoggedIn || actionBusy.value) return

  actionBusy.value = true

  try {
    if (action === 'follow') {
      await setSharedSaved(artist, true)
    }

    if (action === 'unsure') {
      await removeArtistAction(artist.id)
    } else {
      await setArtistAction(artist.id, action)
    }

    nextArtist()
  } catch (error) {
    console.error('Could not save matchmaking action:', error)
    toast('Could not complete this action. Please try again.')
  } finally {
    actionBusy.value = false
  }
}

function skip() {
  return updateArtistAction('skip')
}

function follow() {
  return updateArtistAction('follow')
}

function unsure() {
  return updateArtistAction('unsure')
}

// Saved / unsaved message at the top of the page
const saveMessage = ref({ saved: false, name: '' });
const saveFlashMessage = ref(null);

function showSaveMessage(artist) {
  saveMessage.value = { saved: artist.saved, name: artist.name };
  saveFlashMessage.value.flash();
}

async function toggleSave() {
  const artist = artists.value[current.value]
  if (!artist || artistsFinished.value || !userStore.isLoggedIn || actionBusy.value) return

  actionBusy.value = true

  try {
    await loadFavourites()

    const shouldSave = !favourites.value.includes(artist.id)
    await setSharedSaved(artist, shouldSave)

    artist.saved = shouldSave
    saveFlash.value++
    showSaveMessage(artist)
  } catch (error) {
    console.error('Could not update saved artist:', error)
    toast('Could not update this artist. Please try again.')
  } finally {
    actionBusy.value = false
  }
}

// Keep the card bookmarks consistent with the shared saved list.
watchEffect(() => {
  const savedIds = favourites.value

  artists.value.forEach(artist => {
    artist.saved = savedIds.includes(artist.id)
  })
})

// Mark which of the loaded artists are already saved
async function markSavedArtists() {
  try {
    const savedIds = (await getSavedArtists()).map(row => row.artist_id);
    artists.value.forEach(artist => (artist.saved = savedIds.includes(artist.id)));
  } catch (err) {
    console.error('Could not load saved artists', err);
  }
}

const openSong = ref(0);

function artistTracks(artist) {
  return artist.tracks?.length ? artist.tracks.slice(0, 3) : [];
}

// Today's artists: continue the saved batch, or get a new one and save it
async function loadTodaysArtists() {
  const rows = await getTodaysArtistRows();

  // No batch yet today
  if (rows.length === 0) {
    artists.value = await getArtists();
    await saveTodaysArtists(artists.value.map(artist => artist.id));
    return;
  }

  // Batch exists: show the ones without an action
  const pending = rows.filter(row => row.action === null);
  if (pending.length === 0) {
    artistsFinished.value = true;
    showFinishedMessage.value = true;
    return;
  }
  artists.value = await getArtistDetails(pending.map(row => row.artist_id));
}

onMounted(async () => {
  if (!userStore.isLoggedIn) return;

  try {
    await loadTodaysArtists()
    await loadFavourites()
    return;
  } catch (err) {
    console.error("Could not load today's artists", err);
  }

  // If Supabase failed: a batch that isn't saved
  try {
    if (!artists.value.length) artists.value = await getArtists();
  } catch (err) {
    console.error('Could not load artists', err);
  }
})
</script>

<template>
  <div v-if="userStore.isLoggedIn" class="matchmaking-page container flex-grow-1 d-flex flex-column pb-2 pb-lg-3 pb-xl-4">
    <FlashMessage
      ref="saveFlashMessage"
      bg-color="secondary"
    >
      <i class="bi" :class="saveMessage.saved ? 'bi-bookmark-check-fill' : 'bi-bookmark-x'"></i>
      {{ saveMessage.saved ? `Saved ${saveMessage.name}` : `Removed ${saveMessage.name} from saved` }}
    </FlashMessage>

    <!-- Header -->
    <div class="text-center mb-2 pt-3">
      <h2 class="fw-bold mb-2">Discover Local Artists</h2>
      <p class="lead text-dark mb-0 fs-6">
        Swipe through artists, listen to a preview, and find new music that matches your taste.
      </p>
    </div>

    <div 
      v-if="!showFinishedMessage" 
      class="card-row flex-grow-1 d-grid d-sm-flex justify-content-center align-items-center mt-1 mt-sm-2"
    >
      <!-- Skip Btn -->
      <div
        class="action skip-action text-center mt-3 mt-sm-5"
        :class="{ 'fly-up': artistsFinished }"
        :style="{ animationDuration: '0.55s' }"
      >
        <button class="btn btn-light rounded-circle shadow action-btn fs-2" aria-label="Skip" :disabled="actionBusy || artistsFinished || !artists.length" @click="skip()">
          <i class="bi bi-x-lg text-secondary"></i>
        </button>
        <div class="fw-semibold small mt-2">Skip</div>
      </div>

      <!-- Artist Cards -->
      <div class="card-stage flex-shrink-0">
        <div
          v-for="slot in displayedArtists.filter(slot => slot.artist)"
          :key="slot.artist.id"
          class="card drop-in text-white border-0 rounded-4 overflow-hidden shadow"
          :style="artistsFinished
            ? { animationDuration: FLY_UP_DURATIONS[slot.offset + 2] + 's', animationDelay: '0s' }
            : { animationDelay: hasSwipedCards ? '0.2s' : (slot.offset + 2) * 0.15 + 's' }"
          :class="{
            'main-card h-100': slot.offset === 0,
            'side-card d-none d-lg-block': Math.abs(slot.offset) === 1,
            'far-card h-75 d-none d-xl-block': Math.abs(slot.offset) === 2,
            'left-side': slot.offset < 0,
            'right-side': slot.offset > 0,
            'fly-up': artistsFinished,
          }"
        >
          <template v-if="slot.artist">
            <img
              :src="slot.artist.image"
              :alt="slot.artist.name"
              class="w-100 h-100 object-fit-cover"
              :style="{ backgroundColor: slot.artist.genreColor }"
              @error="e => { e.target.alt = ''; e.target.removeAttribute('src'); }"
            />

            <!-- Text sits on top of the image, pushed to the bottom of the card -->
            <div class="card-img-overlay d-flex flex-column justify-content-end px-0 pb-0 pt-5">
              <!-- Save button -->
              <button v-if="slot.offset === 0" :key="'save-' + saveFlash" class="btn shadow rounded-circle position-absolute top-0 start-0 m-2" :class="[slot.artist.saved ? 'btn-primary' : 'btn-light', { 'saved': saveFlash > 0 }]" :aria-pressed="!!slot.artist.saved" :aria-label="slot.artist.saved ? 'Unsave' : 'Save'" :disabled="actionBusy || artistsFinished || !artists.length" @click="toggleSave()">
                <i class="bi" :class="slot.artist.saved ? 'bi-bookmark-fill' : 'bi-bookmark text-primary'"></i>
              </button>

              <!-- Unsure button -->
              <button v-if="slot.offset === 0" class="unsure-btn btn btn-sm bg-black bg-opacity-50 text-white border-0 rounded-pill position-absolute top-0 start-50 translate-middle-x mt-2" :disabled="actionBusy || artistsFinished || !artists.length" @click="unsure()">
                <i class="bi bi-question-circle"></i> &nbsp; Unsure
              </button>

              <!-- Card position / total -->
              <span
                v-if="slot.offset === 0"
                class="badge rounded-pill bg-dark bg-opacity-50 position-absolute top-0 end-0 m-2"
              >
                {{ slot.index + 1 }} / {{ artists.length }}
              </span>

              <div class="info-wrap position-relative d-flex flex-column">
              <!-- Collapse arrow -->
              <div
                v-if="slot.offset === 0"
                class="collapse-arrow collapsed position-absolute top-0 start-50 translate-middle-x z-2 lh-1"
                role="button"
                aria-label="Show fewer songs"
                data-bs-toggle="collapse"
                :data-bs-target="'#songs-' + slot.artist.id"
                aria-expanded="false"
              >
                <i class="bi bi-chevron-compact-down"></i>
              </div>

              <div class="card-info p-2 pt-3 p-sm-3 overflow-auto">
                <!-- Main card: full details -->
                <template v-if="slot.offset === 0">
                  <!-- Pull-up area -->
                  <div
                    class="pull-area collapsed"
                    data-bs-toggle="collapse"
                    :data-bs-target="'#songs-' + slot.artist.id"
                    aria-expanded="false"
                    @pointerdown="e => e.currentTarget.setPointerCapture(e.pointerId)"
                  >
                    <h3 class="card-title fw-bold mb-0">{{ slot.artist.name }}</h3>
                    <p class="mb-2">
                      <i class="bi bi-geo-alt"></i> {{ slot.artist.hometown }}
                      <span v-if="slot.artist.formed"> · Since {{ slot.artist.formed }}</span>
                    </p>

                    <!-- Genres -->
                    <div class="d-flex flex-wrap gap-2 mb-sm-2">
                      <span v-if="slot.artist.genre" class="badge rounded-pill border border-light fw-normal">
                        {{ slot.artist.genre }}
                      </span>
                      <span v-if="slot.artist.tag" class="badge rounded-pill border border-light fw-normal">
                        {{ slot.artist.tag }}
                      </span>
                    </div>
                  </div>

                  <template v-if="artistTracks(slot.artist).length">
                    <!-- First song -->
                    <SongPreview
                      class="mt-1 mb-2"
                      :track="artistTracks(slot.artist)[0]"
                      :open="openSong === 0"
                      @open="openSong = 0"
                    />
                  </template>

                  <!-- No songs -->
                  <p v-else class="small fst-italic opacity-75 mt-1 mb-2">
                    <i class="bi bi-music-note"></i> No song samples to show yet
                  </p>

                  <div
                    class="pull-area songs-hint collapsed small d-flex align-items-center gap-1"
                    data-bs-toggle="collapse"
                    :data-bs-target="'#songs-' + slot.artist.id"
                    aria-expanded="false"
                    @pointerdown="e => e.currentTarget.setPointerCapture(e.pointerId)"
                  >
                    <i class="bi bi-music-note-beamed"></i> &nbsp;
                    {{ artistTracks(slot.artist).length > 1
                      ? `Checkout ${artistTracks(slot.artist).length - 1} more samples`
                      : 'More about this artist' }}
                    <i class="bi bi-chevron-up ms-auto"></i>
                  </div>

                  <!-- More songs -->
                  <div
                    class="collapse"
                    :id="'songs-' + slot.artist.id"
                    v-on="{ 'hide.bs.collapse': () => (openSong = 0) }"
                  >
                    <SongPreview
                      v-for="(track, i) in artistTracks(slot.artist).slice(1)"
                      :key="track.id"
                      class="mb-2"
                      :track="track"
                      :open="openSong === i + 1"
                      @open="openSong = i + 1"
                    />

                    <RouterLink
                      :to="{ name: 'artist-detail', params: { id: slot.artist.id } }"
                      class="btn btn-light btn-sm w-100 mt-2"
                    >
                      View artist <i class="bi bi-arrow-right"></i>
                    </RouterLink>
                  </div>
                </template>

                <!-- Side cards: name and genres only -->
                <template v-else>
                  <h5 class="card-title fw-bold mb-0">{{ slot.artist.name }}</h5>
                  <p class="small mb-0">{{ [slot.artist.genre, slot.artist.tag].filter(Boolean).join(' • ') }}</p>
                </template>
              </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Follow Btn -->
      <div
        class="action follow-action text-center mt-3 mt-sm-5"
        :class="{ 'fly-up': artistsFinished }"
        :style="{ animationDuration: '0.75s' }"
      >
        <button class="btn btn-light rounded-circle shadow action-btn" aria-label="Follow" :disabled="actionBusy || artistsFinished || !artists.length" @click="follow()">
          <i class="bi bi-heart-fill text-danger"></i>
        </button>
        <div class="fw-semibold small mt-2">Follow</div>
      </div>
    </div>

    <!-- Shown after all cards has been swiped -->
    <div v-else class="drop-in text-center py-5">
      <i class="bi bi-stars display-3 text-primary"></i>
      <h2 class="fw-bold mt-3 mb-2">You've swiped through all the artists for today!</h2>
      <p class="text-secondary mb-0">Come back tomorrow for a fresh batch of local artists.</p>
    </div>
  </div>
  <LoginPrompt v-else message="to discover artists." />
</template>

<style scoped>
/* Page */
.matchmaking-page {
  overflow-y: clip;
}

/* Phone layout (grid): card on top, Skip and Follow below */
.card-row {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr auto;
}
.card-row .card-stage {
  grid-column: 1 / 3;
  justify-self: center;
}
.card-row .skip-action {
  grid-row: 2;
  justify-self: end;
}
.card-row .follow-action {
  grid-row: 2;
  justify-self: start;
}

.card-stage {
  position: relative;
  height: 100%;
  aspect-ratio: 320 / 460;
}

.card {
  position: absolute;
  aspect-ratio: 320 / 460;
  transition: left 0.4s ease, top 0.4s ease, transform 0.4s ease;
}

/* Big card in the middle */
.main-card {
  left: 0%;
  top: 0%;
  z-index: 3;
}
/* Cards right behind the middle card */
.side-card {
  height: 87.5%;
  top: 8%;
  z-index: 2;
}
/* Cards at the far left and right */
.far-card {
  top: 16%;
  z-index: 1;
}

/* Tilt the side cards away from the middle */
.side-card.left-side {
  transform: rotate(-5deg);
}
.side-card.right-side {
  transform: rotate(5deg);
}
.far-card.left-side {
  transform: rotate(-9deg);
}
.far-card.right-side {
  transform: rotate(9deg);
}


/* lg display */
@media (min-width: 992px) {
  .card-stage {
    aspect-ratio: 1 / 1;
  }
  .side-card.left-side {
    left: 0%;
  }
  .main-card {
    left: 15.22%;
  }
  .side-card.right-side {
    left: 39.13%;
  }
}
/* xl-display */
@media (min-width: 1200px) {
  .card-stage {
    aspect-ratio: 600 / 460;
  }
  .far-card.left-side {
    left: 0%;
  }
  .side-card.left-side {
    left: 11.67%;
  }
  .main-card {
    left: 23.33%;
  }
  .side-card.right-side {
    left: 41.67%;
  }
  .far-card.right-side {
    left: 60%;
  }
}

/* Drop-in animation when the page opens*/
@keyframes drop-in {
  from {
    opacity: 0;
    translate: 0px -80px;
  }
  to {
    opacity: 1;
    translate: 0px 0px;
  }
}
.drop-in {
  animation: drop-in 0.4s ease-out both;
}

/* Fade away and upwards animation for cards after all swipes are complete. */
@keyframes fly-up {
  from {
    opacity: 1;
    translate: 0px 0px;
  }
  to {
    opacity: 0;
    translate: 0px -150px;
  }
}
.fly-up {
  animation: fly-up 0.8s ease-in both;
}

@keyframes saved {
  0% {
    scale: 1;
  }
  40% {
    scale: 1.25;
  }
  100% {
    scale: 1;
  }
}
.saved {
  animation: saved 0.2s ease-out;
}

/* Dark see-through box behind the text so it is readable on any image */
.card-info {
  background-color: rgba(0, 0, 0, 0.5);
  font-size: 0.875rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.4) transparent;
}
.info-wrap {
  min-height: 0;
}

@media (max-height: 700px) {
  .card-info {
    font-size: 0.75rem;
  }
}

/* Info text sizes */
.card-info h3 {
  font-size: 1.75em;
}
.card-info .btn-sm {
  font-size: 0.875em;
}

/* Pull-up area */
.pull-area {
  cursor: pointer;
  touch-action: none;
}

/* Collapse arrow */
.collapse-arrow.collapsed {
  display: none;
}

/* Songs hint */
.songs-hint:not(.collapsed) {
  display: none !important;
}

/* Skip and follow buttons */
.action-btn {
  width: 64px;
  height: 64px;
  font-size: 24px;
}

/* Unsure button */
.unsure-btn {
  font-size: 0.8rem;
}

/* Phones: smaller buttons and info text */
@media (max-width: 575px) {
  .action-btn {
    width: 7.5vh;
    height: 7.5vh;
    font-size: 3vh;
  }
  .card-info {
    font-size: 1.7vh;
  }
  .card-info h3 {
    font-size: 1.5em;
  }
  .unsure-btn {
    font-size: 1.6vh;
  }
}


/* Skip and follow button */
.skip-action {
  margin-right: 16px;
}
.follow-action {
  margin-left: 16px;
}
@media (min-width: 992px) {
  .skip-action {
    margin-right: 6vh;
  }
  .follow-action {
    margin-left: 6vh;
  }
}
@media (min-width: 1200px) {
  .skip-action {
    margin-right: 8vh;
  }
  .follow-action {
    margin-left: 8vh;
  }
}
</style>
