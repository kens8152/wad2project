<script setup>
import { ref, onMounted, computed } from 'vue'
import { getArtists } from '@/services/artistsApi'

const DISPLAY_COUNT = 5;

// List of artists returned by the server
const artists = ref([]);
const current = ref(0);

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


const hasSwipedCards = ref(false);
const artistsFinished = ref(false); // True after users has swiped all cards
const showFinishedMessage = ref(false);

// Different duration variations for cards when they render out all cards have been swiped.
const FLY_UP_DURATIONS = [0.5, 0.3, 0.7, 0.4, 0.6];

// Move every card one slot to the left and bring in the next artist
function nextArtist() {
  if (artistsFinished.value || !artists.value.length) return;

  // Swiped the last artist: end the session instead of moving on
  if (current.value >= artists.value.length - 1) {
    finishSwiping();
    return;
  }

  hasSwipedCards.value = true;
  current.value++;
}

function finishSwiping() {
  artistsFinished.value = true;
  setTimeout(() => {
    showFinishedMessage.value = true;
  }, (FLY_UP_DURATIONS[2] + 0.2)*1000); // Second index is the longest
}

function skip() {
  nextArtist();
}
function follow() {
  nextArtist();
}

onMounted(async () => {
  try {
    artists.value = await getArtists();
  } catch (err) {
    console.error('Could not load artists', err);
  }
})
</script>

<template>
  <div class="container">
    <!-- Header -->
    <div class="text-center mb-2 pt-3">
      <h1 class="fw-bold mb-2">Discover Local Artists</h1>
      <p class="lead text-dark mb-0 fs-6">
        Swipe through artists, listen to a preview, and find new music that matches your taste.
      </p>
    </div>

    <!-- Skip button, artist cards, Follow button.
         On phones the buttons wrap onto a second line below the card. -->
    <div
      v-if="!showFinishedMessage"
      class="d-flex flex-wrap flex-sm-nowrap justify-content-center align-items-center py-4"
    >
      <!-- Skip Btn -->
      <div
        class="action skip-action text-center mt-3 mt-sm-0"
        :class="{ 'fly-up': artistsFinished }"
        :style="{ animationDuration: '0.55s' }"
      >
        <button 
          class="btn btn-light rounded-circle shadow action-btn" aria-label="Skip"
          @click="skip()"
        >
          <i class="bi bi-x-lg text-secondary"></i>
        </button>
        <div class="fw-semibold small mt-2">Skip</div>
      </div>

      <!-- Artist Cards -->
      <div class="card-stage flex-shrink-0 order-first order-sm-0">
        <div
          v-for="slot in displayedArtists.filter(slot => slot.artist)"
          :key="slot.artist.id"
          class="card drop-in text-white border-0 rounded-4 overflow-hidden shadow"
          :style="artistsFinished
            ? { animationDuration: FLY_UP_DURATIONS[slot.offset + 2] + 's', animationDelay: '0s' }
            : { animationDelay: hasSwipedCards ? '0.2s' : (slot.offset + 2) * 0.15 + 's' }"
          :class="{
            'main-card': slot.offset === 0,
            'side-card d-none d-lg-block': Math.abs(slot.offset) === 1,
            'far-card d-none d-xl-block': Math.abs(slot.offset) === 2,
            'left-side': slot.offset < 0,
            'right-side': slot.offset > 0,
            'fly-up': artistsFinished,
          }"
        >
          <template v-if="slot.artist">
            <img :src="slot.artist.image" :alt="slot.artist.name" class="w-100 h-100 object-fit-cover" />

            <!-- Text sits on top of the image, pushed to the bottom of the card -->
            <div class="card-img-overlay d-flex flex-column justify-content-end p-0">
              <!-- Save button on the main card -->
              <button
                v-if="slot.offset === 0"
                class="btn btn-light shadow rounded-circle position-absolute top-0 start-0 m-3"
                aria-label="Save"
              >
                <i class="bi bi-bookmark text-primary"></i>
              </button>

              <!-- Counter on the main card -->
              <span
                v-if="slot.offset === 0"
                class="badge rounded-pill bg-dark bg-opacity-50 position-absolute top-0 end-0 m-3"
              >
                {{ slot.index + 1 }} / {{ artists.length }}
              </span>

              <div class="card-info p-3">
                <!-- Main card: full details -->
                <template v-if="slot.offset === 0">
                  <h3 class="card-title fw-bold mb-0">
                    {{ slot.artist.name }}
                    <i v-if="slot.artist.verified" class="bi bi-patch-check-fill text-primary fs-5"></i>
                  </h3>
                  <p class="mb-2">{{ slot.artist.role }}</p>

                  <!-- Genres -->
                  <div class="d-flex flex-wrap gap-2 mb-3">
                    <span
                      v-for="genre in slot.artist.genres"
                      :key="genre"
                      class="badge rounded-pill border border-light fw-normal"
                    >
                      {{ genre }}
                    </span>
                  </div>

                  <!-- Preview player -->
                  <div class="d-flex align-items-center gap-2 mb-3">
                    <button class="btn btn-light btn-sm rounded-circle">
                      <i class="bi bi-play-fill"></i>
                    </button>
                    <input type="range" class="form-range" min="0" max="30" value="0" />
                    <span class="small text-nowrap">0:00 / 0:30</span>
                    <i class="bi bi-volume-up-fill"></i>
                  </div>

                  <p class="small mb-0">{{ slot.artist.bio }}</p>
                </template>

                <!-- Side cards: name and genres only -->
                <template v-else>
                  <h5 class="card-title fw-bold mb-0">{{ slot.artist.name }}</h5>
                  <p class="small mb-0">{{ slot.artist.genres.slice(0, 2).join(' • ') }}</p>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Follow Btn -->
      <div
        class="action follow-action text-center mt-3 mt-sm-0"
        :class="{ 'fly-up': artistsFinished }"
        :style="{ animationDuration: '0.75s' }"
      >
        <button
          class="btn btn-light rounded-circle shadow action-btn" aria-label="Follow"
          @click="follow()"
        >
          <i class="bi bi-heart-fill text-danger"></i>
        </button>
        <div class="fw-semibold small mt-2">Follow</div>
      </div>
    </div>

    <!-- Shown after every card has flown away -->
    <div v-else class="drop-in text-center py-5">
      <i class="bi bi-stars display-3 text-primary"></i>
      <h2 class="fw-bold mt-3 mb-2">You've swiped through all the artists for today!</h2>
      <p class="text-secondary mb-0">Come back tomorrow for a fresh batch of local artists.</p>
    </div>
  </div>
