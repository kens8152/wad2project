<script setup>
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { supabase } from '@/services/supabase'
import { addSavedArtist, getSavedArtists, removeSavedArtist } from '@/services/matchmakingApi'
import { toast } from '@/composables/useToast'
import WebOfDots from '../../components/discover/WebOfDots.vue'
import { GENRES, formatFans, getGraph, recommendedNodes, tasteSpot } from '../../data/discover/discoverGraph'

// Discover: the web of artists.
//   Everyone can drag, zoom and click the dots.
//   Search, the genre and mood filters, Follow and "Recommended for you" need an account:
//   a guest who tries them gets a small "log in first" notice.

const userStore = useUserStore()
const graph = getGraph()

const pickedId = ref(null)

// panels float over the map on a wide screen and become drawers on a small one
function isWide() {
  return window.innerWidth >= 992
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

// ---- the guide and the recommended list (one of them sits at the top right) ----
const GUIDE_SEEN_KEY = 'riffle.discoverGuideSeen'
function guideAlreadySeen() {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === 'yes'
  } catch {
    return false
  }
}

// 'guide', 'recommended' or ''. The guide starts open for guests and first-time members on a wide screen;
// on a phone it would cover the whole map, so it starts closed there (the Help & tour button opens it).
const rightPanel = ref(window.innerWidth < 992 || (userStore.isLoggedIn && guideAlreadySeen()) ? '' : 'guide')

function openPanel(name) {
  rightPanel.value = rightPanel.value === name ? '' : name
}

function closeGuide() {
  rightPanel.value = ''
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, 'yes')
  } catch {
    // private mode: the guide just opens again next time
  }
}

const guideSteps = [
  { title: 'Click on the dots', text: 'One dot, one artist. Find new artists.' },
  { title: 'Follow the lines', text: 'A line means two artists share an audience, so one band you love leads you to the next.' },
  { title: 'Narrow the search', text: 'Search finds artists only. Use the genre filter to light up one scene at a time.' },
  { title: 'Open anything', text: 'Click a dot for that artist’s page, gigs and more. Recentre resets the whole view.' },
]

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

// sample percentages for the top genres (there is no listening data yet)
const SAMPLE_MATCH = [78, 67, 35]
const tasteChips = computed(() =>
  userGenreIds.value.slice(0, 3).map((genreId, index) => ({
    id: genreId,
    percent: SAMPLE_MATCH[index],
    label: graph.genreById[genreId].label,
    color: graph.genreById[genreId].color,
  }))
)

