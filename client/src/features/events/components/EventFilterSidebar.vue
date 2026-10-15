<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import RangeSlider from './RangeSlider.vue'
import ArtistAvatar from './ArtistAvatar.vue'
import { useEventFilters, MAX_DISTANCE_KM, WEEK_DAYS } from '../composables/useEventFilters'
import { toast } from '@/composables/useToast'

const emit = defineEmits(['applied'])

const filters = useEventFilters()
const searchInput = ref(null)

function clearSearch() {
  filters.setQuery('')
  searchInput.value?.focus()
}
const { draft, genres, artists, genreCounts, days } = filters

// ---- artists list -----------------------------------------------------------
const COLLAPSED_ARTISTS = 2
const showAllArtists = ref(false)
const visibleArtists = computed(() =>
  showAllArtists.value ? artists.value : artists.value.slice(0, COLLAPSED_ARTISTS),
)
const hiddenArtistCount = computed(() => Math.max(0, artists.value.length - COLLAPSED_ARTISTS))

// ---- sliders ------------------------------------------------------------------
const distanceLabel = computed(() =>
  draft.distance >= MAX_DISTANCE_KM ? `${MAX_DISTANCE_KM}+ km` : `Within ${draft.distance} km`,
)
const distanceTicks = [
  { value: 0, top: '0' },
  { value: 5, top: '5' },
  { value: 10, top: '10' },
  { value: 15, top: '15' },
  { value: MAX_DISTANCE_KM, top: '20+ km' },
]
const dateTicks = computed(() => days.value.map((d) => ({ value: d.index, top: d.dow, bottom: d.num })))

// ---- voice search (Web Speech API, where available) ------------------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const listening = ref(false)
let recognition = null

function toggleVoice() {
  if (!SpeechRecognition) {
    toast('Voice search is not supported in this browser')
    return
  }
  if (listening.value) {
    recognition?.stop()
    return
  }
  recognition = new SpeechRecognition()
  recognition.lang = 'en-SG'
  recognition.interimResults = false
  recognition.onresult = (e) => filters.setQuery(e.results[0][0].transcript)
  recognition.onerror = () => toast('Could not hear that, try again')
  recognition.onend = () => (listening.value = false)
  listening.value = true
  recognition.start()
}
onBeforeUnmount(() => recognition?.abort())

function apply() {
  filters.apply()
  emit('applied')
}

</script>

<template>
  <aside class="filters riffle-card" aria-label="Event filters">
    <!-- Search -->
    <div class="filters__search">
      <i class="bi bi-search" aria-hidden="true"></i>
      <input
        ref="searchInput"
        :value="draft.q"
        type="search"
        placeholder="Search"
        aria-label="Search events, artists or venues"
        @input="filters.setQuery($event.target.value)"
      />
      <button
        v-if="draft.q"
        type="button"
        class="filters__clear"
        aria-label="Clear search"
        @click="clearSearch"
      >
        <i class="bi bi-x-lg"></i>
      </button>
      <button
        type="button"
        class="filters__mic"
        :class="{ 'is-listening': listening }"
        :aria-label="listening ? 'Stop voice search' : 'Search by voice'"
        :aria-pressed="listening"
        @click="toggleVoice"
      >
        <i class="bi bi-mic-fill"></i>
      </button>
    </div>

    <!-- Preferences -->
    <div class="filters__row filters__prefs">
      <label class="d-flex align-items-center gap-2 mb-0" for="pref-toggle">
        <i class="bi bi-heart-fill text-danger"></i>
        <span>Your Preferences</span>
      </label>
      <div class="form-check form-switch m-0">
        <input
          id="pref-toggle"
          v-model="filters.preferencesOn.value"
          class="form-check-input"
          type="checkbox"
          role="switch"
        />
      </div>
    </div>

    <!-- Genre -->
    <section class="filters__group">
      <h2 class="filters__heading">Genre</h2>
      <label v-for="g in genres" :key="g.id" class="filters__option">
        <input
          class="form-check-input"
          type="checkbox"
          :checked="draft.genres.includes(g.id)"
          @change="filters.toggleGenre(g.id)"
        />
        <span class="filters__chip" :style="{ background: g.color }"></span>
        <span class="filters__option-label">{{ g.label }}</span>
        <span class="filters__count">{{ genreCounts[g.id] || 0 }}</span>
      </label>
    </section>

    <!-- Artists -->
    <section class="filters__group">
      <h2 class="filters__heading">Artists</h2>
      <label v-for="a in visibleArtists" :key="a.id" class="filters__option">
        <input
          class="form-check-input"
          type="checkbox"
          :checked="draft.artists.includes(a.id)"
          @change="filters.toggleArtist(a.id)"
        />
        <ArtistAvatar :name="a.name" :hue="a.hue" :size="24" />
        <span class="filters__option-label">{{ a.name }}</span>
        <span class="filters__count">{{ a.eventCount }}</span>
      </label>
      <button
        v-if="hiddenArtistCount"
        type="button"
        class="filters__more"
        :aria-expanded="showAllArtists"
        @click="showAllArtists = !showAllArtists"
      >
        <template v-if="showAllArtists">− Show fewer artists</template>
        <template v-else>+ Show more artists</template>
      </button>
    </section>

    <!-- Distance -->
    <section class="filters__group">
      <div class="filters__slider-head">
        <h2 class="filters__heading">Distance</h2>
        <strong>{{ distanceLabel }}</strong>
      </div>
      <RangeSlider
        v-model="draft.distance"
        :min="0"
        :max="MAX_DISTANCE_KM"
        :ticks="distanceTicks"
        label="Maximum distance in kilometres"
        :value-text="distanceLabel"
      />
    </section>

    <!-- Date -->
    <section class="filters__group">
      <div class="filters__slider-head">
        <h2 class="filters__heading">Date</h2>
        <strong>{{ filters.dayRangeLabel(draft.day) }}</strong>
      </div>
      <RangeSlider
        v-model="draft.day"
        :min="0"
        :max="WEEK_DAYS - 1"
        :ticks="dateTicks"
        label="Show events up to"
        :value-text="filters.dayRangeLabel(draft.day)"
      />
    </section>

    <!-- Stays at the bottom of the sidebar so Apply never needs scrolling -->
    <div class="filters__footer">
      <button type="button" class="btn btn-riffle filters__apply" :class="{ 'is-dirty': filters.isDirty.value }" @click="apply">
        <span v-if="filters.isDirty.value" class="filters__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        {{ filters.isDirty.value ? 'Apply changes' : 'Apply filters' }}
      </button>
      <button type="button" class="filters__reset" @click="filters.reset()">Reset filters</button>
    </div>
  </aside>
