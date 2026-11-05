<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useTheme } from '@/composables/useTheme'
import { supabase } from '@/services/supabase'
import { useFavouriteArtists } from '@/composables/artists/useFavouriteArtists'
import { toast } from '@/composables/useToast'
import WebOfDots from '../../components/discover/WebOfDots.vue'
import DiscoverTour from '../../components/discover/DiscoverTour.vue'
import { GENRES, formatFans, getGraph, recommendedNodes, tasteSpot } from '../../data/discover/discoverGraph'

// Discover: the web of artists.
//   Everyone can drag, zoom and click the dots.
//   Search, the genre and mood filters, Follow and "Recommended for you" need an account:
//   a guest who tries them gets a small "log in first" notice.

const userStore = useUserStore()
const graph = getGraph()

const pickedId = ref(null)

// panels float over the map on a wide screen and become drawers on a small one
// (the width is a ref, so everything that depends on it follows when the window is resized or the phone is turned)
const screenWidth = ref(window.innerWidth)
function isWide() {
  return screenWidth.value >= 992
}

const resizing = ref(false) // true while the window is being resized: the panels jump to their new place instead of sliding
let resizeDone = null

function onResize() {
  resizing.value = true
  clearTimeout(resizeDone)
  resizeDone = setTimeout(() => (resizing.value = false), 250)
  screenWidth.value = window.innerWidth
  // a side panel only fits on a wide screen
  if (!isWide()) rightPanel.value = ''
}

// ---- filters ----
const hiddenGenres = ref([]) // genres that are unticked
const searchTerm = ref('')
const filtersOpen = ref(false) // the drawer on a small screen

const visibleGenreCount = computed(() => GENRES.length - hiddenGenres.value.length)

function genreCount(genreId) {
  return graph.nodes.filter(node => node.genre === genreId).length
}

// the dots that the filters fade out
const dimmed = computed(() => {
  const result = {}
  const term = searchTerm.value.trim().toLowerCase()

  for (const node of graph.nodes) {
    const hiddenByGenre = hiddenGenres.value.includes(node.genre)
    const hiddenBySearch = term !== '' && !node.name.toLowerCase().includes(term)
    if (hiddenByGenre || hiddenBySearch) result[node.id] = true
  }
  return result
})

const searchResults = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (term === '') return []
  return graph.nodes.filter(node => node.name.toLowerCase().includes(term)).slice(0, 6)
})

const { theme } = useTheme()
const darkMode = computed(() => theme.value === 'dark')

// ---- guests: the "log in first" notice ----
const nudgeOpen = ref(false)
let nudgeTimer = null

function askToLogIn() {
  nudgeOpen.value = true
  clearTimeout(nudgeTimer)
  nudgeTimer = setTimeout(() => (nudgeOpen.value = false), 8000)
}

// returns true when the action may go ahead
function needsAccount() {
  if (userStore.isLoggedIn) return false
  askToLogIn()
  return true
}

function toggleGenre(genreId) {
  if (needsAccount()) return
  const list = hiddenGenres.value
  hiddenGenres.value = list.includes(genreId) ? list.filter(id => id !== genreId) : [...list, genreId]
}

function onSearchFocus(event) {
  if (needsAccount()) event.target.blur()
}

function pickResult(node) {
  searchTerm.value = ''
  filtersOpen.value = false
  pickedId.value = node.id
}

function pickFirstResult() {
  if (searchResults.value.length) pickResult(searchResults.value[0])
}

function clearFilters() {
  hiddenGenres.value = []
  searchTerm.value = ''
}

// ---- the guided tour ----
// The tour starts by itself only for a brand new account, the first time it opens Discover after finishing onboarding
// (onboarding leaves a note for that). Everyone else starts it with the Guide button.
function pendingKey() {
  return 'riffle.discoverGuidePending:' + userStore.user.id
}
function guideIsPending() {
  if (!userStore.isLoggedIn) return false
  try {
    return localStorage.getItem(pendingKey()) === 'yes'
  } catch {
    return false
  }
}
function clearPendingGuide() {
  try {
    localStorage.removeItem(pendingKey())
  } catch {
    // private mode: nothing to clear
  }
}