// ---- following ----
const FOLLOW_KEY = 'riffle.discover.following'
function readFollowing() {
  try {
    const saved = JSON.parse(localStorage.getItem(FOLLOW_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}
const following = ref(readFollowing())

function saveFollowing() {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(following.value))
  } catch {
    // private mode: keep it for this visit only
  }
}

async function loadSavedArtists() {
  if (!userStore.isLoggedIn) return

  try {
    const rows = await getSavedArtists()
    const ids = rows.map(row => row.artist_id)
    const merged = [...following.value]
    for (const id of ids) {
      if (!merged.includes(id)) merged.push(id)
    }
    following.value = merged
  } catch (error) {
    console.warn('Could not load your saved artists:', error)
  }
}

async function toggleFollow(node) {
  if (needsAccount()) return

  const nowFollowing = !following.value.includes(node.id)
  following.value = nowFollowing ? [...following.value, node.id] : following.value.filter(id => id !== node.id)
  saveFollowing()
  toast(nowFollowing ? 'Following ' + node.name : 'Unfollowed ' + node.name)

  // artists with a real page are also saved to your account, so they show up on your profile
  if (!node.real) return
  try {
    if (nowFollowing) await addSavedArtist(node.artistId)
    else await removeSavedArtist(node.artistId)
  } catch (error) {
    // "already saved" is fine
    if (error && error.code === '23505') return
    console.error('Could not update saved artists', error)
    following.value = nowFollowing ? following.value.filter(id => id !== node.id) : [...following.value, node.id]
    saveFollowing()
    toast('Could not update your saved artists. Please try again.')
  }
}

function showRecommended(node) {
  pickedId.value = node.id
  if (!isWide()) rightPanel.value = ''
}

// ---- space the panels cover (the map keeps its dots out of it) ----
const insetLeft = computed(() => (isWide() ? 24 + 270 + 16 : 0))
const insetRight = computed(() => (isWide() && rightPanel.value !== '' ? 24 + 340 + 8 : 0))
const insetBottom = computed(() => (userStore.isLoggedIn && tasteChips.value.length ? 76 : 24))

onMounted(() => {
  loadTaste()
  loadSavedArtists()
})
</script>

<template>
  <div class="discover">
    <WebOfDots
      :dimmed="dimmed"
      :following="following"
      :signed-in="userStore.isLoggedIn"
      :taste-spot="spot"
      :inset-left="insetLeft"
      :inset-right="insetRight"
      :inset-bottom="insetBottom"
      :picked-id="pickedId"
      @pick="pickedId = $event"
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
          <p class="small-title"><i class="bi bi-funnel"></i> Filter by genre</p>
          <div class="genre-pills">
            <button
              v-for="genre in GENRES"
              :key="genre.id"
              type="button"
              class="genre-pill"
              :class="{ 'is-active': !hiddenGenres.includes(genre.id) }"
              :style="!hiddenGenres.includes(genre.id)
                ? { background: genre.color, borderColor: genre.color, color: '#fff' }
                : { borderColor: genre.color, color: genre.color }"
              @click="toggleGenre(genre.id)"
            >
              {{ genre.label }}
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
        <button type="button" class="panel-card pill-button" :class="{ 'is-on': rightPanel === 'guide' }" @click="openPanel('guide')">
          <b>?</b> Help &amp; tour
        </button>
      </div>

      <Transition name="slide" mode="out-in">
        <section v-if="rightPanel === 'guide'" key="guide" class="panel-card guide">
          <button class="guide-close" type="button" aria-label="Close the guide" @click="closeGuide"><i class="bi bi-x-lg"></i></button>
          <p class="small-title">How to read this map</p>
          <h2>Your 4-step guide to the web of dots.</h2>
          <p class="guide-intro">Every dot is an artist playing in Singapore; the lines are the audiences they share.</p>

          <ol class="guide-steps list-unstyled">
            <li v-for="(step, index) in guideSteps" :key="step.title">
              <span class="step-number">{{ index + 1 }}</span>
              <div>
                <strong>{{ step.title }}</strong>
                <p>{{ step.text }}</p>
              </div>
            </li>
          </ol>

          <div v-if="userStore.isLoggedIn" class="guide-footer">
            <button type="button" class="guide-primary" @click="closeGuide">Start exploring</button>
          </div>
          <div v-else class="guide-footer">
            <RouterLink to="/signup" class="guide-primary">Create an account</RouterLink>
            <RouterLink to="/login" class="guide-secondary">Log in</RouterLink>
            <p>Keep browsing as a guest. This guide stays available from the <b>?</b> Help icon on the map.</p>
          </div>
        </section>

        <section v-else-if="rightPanel === 'recommended'" key="recommended" class="panel-card recommended">
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
      <span v-for="chip in tasteChips" :key="chip.id" class="taste-chip">
        <i class="dot" :style="{ background: chip.color }"></i>{{ chip.percent }}% {{ chip.label }}
      </span>
    </div>

  </div>
</template>

<style scoped>
.discover {
  position: relative;
  flex: 1;
  min-height: 560px;
  overflow: hidden;
  color: var(--riffle-ink);
}

.panel-card {
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(20, 35, 90, 0.07);
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
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
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
  background: #eef1fb;
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
  scrollbar-width: thin;
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

.genre-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.genre-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  border: 1.5px solid;
  background: transparent;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, background 0.15s;
}
.genre-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(20, 35, 90, 0.12);
}
.genre-pill small {
  opacity: 0.75;
  font-size: 0.75em;
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
  border: 1px solid #ffc9dc;
  border-radius: 16px;
  background: #fff;
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
  background: #ffe6ee;
  color: #c2185b;
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
  border: 1.5px solid var(--riffle-navy);
  border-radius: 10px;
  color: var(--riffle-navy);
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
}
.nudge-button--primary {
  background: var(--riffle-navy);
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
  background: #f1f3fb;
  transform: translateY(-1px);
}
.pill-button.is-on {
  border-color: var(--riffle-navy);
}

.guide,
.recommended {
  position: relative;
  width: 100%;
  max-height: calc(100vh - var(--navbar-height) - 150px);
  overflow-y: auto;
  padding: 1.3rem 1.4rem;
  box-shadow: 0 14px 40px rgba(20, 35, 90, 0.16);
}
.guide h2,
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
  background: #eef1fb;
  color: var(--riffle-ink);
}
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin: 0;
}
.guide-steps li {
  display: flex;
  gap: 0.8rem;
}
.step-number {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border: 1.5px solid var(--riffle-ink);
  border-radius: 50%;
  font-size: 0.82rem;
  font-weight: 800;
}
.guide-steps strong {
  display: block;
  color: var(--riffle-ink);
}
.guide-steps p {
  margin: 0.1rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.85rem;
  line-height: 1.4;
}
.guide-footer {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.2rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--riffle-border);
}
.guide-footer p {
  margin: 0;
  color: var(--riffle-muted);
  font-size: 0.8rem;
}
.guide-primary,
.guide-secondary {
  display: block;
  padding: 0.75rem 1rem;
  border: 1.5px solid var(--riffle-navy);
  border-radius: 12px;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
  transition: background 0.15s, transform 0.15s;
}
.guide-primary {
  background: var(--riffle-navy);
  color: #fff;
}
.guide-primary:hover {
  background: var(--riffle-navy-soft);
  color: #fff;
  transform: translateY(-1px);
}
.guide-secondary {
  background: #fff;
  color: var(--riffle-navy);
}
.guide-secondary:hover {
  background: #eef1fb;
  color: var(--riffle-navy);
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
  background: #eef1fb;
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
    background: #fff;
    color: var(--riffle-ink);
  }

  .top-right {
    top: 70px;
    right: 12px;
    width: min(340px, calc(100% - 24px));
  }
  .guide,
  .recommended {
    max-height: calc(100vh - var(--navbar-height) - 200px);
  }
  .taste-bar {
    bottom: 70px;
  }
}
@keyframes fade {
  from {
    opacity: 0;
  }
}
</style>