</template>

<style scoped>
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
  -webkit-appearance: none; /* the browser's own cross is replaced by the button below */
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
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.filters__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}
.filters__clear:active {
  transform: scale(0.92);
}
.filters__mic {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
}
.filters__mic:hover {
  background: #e0e4f3;
}
.filters__mic.is-listening {
  background: var(--riffle-coral);
  color: #fff;
  animation: pulse 1.2s infinite;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 0 8px rgba(240, 72, 62, 0.15);
  }
}

.filters__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filters__prefs {
  margin: 0.45rem 0 0.05rem;
  padding: 0.35rem 0;
  border-top: 1px solid var(--riffle-border);
  border-bottom: 1px solid var(--riffle-border);
  font-weight: 700;
  color: var(--riffle-ink);
}
.filters__prefs .form-check-input {
  width: 3em;
  height: 1.55em;
  cursor: pointer;
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

.filters__more {
  margin-top: 0.3rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--riffle-blue);
  font-size: 0.9rem;
  font-weight: 500;
}
.filters__more:hover {
  text-decoration: underline;
}

.filters__slider-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.filters__slider-head strong {
  font-size: 0.85rem;
  color: var(--riffle-ink);
}

.filters__footer {
  position: sticky;
  bottom: -0.75rem; /* flush with the bottom of the card, so nothing shows underneath */
  z-index: 5;
  margin: auto -1rem -0.75rem; /* when the sidebar is taller than its content, Apply sits at the bottom */
  padding: 0.5rem 1rem 0.45rem;
  background: #fff;
  border-top: 1px solid var(--riffle-border);
  border-radius: 0 0 var(--riffle-radius) var(--riffle-radius);
  box-shadow: 0 -8px 16px rgba(20, 35, 90, 0.05);
}
.filters__apply {
  position: relative;
  width: 100%;
  padding: 0.55rem;
  font-size: 1rem;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
}
/* Unapplied changes: the button lights up electric blue, with a little music equalizer */
.filters__apply.is-dirty {
  background: linear-gradient(135deg, #1b3fbf 0%, #2f7bff 60%, #22c1e8 100%);
  animation: apply-pulse 1.6s ease-in-out infinite;
}
.filters__apply.is-dirty:hover {
  background: linear-gradient(135deg, #1535a8 0%, #2a6cf0 60%, #14b3dc 100%);
  transform: translateY(-1px);
}
.filters__apply:active {
  transform: translateY(1px) scale(0.99);
}
@keyframes apply-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(47, 123, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(47, 123, 255, 0);
  }
}

.filters__eq {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  margin-right: 0.5rem;
  vertical-align: -2px;
}
.filters__eq i {
  display: block;
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: #fff;
  transform-origin: bottom;
  animation: eq-bounce 0.9s ease-in-out infinite;
}
.filters__eq i:nth-child(2) {
  animation-delay: -0.3s;
}
.filters__eq i:nth-child(3) {
  animation-delay: -0.6s;
}
.filters__eq i:nth-child(4) {
  animation-delay: -0.15s;
}
@keyframes eq-bounce {
  0%,
  100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.filters__reset {
  display: block;
  margin: 0.15rem auto 0;
  padding: 0.15rem 0.7rem;
  border: 0;
  background: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: #dc2626; /* standard destructive red */
  transition: color 0.15s;
}
.filters__reset:hover {
  color: #b91c1c;
  text-decoration: underline;
}

/* short browser windows: squeeze a bit more so the whole panel is visible */
@media (max-height: 820px) {
  .filters__option {
    padding: 0.03rem 0;
  }
  .filters__group {
    padding-top: 0.35rem;
  }
  .filters__prefs {
    padding: 0.25rem 0;
  }
}
</style>