const tourOpen = ref(false)
const web = ref(null) // the map (it knows where the opened dot and its artists end up)

// the dot the tour opens: the artist with a page whose group of linked artists covers the most genres
function genresAround(node) {
  const genres = new Set([node.genre])
  graph.neighbours[node.index].forEach(index => genres.add(graph.nodes[index].genre))
  return genres.size
}
const tourDot = graph.nodes
  .filter(node => node.real)
  .sort((a, b) => genresAround(b) - genresAround(a) || graph.neighbours[b.index].length - graph.neighbours[a.index].length)[0]

// Is the map's camera still moving? (it moves with a CSS transition)
function cameraSettled() {
  const world = document.querySelector('.web__world')
  return Boolean(world) && world.getAnimations().every(animation => animation.playState !== 'running')
}

// Has the animation of this element run for at least this many milliseconds (or finished)? False while the element is not there yet.
function animationReached(element, milliseconds) {
  if (!element) return false
  return element
    .getAnimations()
    .filter(animation => animation.effect && animation.effect.getTiming().iterations !== Infinity)
    .every(animation => animation.playState === 'finished' || (Number(animation.currentTime) || 0) >= milliseconds)
}

// "changes": the step makes the page open or close the card (and zoom the map), so the spotlight fades out first.
// "ready": when each lit-up part is really there, read from the animations on the screen (not from a timer).
const tourSteps = computed(() => [
  {
    title: 'Find a scene',
    text: userStore.isLoggedIn
      ? 'Search for an artist, or switch genres on and off to light up one scene at a time.'
      : 'Search for an artist, or switch genres on and off to light up one scene at a time. Log in to use them.',
    target: () => (isWide() ? '.filter-card' : '.search-wrap'),
  },
  {
    title: 'Meet a local artist',
    text: 'Every dot is an artist, and a line joins two artists who share fans. Press Next to open this one.',
    target: () => '.web__dots > g:nth-child(' + (tourDot.index + 1) + ') .dot', // the visible circle of that dot
    round: true,
    changes: from => from === 2, // coming back: the card closes and the map zooms out again
    ready: () => cameraSettled(),
  },
  {
    title: 'Take a closer look',
    text: 'Their picture grows and the artists who share their fans appear around it. Follow them or open their artist page from the card.',
    // the artists around the dot are lit up (where they will end up), and so is the card with its buttons
    target: () => [web.value ? web.value.stageBounds() : null, '.web__card.is-open'],
    changes: () => true, // the map zooms in, the artists fly out and the card slides in
    // the spotlight on the artists comes on as soon as the opened artist is popping up (so the lines are drawn inside it),
    // and the spotlight on the card when the card has slid into place
    ready: () => [
      animationReached(document.querySelector('.stage .hero'), 200),
      animationReached(document.querySelector('.web__card.is-open'), 650),
    ],
  },
  userStore.isLoggedIn
    ? {
        title: 'Recommended for you',
        text: 'Open Recommended for you to see artists picked from your taste profile, then follow the ones you like.',
        target: () => '.top-buttons .pill-button:first-child',
        changes: from => from === 2,
        ready: () => cameraSettled(),
      }
    : {
        title: 'Make it yours',
        text: 'Create an account to follow artists and get recommendations based on your taste.',
        target: () => '.nav-signup',
        changes: from => from === 2,
        ready: () => cameraSettled(),
        cta: { label: 'Sign up now →', to: '/signup' },
      },
  {
    title: 'Come back anytime',
    text: 'You can reopen this guide anytime with the Guide button.',
    target: () => '.top-buttons .pill-button:last-child',
  },
])

function startTour() {
  rightPanel.value = ''
  filtersOpen.value = false
  pickedId.value = null
  tourOpen.value = true
}

// the tour opens the dot for its third step and closes it again for the others
function onTourStep(number) {
  pickedId.value = number === 2 ? tourDot.id : null
}

function endTour() {
  tourOpen.value = false
  pickedId.value = null
}

// 'recommended' or '': the list that sits at the top right
const rightPanel = ref('')

function openPanel(name) {
  rightPanel.value = rightPanel.value === name ? '' : name
}

// ---- your taste (signed in) ----
const userGenreIds = ref([])