</template>

<style scoped>
.card-stage {
  position: relative;
  width: 320px;
  height: 460px;
}

.card {
  position: absolute;
  transition: left 0.4s ease, top 0.4s ease, transform 0.4s ease;
}

/* Big card in the middle */
.main-card {
  width: 320px;
  height: 460px;
  left: 0px;
  top: 0px;
  z-index: 3;
}

/* Cards right next to the middle card */
.side-card {
  width: 220px;
  height: 420px;
  top: 28px;
  z-index: 2;
}

/* Cards at the far left and right */
.far-card {
  width: 170px;
  height: 380px;
  top: 64px;
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

/* 3 cards showing (from 992px, matches d-lg-block) */
@media (min-width: 992px) {
  .card-stage {
    width: 460px;
  }
  .side-card.left-side {
    left: 0px;
  }
  .main-card {
    left: 70px;
  }
  .side-card.right-side {
    left: 240px;
  }
}

/* 5 cards showing (from 1200px, matches d-xl-block) */
@media (min-width: 1200px) {
  .card-stage {
    width: 600px;
  }
  .far-card.left-side {
    left: 0px;
  }
  .side-card.left-side {
    left: 70px;
  }
  .main-card {
    left: 140px;
  }
  .side-card.right-side {
    left: 310px;
  }
  .far-card.right-side {
    left: 430px;
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

/* After the last card: the reverse of drop-in. Solid to see-through while moving up.
   It comes after .drop-in so it wins when an element has both classes.
   Each card/button sets its own animation-duration in the template, so they fly at different paces. */
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

/* Dark see-through box behind the text so it is readable on any image */
.card-info {
  background-color: rgba(0, 0, 0, 0.5);
}

/* Skip and follow buttons */
.action-btn {
  width: 64px;
  height: 64px;
  font-size: 24px;
}

/* The Skip / Follow buttons animation */
.action {
  position: relative;
  top: 24px;
}
/* Space between the buttons and the cards.
   The tilted outer cards stick out more on bigger screens, so the gap grows. */
.skip-action {
  margin-right: 16px;
}
.follow-action {
  margin-left: 16px;
}
@media (min-width: 992px) {
  .skip-action {
    margin-right: 46px;
  }
  .follow-action {
    margin-left: 46px;
  }
}
@media (min-width: 1200px) {
  .skip-action {
    margin-right: 66px;
  }
  .follow-action {
    margin-left: 66px;
  }
}
</style>
