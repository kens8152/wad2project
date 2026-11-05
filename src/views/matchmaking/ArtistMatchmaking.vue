<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  getArtists, getArtistDetails, addSongs, getTodaysArtistRows, saveTodaysArtists, setArtistAction, removeArtistAction,
} from '@/services/matchmakingApi'
import { useSavedArtists } from '@/composables/artists/useSavedArtists'
import { toast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user';
import LoginPrompt from '@/components/layout/LoginPrompt.vue';
import FlashMessage from '@/components/layout/FlashMessage.vue';
import SongPreview from '@/components/matchmaking/SongPreview.vue';

const userStore = useUserStore();
const { loadSaved, isSaved, toggleSaved } = useSavedArtists()

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
const noArtistsLeft = ref(false); // True when every artist has been swiped

// Swipe animation: which way the main card is flying and which reaction burst is showing
const swipeDir = ref(''); // 'left' (skip), 'right' (like), 'up' (unsure)
const reaction = ref(''); // 'like' or 'skip'
const reactionKey = ref(0);
const likedThisBatch = ref([]); // artists liked since this page opened
const skippedThisBatch = ref([]);
const SWIPE_MS = 900;
// Music notes and hearts that float up when you like an artist
const NOTE_BURST = [
  { icon: 'bi-music-note-beamed', dx: '-120px', dy: '-190px', size: '2.2rem', color: '#ff5aa0', delay: '0s' },
  { icon: 'bi-heart-fill', dx: '-60px', dy: '-230px', size: '1.5rem', color: '#ff7ab8', delay: '0.06s' },
  { icon: 'bi-music-note', dx: '0px', dy: '-250px', size: '2.6rem', color: '#a78bff', delay: '0.02s' },
  { icon: 'bi-heart-fill', dx: '60px', dy: '-220px', size: '1.7rem', color: '#ff5aa0', delay: '0.1s' },
  { icon: 'bi-music-note-beamed', dx: '120px', dy: '-185px', size: '2rem', color: '#6cc3ff', delay: '0.04s' },
  { icon: 'bi-music-note', dx: '-150px', dy: '-110px', size: '1.4rem', color: '#a78bff', delay: '0.14s' },
  { icon: 'bi-music-note', dx: '150px', dy: '-120px', size: '1.5rem', color: '#ff7ab8', delay: '0.12s' },
];
// Music notes that fall out of the card like confetti when you like an artist
const NOTE_RAIN = [
  { icon: 'bi-music-note-beamed', left: '8%', sway: '-30px', size: '1.8rem', color: '#ff5aa0', delay: '0.1s', time: '1.8s' },
  { icon: 'bi-music-note', left: '18%', sway: '24px', size: '2.2rem', color: '#a78bff', delay: '0.35s', time: '2s' },
  { icon: 'bi-heart-fill', left: '28%', sway: '-20px', size: '1.2rem', color: '#ff7ab8', delay: '0.2s', time: '1.7s' },
  { icon: 'bi-music-note-beamed', left: '39%', sway: '30px', size: '2rem', color: '#ffc85a', delay: '0.5s', time: '2.1s' },
  { icon: 'bi-music-note', left: '50%', sway: '-26px', size: '2.4rem', color: '#ff5aa0', delay: '0.05s', time: '1.9s' },
  { icon: 'bi-vinyl-fill', left: '60%', sway: '22px', size: '1.7rem', color: '#6cc3ff', delay: '0.4s', time: '2.2s' },
  { icon: 'bi-music-note-beamed', left: '70%', sway: '-34px', size: '1.9rem', color: '#a78bff', delay: '0.25s', time: '1.8s' },
  { icon: 'bi-heart-fill', left: '80%', sway: '26px', size: '1.4rem', color: '#ff5aa0', delay: '0.55s', time: '2s' },
  { icon: 'bi-music-note', left: '90%', sway: '-22px', size: '2rem', color: '#ffc85a', delay: '0.3s', time: '1.9s' },
  { icon: 'bi-music-note-beamed', left: '34%', sway: '18px', size: '1.5rem', color: '#6cc3ff', delay: '0.7s', time: '1.8s' },
  { icon: 'bi-music-note', left: '66%', sway: '-18px', size: '1.6rem', color: '#ff7ab8', delay: '0.65s', time: '2s' },
];

// Streaks that rush past when the artist is skipped, like fast-forwarding a track
const SKIP_LINES = [
  { top: '14%', width: '55%', delay: '0s' },
  { top: '30%', width: '80%', delay: '0.05s' },
  { top: '47%', width: '65%', delay: '0.02s' },
  { top: '63%', width: '90%', delay: '0.08s' },
  { top: '80%', width: '60%', delay: '0.04s' },
];

// The album cover of the artist's own first song is used as the picture on the card
function coverOf(artist) {
  const track = artist.tracks && artist.tracks.length ? artist.tracks[0] : null;
  return track && track.artwork ? track.artwork.replace('100x100', '400x400') : '';
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Plays the fly-away animation of the main card, then the page moves on to the next artist
async function playSwipe(action) {
  openSong.value = -1; // stops the song that is playing on this card
  swipeDir.value = action === 'follow' ? 'right' : action === 'skip' ? 'left' : 'up';
  if (action === 'follow' || action === 'skip') {
    reaction.value = action === 'follow' ? 'like' : 'skip';
    reactionKey.value++;
  }
  const thisReaction = reactionKey.value;
  // the reaction keeps playing a little after the card has gone (the falling notes need time)
  setTimeout(() => {
    if (reactionKey.value === thisReaction) reaction.value = '';
  }, 2400);
  await wait(SWIPE_MS);
}

// Style of one card: the swiping card ignores the drop-in delay
function cardStyle(slot) {
  if (artistsFinished.value) return { animationDuration: FLY_UP_DURATIONS[slot.offset + 2] + 's', animationDelay: '0s' };
  if (slot.offset === 0 && swipeDir.value) return { animationDuration: SWIPE_MS + 'ms', animationDelay: '0s' };
  return { animationDelay: hasSwipedCards.value ? '0.2s' : (slot.offset + 2) * 0.15 + 's' };
}


const displayedArtists = computed(() => {
  const half = Math.floor(DISPLAY_COUNT / 2);
  const slots = [];

  // artists that were already swiped are gone; only the current card and the ones coming up are shown
  for (let offset = 0; offset <= half; offset++) {
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

// "Skip the rest": leave matchmaking now; the artists that were not swiped stay for later
function finishEarly() {
  if (artistsFinished.value || actionBusy.value) return;
  openSong.value = -1;
  finishSwiping();
}

// How the liked artists split over genres, for the colour bar on the last screen
const tasteMix = computed(() => {
  const mix = [];
  likedThisBatch.value.forEach(artist => {
    const found = mix.find(item => item.name === artist.genre);
    if (found) found.count++;
    else mix.push({ name: artist.genre || 'Other', color: artist.genreColor, count: 1 });
  });
  return mix.sort((a, b) => b.count - a.count);
});

function finishSwiping() {
  artistsFinished.value = true;
  if (likedThisBatch.value.length) {
    toast('Taste profile updated: ' + likedThisBatch.value.length + ' liked ' + (likedThisBatch.value.length === 1 ? 'artist' : 'artists') + ' added');
  }
  setTimeout(() => {
    showFinishedMessage.value = true;
  }, (FLY_UP_DURATIONS[2] + 0.2)*1000); // Second index is the longest
}

async function updateArtistAction(action) {
  const artist = artists.value[current.value]
  if (!artist || artistsFinished.value || !userStore.isLoggedIn || actionBusy.value) return

  actionBusy.value = true

  try {
    // Like is stored as the "follow" action; the artist then appears under Liked artists in the profile
    if (action === 'unsure') {
      await removeArtistAction(artist.id)
    } else {
      await setArtistAction(artist.id, action)
    }

    if (action === 'follow') likedThisBatch.value.push(artist)
    if (action === 'skip') skippedThisBatch.value.push(artist)

    await playSwipe(action)
    nextArtist()
    // after the last card the swiped card must stay hidden while everything flies up
    if (!artistsFinished.value) swipeDir.value = ''
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

function like() {
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
    artist.saved = await toggleSaved(artist.id)
    saveFlash.value++
    showSaveMessage(artist)
  } catch (error) {
    console.error('Could not update saved artist:', error)
    toast('Could not update this artist. Please try again.')
  } finally {
    actionBusy.value = false
  }
}

// Mark which of the loaded artists are already saved
async function markSavedArtists() {
  try {
    await loadSaved();
    artists.value.forEach(artist => (artist.saved = isSaved(artist.id)));
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

    // Every artist has been swiped already
    if (artists.value.length === 0) {
      noArtistsLeft.value = true;
      artistsFinished.value = true;
      showFinishedMessage.value = true;
      return;
    }

    await saveTodaysArtists(artists.value.map(artist => artist.id));
    return;
  }

  // Remember what was already liked or skipped today, so the last screen is right after a refresh
  const likedIds = rows.filter(row => row.action === 'follow').map(row => row.artist_id);
  const skippedIds = rows.filter(row => row.action === 'skip').map(row => row.artist_id);
  likedThisBatch.value = await addSongs(await getArtistDetails(likedIds));
  skippedThisBatch.value = await addSongs(await getArtistDetails(skippedIds));

  // Batch exists: show the ones without an action (only artists that have songs to play)
  const pending = rows.filter(row => row.action === null);
  const pendingArtists = pending.length ? await addSongs(await getArtistDetails(pending.map(row => row.artist_id))) : [];
  artists.value = pendingArtists.filter(artist => artist.tracks.length);

  if (artists.value.length === 0) {
    artistsFinished.value = true;
    showFinishedMessage.value = true;
  }
}

// Testing button: get a fresh batch of artists and swipe again
const loadingNewBatch = ref(false);

async function startNewBatch() {
  if (loadingNewBatch.value) return;
  loadingNewBatch.value = true;

  try {
    const newArtists = await getArtists();

    // Every artist has been swiped already: stay on the last screen
    if (newArtists.length === 0) {
      noArtistsLeft.value = true;
      toast("You've seen every artist we have for now.");
      return;
    }

    // The finished batch stays in the history; the new one is added after it
    try {
      await saveTodaysArtists(newArtists.map(artist => artist.id));
    } catch (err) {
      console.error('Could not save the new batch', err);
    }

    // only artists with a song to play get a card
    artists.value = newArtists.filter(artist => artist.tracks.length);
    await markSavedArtists();
    current.value = 0;
    openSong.value = 0;
    hasSwipedCards.value = false;
    swipeDir.value = ''; // the last swipe animation must not carry over to the new cards
    reaction.value = '';
    likedThisBatch.value = [];
    skippedThisBatch.value = [];
    artistsFinished.value = false;
    showFinishedMessage.value = false;
  } catch (err) {
    console.error('Could not load a new batch', err);
    toast('Could not load new artists. Please try again.');
  } finally {
    loadingNewBatch.value = false;
  }
}

onMounted(async () => {
  if (!userStore.isLoggedIn) return;

  try {
    await loadTodaysArtists()
    await markSavedArtists()
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
  <div v-if="userStore.isLoggedIn" class="riffle-page-bg d-flex flex-column">
    <div class="matchmaking-page container flex-grow-1 d-flex flex-column pb-2 pb-lg-3 pb-xl-4">
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
        <p class="subtitle lead mb-0 fs-6">
          Swipe through artists, listen to a preview, and find new music that matches your taste.
        </p>
        <RouterLink :to="{ name: 'match-history' }" class="small text-decoration-none">
          <i class="bi bi-clock-history"></i> Match history
        </RouterLink>
        <div v-if="!showFinishedMessage" class="liked-slot mt-2">
          <span v-if="likedThisBatch.length" :key="likedThisBatch.length" class="liked-counter badge rounded-pill">
            <i class="bi bi-heart-fill"></i> {{ likedThisBatch.length }} liked · building your taste profile
          </span>
        </div>
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
          <button :key="'skip-' + reactionKey" class="btn btn-light rounded-circle shadow action-btn skip-btn fs-2" :class="{ 'is-popping': reaction === 'skip' }" aria-label="Skip" :disabled="actionBusy || artistsFinished || !artists.length" @click="skip()">
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
            :style="cardStyle(slot)"
            :class="{
              'swipe-left': slot.offset === 0 && swipeDir === 'left',
              'swipe-right': slot.offset === 0 && swipeDir === 'right',
              'swipe-up': slot.offset === 0 && swipeDir === 'up',
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
                :class="{ 'backdrop-blur': coverOf(slot.artist) }"
                :style="{ backgroundColor: slot.artist.genreColor }"
                @error="e => { e.target.alt = ''; e.target.removeAttribute('src'); }"
              />

              <!-- The artist's picture: the cover of their own song on a spinning record -->
              <div v-if="coverOf(slot.artist)" class="cover" :class="{ 'cover-main': slot.offset === 0 }" :style="{ '--glow': slot.artist.genreColor }">
                <span class="cover-record"></span>
                <img :src="coverOf(slot.artist)" :alt="slot.artist.name + ' cover'" class="cover-art" />
              </div>

              <!-- Stamp that appears while the card flies away -->
              <span v-if="slot.offset === 0 && swipeDir" class="stamp" :class="'stamp-' + swipeDir">
                <i class="bi" :class="swipeDir === 'right' ? 'bi-heart-fill' : swipeDir === 'left' ? 'bi-skip-forward-fill' : 'bi-question-lg'"></i>
                {{ swipeDir === 'right' ? 'Liked' : swipeDir === 'left' ? 'Skipped' : 'Unsure' }}
              </span>
              <!-- A light that sweeps across the card as it leaves -->
              <span v-if="slot.offset === 0 && swipeDir" class="swipe-shine" :class="'swipe-shine-' + swipeDir"></span>

              <!-- Text sits on top of the image, pushed to the bottom of the card -->
              <div class="card-img-overlay d-flex flex-column justify-content-end px-0 pb-0 pt-5">
                <!-- Save button -->
                <button v-if="slot.offset === 0" :key="'save-' + saveFlash" class="btn shadow rounded-circle position-absolute top-0 start-0 m-2" :class="[slot.artist.saved ? 'btn-primary' : 'btn-light', { 'saved': saveFlash > 0 && !slot.artist.saved, 'just-saved': saveFlash > 0 && slot.artist.saved }]" :aria-pressed="!!slot.artist.saved" :aria-label="slot.artist.saved ? 'Unsave' : 'Save'" :disabled="actionBusy || artistsFinished || !artists.length" @click="toggleSave()">
                  <i class="bi" :class="slot.artist.saved ? 'bi-bookmark-fill' : 'bi-bookmark text-primary'"></i>
                </button>

                <!-- Unsure button -->
                <button v-if="slot.offset === 0" class="unsure-btn" :disabled="actionBusy || artistsFinished || !artists.length" @click="unsure()">
                  <span class="unsure-icon"><i class="bi bi-question-lg"></i></span> Not sure yet
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
                      class="pull-area songs-hint collapsed small fw-semibold d-flex align-items-center gap-2 rounded-pill border px-3 py-2"
                      role="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="'#songs-' + slot.artist.id"
                      aria-expanded="false"
                      @pointerdown="e => e.currentTarget.setPointerCapture(e.pointerId)"
                    >
                      <template v-if="artistTracks(slot.artist).length > 1">
                        <span class="songs-hint-count badge rounded-pill bg-light text-dark">+{{ artistTracks(slot.artist).length - 1 }}</span>
                        Hear {{ artistTracks(slot.artist).length - 1 }} more {{ artistTracks(slot.artist).length - 1 === 1 ? 'song' : 'songs' }}
                      </template>
                      <template v-else>
                        <i class="bi bi-info-circle"></i> More about this artist
                      </template>
                      <i class="bi bi-chevron-up songs-hint-arrow ms-auto"></i>
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

          <!-- Burst that plays on Like / Skip -->
          <div v-if="reaction" :key="reactionKey" class="reaction" :class="'reaction-' + reaction" aria-hidden="true">
            <template v-if="reaction === 'like'">
              <span
                v-for="(line, i) in SKIP_LINES"
                :key="'l' + i"
                class="like-line"
                :style="{ top: line.top, width: line.width, animationDelay: line.delay }"
              ></span>
              <span class="like-badge"><i class="bi bi-heart-fill"></i></span>
              <i
                v-for="(note, i) in NOTE_RAIN"
                :key="'r' + i"
                class="bi rain-note"
                :class="note.icon"
                :style="{ left: note.left, '--sway': note.sway, color: note.color, fontSize: note.size, animationDelay: note.delay, animationDuration: note.time }"
              ></i>
              <span class="wave wave-1"></span>
              <span class="wave wave-2"></span>
              <span class="wave wave-3"></span>
              <i
                v-for="(note, i) in NOTE_BURST"
                :key="i"
                class="bi reaction-note"
                :class="note.icon"
                :style="{ '--dx': note.dx, '--dy': note.dy, color: note.color, fontSize: note.size, animationDelay: note.delay }"
              ></i>
            </template>
            <template v-else>
              <span
                v-for="(line, i) in SKIP_LINES"
                :key="i"
                class="skip-line"
                :style="{ top: line.top, width: line.width, animationDelay: line.delay }"
              ></span>
              <span class="skip-badge"><i class="bi bi-skip-forward-fill"></i></span>
            </template>
          </div>
        </div>

        <!-- Like Btn -->
        <div
          class="action follow-action text-center mt-3 mt-sm-5"
          :class="{ 'fly-up': artistsFinished }"
          :style="{ animationDuration: '0.75s' }"
        >
          <button :key="'like-' + reactionKey" class="btn btn-light rounded-circle shadow action-btn like-btn" :class="{ 'is-popping': reaction === 'like' }" aria-label="Like" :disabled="actionBusy || artistsFinished || !artists.length" @click="like()">
            <i class="bi bi-heart-fill text-danger"></i>
          </button>
          <div class="fw-semibold small mt-2">Like</div>
        </div>
      </div>

      <!-- Leave matchmaking early (bottom right corner) -->
      <button v-if="!showFinishedMessage" type="button" class="finish-early btn rounded-pill shadow-sm" :disabled="artistsFinished || actionBusy" aria-label="Skip the rest" @click="finishEarly()">
        <span class="finish-early-text">Skip the rest</span> <i class="bi bi-skip-forward-fill"></i>
      </button>

      <!-- Shown after all cards has been swiped -->
      <div v-else class="finish drop-in">
        <div class="finish-card">
          <p class="finish-kicker"><i class="bi bi-stars"></i> Today's matchmaking</p>
          <h2 class="finish-title">{{ noArtistsLeft ? "You've seen every artist we have!" : 'Your taste profile just got sharper' }}</h2>
          <p class="finish-sub">
            <template v-if="noArtistsLeft && !likedThisBatch.length">New local artists will show up here as they join.</template>
            <template v-else-if="likedThisBatch.length">
              {{ likedThisBatch.length === 1 ? 'One artist now shapes' : likedThisBatch.length + ' artists now shape' }} what Riffle plays for you. They are saved under <b>Liked</b> in your profile.
            </template>
            <template v-else>You did not like anyone this round, so your taste profile stays as it was. Get a new batch to try again.</template>
          </p>

          <div class="finish-stats">
            <div class="finish-stat finish-stat-like">
              <i class="bi bi-heart-fill"></i>
              <strong>{{ likedThisBatch.length }}</strong>
              <span>Liked</span>
            </div>
            <div class="finish-stat">
              <i class="bi bi-skip-forward-fill"></i>
              <strong>{{ skippedThisBatch.length }}</strong>
              <span>Skipped</span>
            </div>
            <div class="finish-stat">
              <i class="bi bi-vinyl-fill"></i>
              <strong>{{ tasteMix.length }}</strong>
              <span>{{ tasteMix.length === 1 ? 'Genre' : 'Genres' }}</span>
            </div>
          </div>

          <div v-if="tasteMix.length" class="taste-mix">
            <div class="taste-mix-bar">
              <span v-for="item in tasteMix" :key="item.name" :style="{ flexGrow: item.count, background: item.color }" :title="item.name + ' · ' + item.count"></span>
            </div>
            <ul class="taste-mix-legend list-unstyled">
              <li v-for="item in tasteMix" :key="item.name"><i :style="{ background: item.color }"></i> {{ item.name }} <b>{{ item.count }}</b></li>
            </ul>
          </div>

          <div v-if="likedThisBatch.length" class="finish-artists">
            <RouterLink
              v-for="(artist, i) in likedThisBatch"
              :key="artist.id"
              :to="{ name: 'artist-detail', params: { id: artist.id } }"
              class="finish-artist"
              :style="{ '--accent': artist.genreColor, animationDelay: 0.1 * i + 's' }"
            >
              <img :src="artist.image" :alt="artist.name" @error="e => e.target.removeAttribute('src')" />
              <span class="finish-artist-text">
                <strong>{{ artist.name }}</strong>
                <small>{{ artist.genre }}</small>
              </span>
              <i class="bi bi-heart-fill finish-heart"></i>
            </RouterLink>
          </div>

          <div class="finish-actions">
            <RouterLink :to="{ name: 'profile', query: { tab: 'liked' } }" class="btn btn-primary rounded-pill px-4">
              <i class="bi bi-balloon-heart-fill"></i> See your liked artists
            </RouterLink>
            <button v-if="!noArtistsLeft" type="button" class="btn btn-outline-primary rounded-pill px-3" :disabled="loadingNewBatch" @click="startNewBatch()">
              <i class="bi bi-arrow-repeat"></i> {{ loadingNewBatch ? 'Loading…' : 'Get a new batch' }}
            </button>
            <RouterLink :to="{ name: 'match-history' }" class="btn btn-outline-dark rounded-pill px-3">
              <i class="bi bi-clock-history"></i> Review your swipes
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
  <LoginPrompt v-else message="to discover artists." />
</template>

<style scoped>
/* Page */
.matchmaking-page {
  overflow-y: clip;
}

/* Subtitle colour used on the other pages (changes with dark mode) */
.subtitle {
  color: var(--riffle-muted);
}

/* Info box and buttons sit above the cover photo */
.card-img-overlay {
  z-index: 2;
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

/* Saved: a small pop with a ring that spreads out */
.just-saved {
  animation: save-pop 0.45s ease-out;
}
.just-saved::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid #a98bff;
  border-radius: 50%;
  pointer-events: none;
  animation: save-ring 0.5s ease-out forwards;
}
@keyframes save-pop {
  0% {
    scale: 1;
  }
  35% {
    scale: 1.3;
  }
  60% {
    scale: 0.92;
  }
  100% {
    scale: 1;
  }
}
@keyframes save-ring {
  from {
    scale: 1;
    opacity: 0.9;
  }
  to {
    scale: 1.9;
    opacity: 0;
  }
}

/* ---- swipe animations ---- */
/* Like: same whip as skip, but to the right, with a joyful hop first and a pink / gold glow */
@keyframes swipe-right {
  0% { opacity: 1; translate: 0 0; rotate: 0deg; scale: 1; filter: none; box-shadow: none; }
  16% { translate: -8px -18px; rotate: -3deg; scale: 1.06; box-shadow: 0 0 40px rgba(255, 90, 160, 0.85), 0 0 90px rgba(255, 200, 90, 0.5); filter: saturate(1.4); }
  34% { translate: 8px -6px; rotate: 2deg; scale: 1.03; box-shadow: -10px 0 0 rgba(255, 200, 90, 0.6), 10px 0 0 rgba(255, 90, 160, 0.6), 0 0 70px rgba(167, 139, 255, 0.6); filter: saturate(1.6); }
  100% { opacity: 0; translate: 150% -4%; rotate: 24deg; scale: 0.95; filter: blur(4px) saturate(1.2); box-shadow: 0 0 60px rgba(255, 90, 160, 0.7); }
}
@keyframes swipe-left {
  0% { opacity: 1; translate: 0 0; rotate: 0deg; filter: none; box-shadow: none; }
  18% { translate: 10px 0; box-shadow: -10px 0 0 rgba(0, 220, 255, 0.55), 10px 0 0 rgba(255, 60, 150, 0.55); filter: saturate(1.6); }
  34% { translate: -8px 0; box-shadow: 10px 0 0 rgba(0, 220, 255, 0.55), -10px 0 0 rgba(255, 60, 150, 0.55); filter: saturate(1.6); }
  100% { opacity: 0; translate: -150% 4%; rotate: -24deg; filter: blur(4px) saturate(0.4); box-shadow: none; }
}
@keyframes swipe-up {
  0% { opacity: 1; translate: 0 0; scale: 1; }
  100% { opacity: 0; translate: 0 -40%; scale: 0.88; }
}
.swipe-left { animation: swipe-left 0.9s cubic-bezier(0.5, 0, 0.9, 0.4) both; }
.swipe-right { animation: swipe-right 0.9s cubic-bezier(0.5, 0, 0.9, 0.4) both; }
.swipe-up { animation: swipe-up 0.9s ease-in both; }

/* Liked / Skipped badge on the flying card */
.stamp {
  position: absolute;
  top: 3.4rem;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.9rem;
  border-radius: 999px;
  color: #fff;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
  animation: stamp-in 0.4s cubic-bezier(0.2, 1.6, 0.4, 1) both;
}
.stamp-right { left: 1rem; background: linear-gradient(135deg, #ff5aa0, #7c6bff); box-shadow: 0 6px 20px rgba(255, 90, 160, 0.6); rotate: -8deg; }
.stamp-left { right: 1rem; background: rgba(20, 24, 40, 0.8); border: 1px solid rgba(255, 255, 255, 0.35); rotate: 8deg; }
.stamp-up { left: 50%; background: rgba(255, 210, 122, 0.9); color: #5a3d00; translate: -50% 0; }
@keyframes stamp-in {
  from { opacity: 0; scale: 1.9; }
  to { opacity: 1; scale: 1; }
}

/* A band of light that crosses the card as it flies off */
.swipe-shine {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%);
  animation: shine 0.8s ease-out both;
}
.swipe-shine-left {
  background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.22) 50%, transparent 70%);
  animation-direction: reverse;
}
@keyframes shine {
  from { translate: -100% 0; }
  to { translate: 100% 0; }
}

/* Reactions in the middle of the stage */
.reaction {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: grid;
  place-items: center;
  pointer-events: none;
  overflow: visible;
}
/* Like: sound waves ripple out and music notes float up */
.wave {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 3px solid #ff7ab8;
  box-shadow: 0 0 24px rgba(255, 90, 160, 0.6), inset 0 0 24px rgba(124, 107, 255, 0.4);
  animation: wave-out 1.4s ease-out both;
}
.wave-2 { border-color: #a78bff; animation-delay: 0.2s; }
.wave-3 { border-color: #6cc3ff; animation-delay: 0.4s; }
@keyframes wave-out {
  from { opacity: 0.95; scale: 0.2; }
  to { opacity: 0; scale: 3.2; }
}
.reaction-note {
  position: absolute;
  filter: drop-shadow(0 4px 12px rgba(20, 35, 75, 0.35));
  animation: note-float 1.7s ease-out both;
}
@keyframes note-float {
  0% { opacity: 0; translate: 0 30px; scale: 0.3; rotate: 0deg; }
  20% { opacity: 1; }
  100% { opacity: 0; translate: var(--dx) var(--dy); scale: 1.15; rotate: 24deg; }
}
/* Notes that fall out of the card, swaying like confetti */
.rain-note {
  position: absolute;
  top: -8%;
  filter: drop-shadow(0 3px 8px rgba(20, 35, 75, 0.3));
  animation: note-rain 1.9s ease-in both;
}
@keyframes note-rain {
  0% { opacity: 0; translate: 0 0; rotate: -20deg; scale: 0.5; }
  12% { opacity: 1; scale: 1; }
  35% { translate: var(--sway) 40%; rotate: 20deg; }
  65% { translate: calc(var(--sway) * -1) 85%; rotate: -25deg; }
  100% { opacity: 0; translate: var(--sway) 125%; rotate: 30deg; }
}

/* Like: colourful streaks rush to the right and a heart badge pops */
.like-line {
  position: absolute;
  left: -10%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, #ffc85a, #ff5aa0, #a78bff);
  box-shadow: 0 0 12px rgba(255, 90, 160, 0.6);
  animation: like-rush 0.8s cubic-bezier(0.3, 0, 0.8, 0.4) both;
}
@keyframes like-rush {
  from { opacity: 0; translate: -40% 0; }
  20% { opacity: 1; }
  to { opacity: 0; translate: 140% 0; }
}
.like-badge {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff5aa0, #a78bff);
  border: 2px solid rgba(255, 255, 255, 0.7);
  color: #fff;
  font-size: 2.6rem;
  box-shadow: 0 0 40px rgba(255, 90, 160, 0.7), 0 0 60px rgba(255, 200, 90, 0.4);
  animation: like-badge 0.95s cubic-bezier(0.2, 1.5, 0.4, 1) both;
}
@keyframes like-badge {
  0% { opacity: 0; scale: 0.3; translate: -40px 0; }
  40% { opacity: 1; scale: 1.2; translate: 0 0; }
  60% { scale: 0.95; }
  100% { opacity: 0; scale: 1.3; translate: 60px 0; }
}

/* Skip: light streaks rush past and a skip-track badge flashes */
.skip-line {
  position: absolute;
  right: -10%;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(270deg, transparent, rgba(0, 220, 255, 0.85), rgba(255, 60, 150, 0.85));
  box-shadow: 0 0 12px rgba(0, 220, 255, 0.6);
  animation: skip-rush 0.8s cubic-bezier(0.3, 0, 0.8, 0.4) both;
}
@keyframes skip-rush {
  from { opacity: 0; translate: 40% 0; }
  20% { opacity: 1; }
  to { opacity: 0; translate: -140% 0; }
}
.skip-badge {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(20, 24, 40, 0.78);
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: #fff;
  font-size: 2.6rem;
  backdrop-filter: blur(6px);
  box-shadow: 0 0 40px rgba(0, 220, 255, 0.5), 0 0 40px rgba(255, 60, 150, 0.4);
  animation: skip-badge 0.9s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}
@keyframes skip-badge {
  0% { opacity: 0; scale: 0.3; translate: 40px 0; }
  40% { opacity: 1; scale: 1.1; translate: 0 0; }
  100% { opacity: 0; scale: 1.3; translate: -60px 0; }
}

/* The Like and Skip buttons react to the click */
.action-btn {
  transition: transform 0.15s, box-shadow 0.15s;
}
.like-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 0 0 6px rgba(255, 90, 160, 0.2) !important;
}
.skip-btn:hover:not(:disabled) {
  transform: scale(1.1) rotate(-8deg);
}
.like-btn.is-popping { animation: like-pop 0.55s ease-out; }
.skip-btn.is-popping { animation: skip-shake 0.4s ease-out; }
@keyframes like-pop {
  0% { scale: 1; box-shadow: 0 0 0 0 rgba(255, 90, 160, 0.7); }
  30% { scale: 1.35; box-shadow: 0 0 0 16px rgba(255, 90, 160, 0); }
  60% { scale: 0.92; }
  100% { scale: 1; }
}
@keyframes skip-shake {
  0%, 100% { translate: 0 0; }
  25% { translate: -6px 0; }
  75% { translate: 6px 0; }
}

/* "3 liked" pill under the title: it bounces when the card lands in it */
.liked-slot {
  min-height: 1.6rem;
}
.liked-counter {
  background: #ffe6ee;
  color: #c2185b;
  font-weight: 700;
  animation: counter-land 0.6s ease-out 0.7s backwards;
}
@keyframes counter-land {
  0% { scale: 1; box-shadow: 0 0 0 0 rgba(255, 90, 160, 0.7); }
  40% { scale: 1.18; box-shadow: 0 0 0 12px rgba(255, 90, 160, 0); }
  100% { scale: 1; }
}

/* the skip-the-rest button, bottom right corner of the screen */
.finish-early {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 20;
  padding: 0.55rem 1.1rem;
  border: 1px solid var(--riffle-border);
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  font-weight: 700;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.finish-early:hover:not(:disabled) {
  background: #7c4dff;
  color: #fff;
  transform: translateY(-2px);
}

/* ---- the end-of-batch screen ---- */
.finish {
  display: flex;
  justify-content: center;
  padding: 1.25rem 0 2rem;
}
.finish-card {
  width: min(640px, 100%);
  padding: 2rem 1.75rem;
  border: 1px solid var(--riffle-border);
  border-radius: 1.5rem;
  background:
    radial-gradient(ellipse at 0% 0%, rgba(238, 214, 246, 0.7), transparent 55%),
    radial-gradient(ellipse at 100% 100%, rgba(207, 228, 251, 0.7), transparent 55%),
    #fff;
  box-shadow: 0 18px 50px rgba(20, 35, 75, 0.1);
  text-align: center;
}
.finish-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.6rem;
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  background: #ece9ff;
  color: #5b45c9;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.finish-title {
  margin: 0 0 0.5rem;
  color: var(--riffle-ink);
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 800;
}
.finish-sub {
  margin: 0 auto 1.4rem;
  max-width: 480px;
  color: var(--riffle-muted);
}
.finish-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.finish-stat {
  display: grid;
  gap: 0.1rem;
  padding: 0.8rem 0.5rem;
  border: 1px solid var(--riffle-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--riffle-surface) 85%, transparent);
  color: var(--riffle-muted);
}
.finish-stat i {
  font-size: 1.1rem;
}
.finish-stat strong {
  color: var(--riffle-ink);
  font-size: 1.7rem;
  line-height: 1.1;
}
.finish-stat span {
  font-size: 0.8rem;
  font-weight: 700;
}
.finish-stat-like i {
  color: #e0245e;
}
.finish-stat-like {
  border-color: #ffc9dc;
  background: #fff5f9;
}

/* the genre mix */
.taste-mix {
  margin-bottom: 1.25rem;
}
.taste-mix-bar {
  display: flex;
  gap: 3px;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
}
.taste-mix-bar span {
  flex-basis: 0;
}
.taste-mix-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 1rem;
  margin: 0.6rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.taste-mix-legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 0.25rem;
  border-radius: 50%;
}
.taste-mix-legend b {
  color: var(--riffle-ink);
}

/* the liked artists */
.finish-artists {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.6rem;
  margin-bottom: 1.5rem;
  text-align: left;
}
.finish-artist {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.75rem 0.5rem 0.5rem;
  border: 1px solid var(--riffle-border);
  border-left: 4px solid var(--accent, #ff7ab8);
  border-radius: 0.9rem;
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
  animation: chip-in 0.45s ease-out backwards;
}
.finish-artist:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(20, 35, 75, 0.12);
}
.finish-artist img {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 0.65rem;
  object-fit: cover;
  background: var(--accent, #ccc);
}
.finish-artist-text {
  display: grid;
  min-width: 0;
  flex: 1;
}
.finish-artist-text strong,
.finish-artist-text small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.finish-artist-text small {
  color: var(--riffle-muted);
}
.finish-heart {
  color: #e0245e;
}
@keyframes chip-in {
  from { opacity: 0; translate: 0 14px; scale: 0.95; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}
.finish-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}

/* ---- the artist picture on a card: the cover of their song on a spinning record ---- */
.cover {
  position: absolute;
  top: 15%;
  left: 50%;
  width: 48%;
  aspect-ratio: 1;
  translate: -62% 0;
  z-index: 1;
}
/* the plain artwork behind the cover is softened so the cover stands out */
.backdrop-blur {
  scale: 1.2;
  filter: blur(14px) brightness(0.8) saturate(1.2);
}
.cover-art {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45), 0 0 50px var(--glow, #7c6bff);
}
.cover-record {
  position: absolute;
  top: 6%;
  left: 42%;
  width: 88%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle, #e8e8f0 0 7%, #14172b 8% 16%, transparent 17%),
    repeating-radial-gradient(circle, #0d0f1e 0 2px, #1c2040 3px 4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  animation: record-spin 4s linear infinite;
  animation-play-state: paused;
}
.cover-main .cover-record {
  animation-play-state: running;
}
@keyframes record-spin {
  to { rotate: 360deg; }
}

/* ---- the Not sure yet button ---- */
.unsure-btn {
  position: absolute;
  top: 0.6rem;
  left: 50%;
  translate: -50% 0;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.25rem 0.8rem 0.25rem 0.3rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(20, 24, 40, 0.55);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, scale 0.15s;
}
.unsure-icon {
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd27a, #ff9f5a);
  color: #5a3000;
  font-size: 0.85rem;
}
.unsure-btn:hover:not(:disabled) {
  background: rgba(255, 190, 90, 0.35);
  border-color: #ffd27a;
  scale: 1.06;
}
.unsure-btn:disabled {
  opacity: 0.6;
}
@media (max-width: 575px) {
  .unsure-btn { font-size: 1.5vh; }
  .finish-early { right: 12px; bottom: 12px; width: 44px; height: 44px; padding: 0; }
  .finish-early-text { display: none; }
}

/* Dark see-through box behind the text so it is readable on any image */
.card-info {
  background-color: rgba(0, 0, 0, 0.5);
  font-size: 0.875rem;
  min-height: 0;
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
.collapse-arrow {
  font-size: 1.6rem;
}
.collapse-arrow.collapsed {
  display: none;
}

/* Songs hint */
.songs-hint {
  background-color: color-mix(in srgb, var(--riffle-surface) 15%, transparent);
  border-color: rgba(255, 255, 255, 0.35) !important;
  transition: background-color 0.2s;
}
.songs-hint:hover {
  background-color: color-mix(in srgb, var(--riffle-surface) 28%, transparent);
}
.songs-hint:not(.collapsed) {
  display: none !important;
}
.songs-hint-arrow {
  animation: hint-nudge 2.4s ease-in-out infinite;
}
@keyframes hint-nudge {
  0%, 70%, 100% {
    transform: translateY(0);
  }
  80% {
    transform: translateY(-4px);
  }
  90% {
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .songs-hint-arrow {
    animation: none;
  }
}

/* Skip and follow buttons */
.action-btn {
  width: 64px;
  height: 64px;
  font-size: 24px;
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