async function loadTaste() {
  if (!userStore.isLoggedIn) return

  try {
    const { data } = await supabase.from('profiles').select('genres').eq('id', userStore.user.id).maybeSingle()
    if (data && Array.isArray(data.genres)) {
      userGenreIds.value = GENRES.filter(genre => data.genres.some(label => label.toLowerCase() === genre.label.toLowerCase())).map(genre => genre.id)
    }
  } catch (error) {
    console.warn('Could not load your genres:', error)
  }
}

const spot = computed(() => (userStore.isLoggedIn ? tasteSpot(userGenreIds.value) : null))
const recommended = computed(() => recommendedNodes(userGenreIds.value, 6))

// Genre breakdown of saved artists represented in the discovery graph.
const tasteChips = computed(() => {
  const savedArtists = graph.nodes.filter(node => node.real && following.value.includes(node.artistId))

  if (savedArtists.length === 0) return []

  return GENRES.map(genre => {
    const count = savedArtists.filter(artist => artist.genre === genre.id).length

    return {
      id: genre.id,
      percent: Math.round((count / savedArtists.length) * 100),
      label: genre.label,
      color: genre.color,
      count
    }
  })
    .filter(genre => genre.count > 0)
    .sort((a, b) => b.count - a.count)
})

// ---- following: shared with Artists and artist profiles ----
const { favourites: following, toggleFavourite } = useFavouriteArtists()

async function toggleFollow(node) {
  if (needsAccount()) return

  if (!node.real || !node.artistId) {
    toast('This is a demo artist. Saving is available for artists with a profile.')
    return
  }

  await toggleFavourite({ id: node.artistId, name: node.name })
}

// opening a dot: on a screen too narrow for the side panel, the card and the artists around the dot, the side panel makes way
function onPick(id) {
  pickedId.value = id
  if (id !== null && screenWidth.value < 1450) rightPanel.value = ''
}

function showRecommended(node) {
  pickedId.value = node.id
  if (!isWide()) rightPanel.value = ''
}

// ---- space the panels cover (the map keeps its dots out of it) ----
const insetLeft = computed(() => (isWide() ? 24 + 270 + 16 : 0))
const insetRight = computed(() => (isWide() && rightPanel.value !== '' ? 24 + 340 + 8 : 0))
const insetBottom = computed(() => (userStore.isLoggedIn && tasteChips.value.length ? 76 : 24))

let tourStartTimer = null
onMounted(() => {
  loadTaste()
  window.addEventListener('resize', onResize)

  // a brand new account sees the guide once, after the dots have finished appearing
  if (guideIsPending()) {
    clearPendingGuide()
    tourStartTimer = setTimeout(startTour, 1800)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(resizeDone)
  clearTimeout(tourStartTimer)
})
</script>

<template>
  <div class="discover" :class="{ 'has-card': pickedId !== null, 'is-resizing': resizing, 'is-touring-dot': tourOpen && pickedId !== null, 'is-dark': darkMode }">
    <WebOfDots
      ref="web"
      :reduce-effects="tourOpen"
      :dimmed="dimmed"
      :following="following"
      :signed-in="userStore.isLoggedIn"
      :taste-spot="spot"
      :inset-left="insetLeft"
      :inset-right="insetRight"
      :inset-bottom="insetBottom"
      :picked-id="pickedId"
      @pick="onPick"
      @follow="toggleFollow"
      @taste-click="openPanel('recommended')"
    />

    <!-- search -->
    <div class="search-wrap">
      <div class="panel-card search-card">
        <i class="bi bi-search"></i>
        <input
          v-model="searchTerm"
          type="search"
          placeholder="Search artists…"
          aria-label="Search artists"
          autocomplete="off"
          :readonly="!userStore.isLoggedIn"
          @focus="onSearchFocus"
          @keydown.enter="pickFirstResult"
        />
      </div>
      <ul v-if="searchResults.length" class="panel-card search-results list-unstyled">
        <li v-for="node in searchResults" :key="node.id">
          <button type="button" @click="pickResult(node)">
            <i class="dot" :style="{ background: node.color }"></i>
            <span>{{ node.name }}</span>
            <small>{{ formatFans(node.fans) }} fans</small>
          </button>
        </li>
      </ul>
      <button class="filters-button panel-card" type="button" aria-label="Filters and legend" @click="filtersOpen = true">
        <i class="bi bi-sliders"></i>
      </button>
    </div>

    <!-- legend + filters (a drawer on a small screen) -->
    <div v-if="filtersOpen" class="drawer-backdrop" @click="filtersOpen = false"></div>
    <aside class="side-panel" :class="{ 'is-open': filtersOpen }">
      <button class="drawer-close" type="button" aria-label="Close filters" @click="filtersOpen = false">
        <i class="bi bi-x-lg"></i>
      </button>

      <section class="panel-card filter-card">
        <div class="panel-body">
          <div class="filter-head">
            <p class="small-title"><i class="bi bi-funnel"></i> Filter by genre</p>
            <span class="filter-count">{{ visibleGenreCount }}/{{ GENRES.length }} on</span>
          </div>
          <div class="genre-pills">
            <button
              v-for="genre in GENRES"
              :key="genre.id"
              type="button"
              class="genre-pill"
              :class="{ 'is-active': !hiddenGenres.includes(genre.id) }"
              :style="{ '--genre': genre.color }"
              :aria-pressed="!hiddenGenres.includes(genre.id)"
              @click="toggleGenre(genre.id)"
            >
              <i class="genre-pill__dot"></i>
              <span class="genre-pill__name">{{ genre.label }}</span>
              <small>{{ genreCount(genre.id) }}</small>
            </button>
          </div>

          <button v-if="hiddenGenres.length || searchTerm" type="button" class="clear-button" @click="clearFilters">
            <i class="bi bi-arrow-counterclockwise"></i> Clear filters
          </button>
        </div>
      </section>
    </aside>

    <!-- legend bar -->
    <div class="legend-bar panel-card">
      <span class="legend-bar__item"><i class="dot dot--big"></i> Bigger dot = more fans</span>
      <span class="legend-bar__item"><i class="line"></i> Line = shared audience</span>
      <span class="legend-bar__count">{{ graph.nodes.length }} artists · {{ graph.edges.length }} links</span>
    </div>

    <!-- guests: "log in first" -->
    <Transition name="nudge">
      <div v-if="nudgeOpen" class="nudge" role="status">
        <i class="bi bi-lock-fill"></i>
        <div>
          <strong>Log in to use this</strong>
          <p>Search, filters and following are for members. You can still explore the web of dots.</p>
          <div class="nudge-actions">
            <RouterLink to="/signup" class="nudge-button nudge-button--primary">Create an account</RouterLink>
            <RouterLink to="/login" class="nudge-button">Log in</RouterLink>
          </div>
        </div>
        <button type="button" class="nudge-close" aria-label="Close" @click="nudgeOpen = false"><i class="bi bi-x-lg"></i></button>
      </div>
    </Transition>

    <!-- top right: help, recommended, and what they open -->
    <div class="top-right">
      <div class="top-buttons">
        <button v-if="userStore.isLoggedIn" type="button" class="panel-card pill-button" :class="{ 'is-on': rightPanel === 'recommended' }" @click="openPanel('recommended')">
          <i class="bi bi-stars"></i> Recommended for you
        </button>
        <button type="button" class="panel-card pill-button" :class="{ 'is-on': tourOpen }" @click="startTour">
          <i class="bi bi-compass"></i> Guide
        </button>
      </div>

      <Transition name="slide" mode="out-in">
        <section v-if="rightPanel === 'recommended'" key="recommended" class="panel-card recommended">
          <button class="guide-close" type="button" aria-label="Close" @click="rightPanel = ''"><i class="bi bi-x-lg"></i></button>
          <h2>Recommended for you</h2>
          <p class="guide-intro">
            {{ userGenreIds.length ? 'Picked from your taste profile' : 'Popular right now. Finish your taste profile for better picks.' }}
          </p>
          <ul class="recommended-list list-unstyled">
            <li v-for="node in recommended" :key="node.id">
              <button type="button" class="recommended-row" @click="showRecommended(node)">
                <span class="recommended-avatar" :style="{ background: node.color }">{{ node.name.slice(0, 1) }}</span>
                <span class="recommended-text">
                  <strong>{{ node.name }}</strong>
                  <small>{{ graph.genreById[node.genre].label }} · {{ formatFans(node.fans) }} fans</small>
                </span>
                <i class="bi bi-geo-alt"></i>
              </button>
            </li>
          </ul>
        </section>
      </Transition>
    </div>

    <!-- bottom: your taste -->
    <div v-if="userStore.isLoggedIn && tasteChips.length" class="taste-bar panel-card">
      <span class="small text-secondary">Saved artists by genre:</span>
      <span v-for="chip in tasteChips" :key="chip.id" class="taste-chip">
        <i class="dot" :style="{ background: chip.color }"></i>{{ chip.percent }}% {{ chip.label }}
      </span>
    </div>

    <!-- the guided tour -->
    <DiscoverTour v-if="tourOpen" :steps="tourSteps" @step="onTourStep" @finish="endTour" @skip="endTour" />
  </div>
</template>

<style scoped>
.discover {
  --web-bg: #f7f5fc;
  --web-grid: #e2dcf2;
  --web-glow-a: rgba(255, 170, 210, 0.45);
  --web-glow-b: rgba(170, 200, 255, 0.5);
  --web-edge: #666a82;
  --web-halo: #fff;
  --web-hover: rgba(124, 77, 255, 0.07);
  --web-line: #ece8f8;
  --web-panel: rgba(255, 255, 255, 0.9);
  --web-panel-hover: rgba(255, 255, 255, 0.98);
  --web-panel-shadow: 0 4px 16px rgba(60, 40, 140, 0.08);
  --web-pop-shadow: 0 14px 36px rgba(60, 40, 140, 0.16);
  --web-accent-text: #5b34e6;
  --web-pink-text: #c2185b;
  position: relative;
  flex: 1;
  min-height: 560px;
  overflow: hidden;
  color: var(--riffle-ink);
  background: var(--web-bg);
}
.discover.is-dark {
  --riffle-ink: #f1effb;
  --riffle-text: #cfcae6;
  --riffle-muted: #a29cc4;
  --riffle-faint: #77729a;
  --riffle-border: rgba(255, 255, 255, 0.12);
  --riffle-surface: #17142b;
  --riffle-navy: #7c4dff;
  --riffle-navy-soft: #6a3cf0;
  --bs-body-color: var(--riffle-text);
  --bs-secondary-color: var(--riffle-muted);
  --bs-border-color: var(--riffle-border);
  --web-bg: #0b0a14;
  --web-grid: rgba(255, 255, 255, 0.07);
  --web-glow-a: rgba(255, 77, 141, 0.16);
  --web-glow-b: rgba(90, 120, 255, 0.18);
  --web-edge: #8d88ad;
  --web-halo: #0b0a14;
  --web-hover: rgba(255, 255, 255, 0.08);
  --web-line: rgba(255, 255, 255, 0.12);
  --web-panel: rgba(23, 20, 43, 0.85);
  --web-panel-hover: rgba(35, 30, 62, 0.95);
  --web-panel-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  --web-pop-shadow: 0 14px 36px rgba(0, 0, 0, 0.5);
  --web-accent-text: #b9a4ff;
  --web-pink-text: #ff8cbd;
  color-scheme: dark;
}

.panel-card {
  border: 1px solid var(--web-line);
  border-radius: 14px;
  background: var(--web-panel);
  box-shadow: var(--web-panel-shadow);
}
.dot {
  display: inline-block;
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.small-title {
  margin: 0 0 0.5rem;
  color: var(--riffle-muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ---- search ---- */
.search-wrap {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 12;
  width: 270px;
}
.search-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  color: var(--riffle-muted);
}
.search-card:focus-within {
  border-color: var(--riffle-blue);
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.14);
}
.search-card input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--riffle-ink);
}
.search-results {
  margin: 0.4rem 0 0;
  padding: 0.3rem;
  background: var(--riffle-surface);
  animation: pop 0.15s ease;
}
.search-results button {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.6rem;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--riffle-ink);
  font-weight: 600;
  text-align: left;
}
.search-results button:hover {
  background: rgba(124, 77, 255, 0.07);
}
.search-results span {
  flex: 1;
}
.search-results small {
  color: var(--riffle-faint);
}
.filters-button {
  display: none;
}

/* ---- legend and filters ---- */
.side-panel {
  position: absolute;
  top: 84px;
  left: 24px;
  bottom: 24px;
  z-index: 11;
  width: 270px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  padding-bottom: 4px;
}
.drawer-close {
  display: none;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.8rem 1rem;
  border: 0;
  background: transparent;
  color: var(--riffle-ink);
  font-weight: 700;
}
.panel-head span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.panel-body {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--riffle-border);
  padding-top: 0.8rem;
}

.dot--big {
  width: 14px;
  height: 14px;
  background: #5d6076;
}
.line {
  display: inline-block;
  width: 22px;
  height: 2px;
  background: #5d6076;
}

.legend-bar {
  position: fixed;
  bottom: 16px;
  left: 24px;
  z-index: 8;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.6rem 1rem;
  font-size: 0.82rem;
}
.legend-bar__item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--riffle-muted);
}
.legend-bar__count {
  color: var(--riffle-faint);
  font-size: 0.78rem;
  margin-top: 0.2rem;
  padding-top: 0.4rem;
  border-top: 1px solid var(--riffle-border);
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}
.filter-head .small-title {
  margin: 0;
}
.filter-count {
  padding: 0.12rem 0.55rem;
  border-radius: 999px;
  background: var(--riffle-surface-soft);
  color: var(--riffle-navy);
  font-size: 0.72rem;
  font-weight: 800;
}

/* one calm style for every genre: the colour only shows in the little dot, so the box matches the rest of the app */
.genre-pills {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.genre-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--riffle-faint);
  font-size: 0.86rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.12s;
}
.genre-pill:hover {
  background: var(--riffle-surface-soft);
  transform: translateX(2px);
}
.genre-pill__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--genre);
  background: transparent;
  transition: background 0.15s, box-shadow 0.15s;
}
.genre-pill__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.genre-pill small {
  flex: none;
  min-width: 1.6rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--riffle-surface-soft);
  color: var(--riffle-muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
}
.genre-pill.is-active {
  border-color: var(--riffle-border);
  background: var(--riffle-surface-soft);
  color: var(--riffle-ink);
}
.genre-pill.is-active .genre-pill__dot {
  background: var(--genre);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--genre) 22%, transparent);
}

.clear-button {
  margin-top: 1rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--riffle-blue);
  font-size: 0.85rem;
  font-weight: 700;
}
.clear-button:hover {
  text-decoration: underline;
}

/* ---- the "log in first" notice ---- */
.nudge {
  position: absolute;
  top: 24px;
  left: 50%;
  z-index: 30;
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  width: min(420px, calc(100% - 24px));
  padding: 1rem 1.1rem;
  border: 1px solid rgba(255, 77, 141, 0.4);
  border-radius: 16px;
  background: var(--riffle-surface);
  box-shadow: 0 16px 40px rgba(20, 35, 90, 0.22);
  transform: translateX(-50%);
}
.nudge > i {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 77, 141, 0.18);
  color: var(--web-pink-text);
}
.nudge strong {
  color: var(--riffle-ink);
}
.nudge p {
  margin: 0.15rem 0 0.7rem;
  color: var(--riffle-muted);
  font-size: 0.88rem;
}
.nudge-actions {
  display: flex;
  gap: 0.5rem;
}
.nudge-button {
  padding: 0.45rem 0.9rem;
  border: 1.5px solid #7c4dff;
  border-radius: 10px;
  color: var(--riffle-navy);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
}
.nudge-button--primary {
  background: #7c4dff;
  color: #fff;
}
.nudge-close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--riffle-muted);
}
.nudge-enter-active,
.nudge-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.nudge-enter-from,
.nudge-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}

/* ---- top right ---- */
.top-right {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
  width: 340px;
  max-width: calc(100% - 24px);
  pointer-events: none;
}
.top-right > * {
  pointer-events: auto;
}
.top-buttons {
  display: flex;
  gap: 0.6rem;
}
.pill-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 1rem;
  color: var(--riffle-ink);
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
}
.pill-button:hover {
  background: var(--web-panel-hover);
  transform: translateY(-1px);
}
.pill-button.is-on {
  border-color: #7c4dff;
  color: var(--web-accent-text);
}

.recommended {
  position: relative;
  width: 100%;
  max-height: calc(100vh - var(--navbar-height) - 150px);
  overflow-y: auto;
  padding: 1.3rem 1.4rem;
  box-shadow: 0 14px 40px rgba(60, 40, 140, 0.14);
}
.recommended h2 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  line-height: 1.25;
}
.guide-intro {
  margin: 0 0 1rem;
  color: var(--riffle-muted);
  font-size: 0.9rem;
}
.guide-close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
}
.guide-close:hover {
  background: var(--riffle-surface-soft);
  color: var(--riffle-ink);
}
.recommended-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
}
.recommended-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.55rem 0.5rem;
  border: 0;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  transition: background 0.12s, transform 0.12s;
}
.recommended-row:hover {
  background: var(--riffle-surface-soft);
  transform: translateX(2px);
}
.recommended-avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #fff;
  font-weight: 800;
}
.recommended-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.recommended-text strong {
  color: var(--riffle-ink);
}
.recommended-text small {
  color: var(--riffle-muted);
}
.recommended-row > i {
  color: var(--riffle-faint);
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---- bottom ---- */
.taste-bar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  z-index: 9;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 1.1rem;
  max-width: calc(100% - 32px);
  padding: 0.65rem 1.1rem;
  transform: translateX(-50%);
  animation: rise 0.5s ease 0.5s backwards;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translate(-50%, 12px);
  }
}
.taste-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ---- tablets and phones ---- */
@media (max-width: 991.98px) {
  .search-wrap {
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    width: auto;
    padding-right: 0;
  }
  .search-card {
    flex: 1;
    min-width: 0;
  }
  .search-results {
    order: 3;
    flex-basis: 100%;
    margin-top: 0;
  }
  .filters-button {
    display: grid;
    place-items: center;
    width: 46px;
    color: var(--riffle-ink);
    font-size: 1.1rem;
  }

  .side-panel {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1050;
    width: min(320px, 88vw);
    padding: 3.2rem 0.9rem 1rem;
    background: var(--riffle-bg);
    box-shadow: 8px 0 30px rgba(20, 35, 90, 0.2);
    transform: translateX(-105%);
    transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.3, 1);
  }
  .side-panel.is-open {
    transform: translateX(0);
  }
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1045;
    background: rgba(12, 30, 74, 0.35);
    animation: fade 0.2s ease;
  }
  .drawer-close {
    position: absolute;
    top: 0.8rem;
    right: 0.9rem;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: var(--riffle-surface);
    color: var(--riffle-ink);
  }

  .top-right {
    top: 70px;
    right: 12px;
    width: min(340px, calc(100% - 24px));
  }
  .recommended {
    max-height: calc(100vh - var(--navbar-height) - 200px);
  }
  .taste-bar {
    bottom: 70px;
  }
}
/* no sliding or fading of the panels while the window is being resized */
.is-resizing .side-panel,
.is-resizing .top-right,
.is-resizing .top-right *,
.is-resizing .legend-bar,
.is-resizing .taste-bar,
.is-resizing .drawer-backdrop {
  transition: none !important;
  animation: none !important;
}

/* on tablets and phones the legend shrinks to the count, so it never sits under the taste profile bar */
@media (max-width: 991.98px) {
  .legend-bar__item {
    display: none;
  }
  .legend-bar {
    bottom: 16px;
    left: 12px;
  }
  .legend-bar__count {
    margin: 0;
    padding: 0;
    border: 0;
  }
}
/* below 992px (no side panel) the opened artist's card can sit along the bottom, so what lives there steps aside */
@media (max-width: 991.98px) {
  .has-card .legend-bar,
  .has-card .taste-bar {
    display: none;
  }
}
/* "Take a closer look": the genre box, the legend and the taste bar are out of the way, so the tour card never sits on top of them */
.is-touring-dot .side-panel,
.is-touring-dot .legend-bar,
.is-touring-dot .taste-bar {
  visibility: hidden;
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
</style>
