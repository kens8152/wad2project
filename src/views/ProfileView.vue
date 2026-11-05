<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

import { useRouter, useRoute } from 'vue-router'

import { useUserStore } from '@/stores/user.js'
import { useNotificationsStore } from '@/stores/notifications'
import LoginPrompt from '@/components/layout/LoginPrompt.vue'
import ArtistAvatar from '@/components/events/ArtistAvatar.vue'

import { getFollowedArtists, getArtistDetails, getLikedArtistIds, removeLikedArtist, resetMatchmaking } from '@/services/matchmakingApi'
import { useFavouriteArtists } from '@/composables/artists/useFavouriteArtists'
import { useEventsData } from '@/composables/events/useEventsData'
import { useSavedEvents } from '@/composables/events/useSavedEvents'
import { dowUpper, monthShort } from '@/utils/events/date'
import { formatDistance } from '@/utils/events/geo'
import { toast } from '@/composables/useToast'

import { supabase } from '@/services/supabase.js'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const notifications = useNotificationsStore()
const { favourites, loadFavourites, toggleFavourite } = useFavouriteArtists()


const genres = [
  'Indie Rock',
  'Pop Music',
  'Contemporary Mandopop',
  'Electronic',
  'Hip-hop',
  'Traditional Ethnic Music'
]

const profile = ref(null)
const loadingProfile = ref(true) // true until the saved profile has been fetched, so the page never flashes the wrong screen


const errorMessage = ref('')
const successMessage = ref('')

// ---- the new profile page: followed artists, saved events, tabs ------------------------
// matchmaking links here with ?tab=liked
const activeTab = ref(route.query.tab === 'liked' ? 'liked' : 'artists')
const followedArtists = ref([])
const likedArtists = ref([])
const joinedLabel = ref('')

const { events: allEvents, load: loadEvents } = useEventsData()
const { savedIds } = useSavedEvents()

// events you have saved, soonest first
const savedEvents = computed(() => {
  const list = allEvents.value.filter(event => savedIds.value.includes(event.id))
  return list.sort((a, b) => a.startsAt - b.startsAt)
})

const songList = computed(() => {
  if (!profile.value || !profile.value.favouriteSongs) return []
  return profile.value.favouriteSongs.split('\n').filter(line => line.trim())
})

const genreTags = computed(() => {
  if (!profile.value) return []
  return profile.value.genres.map(genre => '#' + genre.toLowerCase().replace(/\s+/g, '-'))
})
const showAllTags = ref(false)
const shownTags = computed(() => (showAllTags.value ? genreTags.value : genreTags.value.slice(0, 3)))

const handle = computed(() => '@' + userStore.user.name.toLowerCase().replace(/[^a-z0-9]/g, ''))

const stats = computed(() => [
  { value: followedArtists.value.length, label: 'Following', icon: 'bi-person-heart', color: '#ff4d8d' },
  { value: savedEvents.value.length, label: 'Saved events', icon: 'bi-calendar-heart', color: '#1f6feb' },
  { value: songList.value.length, label: 'Favourite songs', icon: 'bi-music-note-list', color: '#0f9d8a' },
  { value: profile.value ? profile.value.genres.length : 0, label: 'Genres', icon: 'bi-vinyl', color: '#9b2fd6' }
])

const tabs = computed(() => [
  { key: 'artists', label: 'Artists', count: followedArtists.value.length, color: '#f0452f' },
  { key: 'liked', label: 'Liked', count: likedArtists.value.length, color: '#f0529c' },
  { key: 'events', label: 'Events', count: savedEvents.value.length, color: '#1f6feb' },
  { key: 'songs', label: 'Songs', count: songList.value.length, color: '#0f9d8a' },
  { key: 'taste', label: 'Taste', count: profile.value ? profile.value.genres.length : 0, color: '#9b2fd6' }
])

// the colour of the currently selected tab, used to tint the active pill
const activeTabColor = computed(() => {
  const found = tabs.value.find(tab => tab.key === activeTab.value)
  return found ? found.color : 'var(--riffle-coral)'
})

// ---- flowing tab slider ------------------------------------------------
// A single pill sits behind the tabs and glides to the active one. We measure
// the active button and move the pill with a transform, so the browser can
// animate it smoothly (and it stays interruptible if you click fast).
const tabBar = ref(null)
const tabButtons = ref([])
const sliderRect = ref({ x: 0, w: 0, ready: false })

const sliderStyle = computed(() => {
  if (!sliderRect.value.ready) return { opacity: 0 }
  return {
    opacity: 1,
    width: sliderRect.value.w + 'px',
    transform: 'translateX(' + sliderRect.value.x + 'px)',
  }
})

function measureSlider() {
  const index = tabs.value.findIndex(tab => tab.key === activeTab.value)
  const el = tabButtons.value[index]
  if (!el || !tabBar.value) return
  sliderRect.value = { x: el.offsetLeft, w: el.offsetWidth, ready: true }
}

// re-measure when the active tab changes, after the DOM updates
watch(activeTab, () => nextTick(measureSlider))
// counts can change the label width (e.g. "Artists 0" -> "Artists 3")
watch(tabs, () => nextTick(measureSlider), { deep: true })

function onResize() {
  measureSlider()
}
onMounted(() => {
  nextTick(measureSlider)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// the latest few notifications
const recentActivity = computed(() => notifications.list.slice(0, 4))

function hueFor(name) {
  let total = 0
  for (let i = 0; i < name.length; i++) {
    total = total + name.charCodeAt(i) * (i + 1)
  }
  return total % 360
}

// "Song name — Artist" -> two parts
function splitSong(line) {
  const parts = line.split(' — ')
  return { title: parts[0], artist: parts.slice(1).join(' — ') }
}

async function loadFollowedArtists() {
  try {
    const rows = await getFollowedArtists()
    const details = await getArtistDetails(rows.map(row => row.artist_id), [])
    followedArtists.value = details
  } catch (error) {
    console.error('Could not load followed artists', error)
  }
}

// artists you liked while swiping in matchmaking
async function loadLikedArtists() {
  try {
    const ids = await getLikedArtistIds()
    likedArtists.value = await getArtistDetails(ids, [])
  } catch (error) {
    console.error('Could not load liked artists', error)
  }
}

// ---- reset taste profile (asks for a confirmation first) ----
const showReset = ref(false)
const resetSure = ref(false) // the "I understand" tick box
const resetting = ref(false)

function openReset() {
  resetSure.value = false
  showReset.value = true
}

async function confirmReset() {
  if (!resetSure.value || resetting.value) return
  resetting.value = true
  try {
    await resetMatchmaking()
    likedArtists.value = []
    showReset.value = false
    toast('Your taste profile was reset. Matchmaking starts fresh.')
  } catch (error) {
    console.error('Could not reset the taste profile', error)
    toast('Could not reset your taste profile. Please try again.')
  } finally {
    resetting.value = false
  }
}

// the artist being removed right now (its button is disabled meanwhile)
const removingId = ref('')

async function unlikeArtist(artist) {
  removingId.value = artist.id
  try {
    await removeLikedArtist(artist.id)
    await loadLikedArtists()
    toast('Removed ' + artist.name + ' from your liked artists')
  } catch (error) {
    console.error('Could not remove the liked artist', error)
    toast('Could not update your liked artists. Please try again.')
  } finally {
    removingId.value = ''
  }
}

async function unfollowArtist(artist) {
  try {
    await loadFavourites()

    if (favourites.value.includes(artist.id)) {
      await toggleFavourite(artist)
    }

    await loadFollowedArtists()
  } catch (error) {
    console.error('Could not refresh followed artists:', error)
    toast('Could not refresh the artists you follow. Please try again.')
  }
}

// "Joined October 2026" comes from when the account was created
async function loadJoinDate() {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const created = sessionData.session && sessionData.session.user.created_at
    if (created) {
      joinedLabel.value = 'Joined ' + new Date(created).toLocaleDateString([], { month: 'long', year: 'numeric' })
    }
  } catch (error) {
    console.warn('Could not read the join date:', error)
  }
}

// Load preferences saved during onboarding
onMounted(async () => {
  if (!userStore.isLoggedIn) return

  loadEvents()
  loadFollowedArtists()
  loadLikedArtists()
  loadJoinDate()

  try {
    const { data, error } = await supabase.from('profiles').select('display_name, genres, favourite_songs').eq('id', userStore.user.id).maybeSingle()

    if (error) throw error

    if (data) {
      profile.value = {
        displayName: data.display_name || '',
        genres: Array.isArray(data.genres) ? genres.filter(genre => data.genres.includes(genre)) : [],
        favouriteSongs: data.favourite_songs || ''
      }

      userStore.updateDisplayName(profile.value.displayName)
    }
  } catch (error) {
    errorMessage.value = 'Your preferences could not be loaded: ' + error.message
  } finally {
    loadingProfile.value = false
  }

})

// Copy saved preferences into the editing form
function startEditing() {
  router.push('/onboarding')
}

</script>

<template>
  <main v-if="userStore.isLoggedIn" class="profile-page container-xxl">
    <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>

    <!-- waiting for the saved profile -->
    <section v-if="loadingProfile" class="profile-box text-center">
      <p class="mb-0">Loading your profile…</p>
    </section>

    <!-- No saved onboarding preferences -->
    <section v-else-if="!profile" class="profile-box text-center">
      <h2>Build your taste profile</h2>
      <p>Choose your favourite genres and songs to get started.</p>
      <RouterLink to="/onboarding" class="profile-button">Start onboarding</RouterLink>
    </section>

    <template v-else>
      <!-- ============ view your profile ============ -->
      <div class="profile-content">
        <section class="masthead">
          <span class="masthead__eyebrow"><i class="dot"></i> Your profile</span>

          <div class="masthead__top">
            <span class="masthead__avatar">{{ userStore.user.initials }}</span>
            <div class="masthead__id">
              <h1 class="masthead__name">{{ profile.displayName }}</h1>
              <p class="masthead__meta">
                <span class="masthead__handle">{{ handle }}</span>
                <span class="masthead__sep">/</span>{{ userStore.user.location.label }}<template v-if="joinedLabel"><span class="masthead__sep">/</span>{{ joinedLabel }}</template>
              </p>
              <div class="masthead__tags">
                <span v-for="tag in shownTags" :key="tag" class="chip">{{ tag }}</span>
                <button v-if="genreTags.length > 3" type="button" class="chip chip--button" @click="showAllTags = !showAllTags">
                  {{ showAllTags ? 'Show less' : '+' + (genreTags.length - 3) + ' more' }}
                </button>
              </div>
            </div>
            <button class="masthead__edit" type="button" @click="startEditing"><i class="bi bi-pencil"></i> Edit profile</button>
          </div>

          <!-- stats folded in as a liner-notes spec strip -->
          <dl class="spec-strip">
            <div v-for="stat in stats" :key="stat.label" class="spec" :style="{ '--accent': stat.color }">
              <dt>{{ stat.label }}</dt>
              <dd><i class="bi" :class="stat.icon"></i>{{ stat.value }}</dd>
            </div>
          </dl>
        </section>

        <div class="row g-4">
          <section class="col-12 col-lg-8">
            <nav ref="tabBar" class="tab-bar" role="tablist" aria-label="Your profile" :style="{ '--tab': activeTabColor }">
              <!-- the flowing pill that glides behind the active tab -->
              <span class="tab-slider" :style="sliderStyle" aria-hidden="true"></span>
              <button
                v-for="tab in tabs"
                :key="tab.key"
                ref="tabButtons"
                type="button"
                role="tab"
                class="tab-button"
                :class="{ 'is-active': activeTab === tab.key }"
                :aria-selected="activeTab === tab.key"
                @click="activeTab = tab.key"
              >
                {{ tab.label }} <span class="tab-count">{{ tab.count }}</span>
              </button>
            </nav>

            <!-- followed artists -->
            <div v-if="activeTab === 'artists'" class="tab-panel">
              <div class="panel-head">
                <p class="panel-note">Artists you follow</p>
                <RouterLink :to="{ name: 'saved-artists' }" class="panel-link">
                  <i class="bi bi-bookmark"></i> Saved artists <i class="bi bi-chevron-right"></i>
                </RouterLink>
              </div>
              <div v-if="followedArtists.length" class="artist-grid">
                <article v-for="artist in followedArtists" :key="artist.id" class="artist-tile" :style="{ '--accent': artist.genreColor }">
                  <RouterLink :to="'/artists/' + artist.id" class="artist-link">
                    <ArtistAvatar :name="artist.name" :image="artist.image" :size="52" />
                    <span>
                      <strong>{{ artist.name }}</strong>
                      <small>{{ artist.genre }}</small>
                    </span>
                  </RouterLink>
                  <button type="button" class="heart-button" :aria-label="'Unfollow ' + artist.name" @click="unfollowArtist(artist)">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                  <span v-if="artist.tag" class="tag">#{{ artist.tag }}</span>
                </article>
              </div>
              <div v-else class="empty-panel">
                <i class="bi bi-person-heart"></i>
                <p>You are not following any artists yet.</p>
                <RouterLink to="/matchmaking" class="profile-button">Find artists</RouterLink>
              </div>
            </div>

            <!-- artists liked in matchmaking -->
            <div v-else-if="activeTab === 'liked'" class="tab-panel">
              <div class="panel-head">
                <p class="panel-note liked-intro">
                  <template v-if="likedArtists.length"><i class="bi bi-stars"></i> These artists are shaping your taste profile.</template>
                  <template v-else>Artists you liked in matchmaking</template>
                </p>
                <RouterLink :to="{ name: 'match-history' }" class="panel-link">
                  <i class="bi bi-clock-history"></i> Matchmaking history <i class="bi bi-chevron-right"></i>
                </RouterLink>
              </div>
              <div v-if="likedArtists.length" class="artist-grid">
                <article v-for="artist in likedArtists" :key="artist.id" class="artist-tile liked-tile" :style="{ '--accent': artist.genreColor }">
                  <RouterLink :to="'/artists/' + artist.id" class="artist-link">
                    <ArtistAvatar :name="artist.name" :image="artist.image" :size="52" />
                    <span>
                      <strong>{{ artist.name }}</strong>
                      <small>{{ artist.genre }}</small>
                    </span>
                  </RouterLink>
                  <div class="liked-footer">
                    <span v-if="artist.tag" class="tag">#{{ artist.tag }}</span>
                    <button type="button" class="unlike-button" :disabled="removingId === artist.id" :aria-label="'Remove ' + artist.name + ' from liked artists'" @click="unlikeArtist(artist)">
                      <i class="bi bi-heartbreak"></i> {{ removingId === artist.id ? 'Removing…' : 'Remove' }}
                    </button>
                  </div>
                </article>
              </div>
              <div v-else class="empty-panel">
                <i class="bi bi-balloon-heart"></i>
                <p>No liked artists yet. Swipe through matchmaking and tap Like on the ones you love.</p>
                <RouterLink to="/matchmaking" class="profile-button">Start matchmaking</RouterLink>
              </div>

              <div class="danger-zone">
                <div>
                  <strong><i class="bi bi-exclamation-triangle-fill"></i> Danger zone</strong>
                  <p>Erase your liked artists and all of your matchmaking history, and start from the beginning.</p>
                </div>
                <button type="button" class="reset-button" @click="openReset">
                  <i class="bi bi-arrow-counterclockwise"></i> Reset taste profile
                </button>
              </div>
            </div>

            <!-- saved events -->
            <div v-else-if="activeTab === 'events'" class="tab-panel">
              <ul v-if="savedEvents.length" class="row-list list-unstyled">
                <li v-for="event in savedEvents" :key="event.id">
                  <RouterLink :to="{ name: 'event-detail', params: { id: event.id } }" class="event-row" :style="{ '--accent': event.genre.color }">
                    <span class="date-box">{{ dowUpper(event.startsAt) }}<strong>{{ event.startsAt.getDate() }}</strong><small>{{ monthShort(event.startsAt) }}</small></span>
                    <span class="row-text">
                      <strong>{{ event.title }}</strong>
                      <small>{{ event.venue.label }} · {{ formatDistance(event.distanceKm) }} · {{ event.timeLabel }}</small>
                    </span>
                    <i class="bi bi-chevron-right row-arrow"></i>
                  </RouterLink>
                </li>
              </ul>
              <div v-else class="empty-panel">
                <i class="bi bi-calendar-heart"></i>
                <p>No saved events yet. Tap the heart on an event to keep it here.</p>
                <RouterLink to="/events/list" class="profile-button">Browse events</RouterLink>
              </div>
            </div>

            <!-- favourite songs -->
            <div v-else-if="activeTab === 'songs'" class="tab-panel">
              <ol v-if="songList.length" class="song-rows list-unstyled">
                <li v-for="(line, index) in songList" :key="index">
                  <span class="song-number">{{ index + 1 }}</span>
                  <span class="row-text">
                    <strong>{{ splitSong(line).title }}</strong>
                    <small>{{ splitSong(line).artist }}</small>
                  </span>
                </li>
              </ol>
              <div v-else class="empty-panel">
                <i class="bi bi-music-note-list"></i>
                <p>No favourite songs added yet.</p>
                <button class="profile-button" type="button" @click="startEditing">Add songs</button>
              </div>
            </div>

            <!-- taste profile -->
            <div v-else class="tab-panel">
              <h3 class="panel-title">Your favourite genres</h3>
              <div class="genre-tags">
                <span v-for="genre in profile.genres" :key="genre" class="genre-tag">{{ genre }}</span>
              </div>
              <div class="taste-actions">
                <RouterLink to="/discover" class="profile-button">Explore your web of artists</RouterLink>
                <RouterLink to="/onboarding" class="cancel-button">Edit taste profile</RouterLink>
              </div>
            </div>
          </section>

          <aside class="col-12 col-lg-4">
            <section class="side-card">
              <h2>Recent activity</h2>
              <ul class="list-unstyled">
                <li v-if="!recentActivity.length" class="text-body-secondary small py-2">No activity yet.</li>
                <li v-for="item in recentActivity" :key="item.id">
                  <RouterLink :to="item.to" class="activity-row">
                    <ArtistAvatar v-if="item.who" :name="item.who" :hue="hueFor(item.who)" :size="34" />
                    <span v-else class="activity-icon"><i class="bi bi-stars"></i></span>
                    <span class="activity-text"><b v-if="item.who">{{ item.who }}</b> {{ item.text }}</span>
                    <small>{{ item.time.replace(' ago', '') }}</small>
                  </RouterLink>
                </li>
              </ul>
              <RouterLink to="/notifications" class="manage-link">See all notifications <i class="bi bi-arrow-right"></i></RouterLink>
            </section>

            <section class="side-card">
              <h2>Your next events</h2>
              <ul v-if="savedEvents.length" class="list-unstyled">
                <li v-for="event in savedEvents.slice(0, 3)" :key="event.id">
                  <RouterLink :to="{ name: 'event-detail', params: { id: event.id } }" class="next-row">
                    <span class="mini-date">{{ dowUpper(event.startsAt) }}</span>
                    <span class="next-title">{{ event.title }}</span>
                    <small>{{ formatDistance(event.distanceKm) }}</small>
                  </RouterLink>
                </li>
              </ul>
              <p v-else class="side-empty">Save an event and it will show up here.</p>
              <RouterLink to="/events" class="manage-link">Find events near you <i class="bi bi-arrow-right"></i></RouterLink>
            </section>
          </aside>
        </div>
      </div>

    </template>

    <Teleport to="body">
      <Transition name="reset-fade">
        <div v-if="showReset" class="reset-backdrop" @click.self="showReset = false">
          <div class="reset-dialog" role="alertdialog" aria-labelledby="reset-title" aria-describedby="reset-text">
            <span class="reset-icon"><i class="bi bi-exclamation-triangle-fill"></i></span>
            <h2 id="reset-title">Reset your taste profile?</h2>
            <p id="reset-text">This will permanently erase your taste profile from Riffle:</p>
            <ul>
              <li>All of your <b>liked artists</b> are removed</li>
              <li>All <b>matchmaking history</b> (likes, skips and today's artists) is deleted</li>
              <li>Matchmaking will start again as if you had never used it</li>
            </ul>
            <p class="reset-keep">Your saved artists, saved events, favourite songs and account stay as they are. <b>This cannot be undone.</b></p>

            <label class="reset-check">
              <input v-model="resetSure" type="checkbox" />
              I understand my taste profile will be erased
            </label>

            <div class="reset-actions">
              <button type="button" class="reset-cancel" :disabled="resetting" @click="showReset = false">Keep my taste profile</button>
              <button type="button" class="reset-confirm" :disabled="!resetSure || resetting" @click="confirmReset">
                {{ resetting ? 'Erasing…' : 'Yes, erase it' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </main>
  <LoginPrompt v-else />
</template>


<style scoped>
.profile-page {
  padding-top: 1.75rem;
  padding-bottom: 3rem;
  color: var(--riffle-ink);
}

/* ---- masthead: an editorial header on a graph-paper field ---- */
.masthead {
  position: relative;
  margin-bottom: 1.5rem;
  padding: 1.6rem 1.8rem 1.4rem;
  overflow: hidden;
  border: 1px solid var(--riffle-border);
  border-radius: 22px;
  background:
    radial-gradient(var(--riffle-dots) 1.1px, transparent 1.1px) 0 0 / 22px 22px,
    radial-gradient(120% 140% at 100% 0%, rgba(255, 77, 141, 0.1), transparent 55%),
    radial-gradient(120% 140% at 0% 100%, rgba(124, 77, 255, 0.1), transparent 55%),
    var(--riffle-surface);
  box-shadow: var(--riffle-shadow-sm);
}
.masthead__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 1.1rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--riffle-muted);
}
.masthead__eyebrow .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4d8d, #7c4dff);
}
.masthead__top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.25rem;
}
.masthead__avatar {
  display: grid;
  place-items: center;
  flex: none;
  width: 92px;
  height: 92px;
  border-radius: 24px;
  transform: rotate(-3deg);
  background: linear-gradient(135deg, #ff4d8d, #7c4dff);
  color: #fff;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  box-shadow: 0 12px 28px rgba(124, 77, 255, 0.35);
}
.masthead__id {
  flex: 1;
  min-width: 220px;
}
.masthead__name {
  margin: 0;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--riffle-ink);
}
.masthead__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin: 0.55rem 0 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--riffle-muted);
}
.masthead__handle {
  color: var(--riffle-blue);
  font-weight: 800;
}
.masthead__sep {
  color: var(--riffle-faint);
}
.masthead__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.9rem;
}
.masthead__edit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.1rem;
  border: 1.5px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  font-weight: 800;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, box-shadow 0.2s;
}
.masthead__edit:hover {
  transform: translateY(-2px);
  border-color: #7c4dff;
  box-shadow: 0 10px 22px rgba(124, 77, 255, 0.25);
}

/* chips (genre tags in the masthead) */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.85rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-text);
  font-size: 0.8rem;
  font-weight: 700;
}
.chip--button {
  cursor: pointer;
  color: var(--riffle-blue);
  border-color: color-mix(in srgb, var(--riffle-blue) 40%, var(--riffle-border));
}

/* ---- spec strip: the four stats as a liner-notes credit line ---- */
.spec-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin: 1.5rem 0 0;
  padding: 0;
  border: 1px solid var(--riffle-border);
  border-radius: 16px;
  overflow: hidden;
  background: var(--riffle-surface);
}
.spec {
  position: relative;
  padding: 0.95rem 1.1rem;
  border-left: 1px solid var(--riffle-border);
}
.spec:first-child {
  border-left: 0;
}
.spec dt {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--riffle-muted);
}
.spec dd {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.3rem 0 0;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--riffle-ink);
}
.spec dd .bi {
  font-size: 1rem;
  color: var(--accent);
}

@media (max-width: 575.98px) {
  .spec-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .spec:nth-child(3) {
    border-left: 0;
  }
  .spec:nth-child(n + 3) {
    border-top: 1px solid var(--riffle-border);
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.8rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-muted);
  font-size: 0.82rem;
  font-weight: 600;
}
.tag--button {
  cursor: pointer;
}
.tag--button:hover {
  border-color: var(--riffle-faint);
  color: var(--riffle-ink);
}

/* ---- tabs: a segmented pill control ---- */
.tab-bar {
  position: relative;
  display: flex;
  gap: 0.3rem;
  padding: 0.3rem;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
}
.tab-bar::-webkit-scrollbar {
  display: none;
}
.tab-button {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--riffle-muted);
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: color 0.2s, background 0.3s, box-shadow 0.3s;
}
.tab-button:hover {
  color: var(--riffle-ink);
}
.tab-button.is-active {
  color: #fff;
}
/* the flowing pill behind the active tab */
.tab-slider {
  position: absolute;
  top: 0.3rem;
  bottom: 0.3rem;
  left: 0;
  z-index: 0;
  border-radius: 999px;
  /* --tab is set on the bar and changes with the selected tab */
  background: linear-gradient(90deg, var(--tab, var(--riffle-coral)), color-mix(in srgb, var(--tab, var(--riffle-coral)) 70%, #fff));
  box-shadow: 0 6px 16px color-mix(in srgb, var(--tab, var(--riffle-coral)) 38%, transparent);
  /* spring-like glide for position + width, plus a colour cross-fade */
  transition:
    transform 0.45s cubic-bezier(0.34, 1.4, 0.5, 1),
    width 0.45s cubic-bezier(0.34, 1.4, 0.5, 1),
    background 0.35s ease,
    box-shadow 0.35s ease,
    opacity 0.2s ease;
}
/* keep the label + count above the sliding pill */
.tab-button {
  z-index: 1;
}
@media (prefers-reduced-motion: reduce) {
  .tab-slider {
    transition: opacity 0.2s ease, background 0.2s ease;
  }
}
.tab-count {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--riffle-surface-soft);
  color: var(--riffle-muted);
  font-size: 0.72rem;
  font-weight: 800;
}
.tab-button.is-active .tab-count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
.tab-panel {
  padding-top: 1.25rem;
  animation: panel-in 0.25s ease;
}
@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem;
}
.artist-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem 1rem 1rem 1.2rem;
  overflow: hidden;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s, border-color 0.25s;
}
/* left accent bar that grows on hover */
.artist-tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent);
  transform: scaleY(0.35);
  transform-origin: center;
  opacity: 0.55;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s;
}
.artist-tile:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--accent) 50%, var(--riffle-border));
  box-shadow: 0 16px 34px color-mix(in srgb, var(--accent) 20%, transparent);
}
.artist-tile:hover::before {
  transform: scaleY(1);
  opacity: 1;
}
/* accent ring around the avatar */
.artist-tile .artist-link :deep(.artist-avatar) {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent);
  transition: box-shadow 0.25s;
}
.artist-tile:hover .artist-link :deep(.artist-avatar) {
  box-shadow: 0 0 0 3px var(--accent);
}
.artist-link {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding-right: 2rem;
  color: inherit;
  text-decoration: none;
}
.artist-link strong,
.artist-link small {
  display: block;
}
.artist-link small {
  color: var(--accent);
  font-weight: 700;
}
.heart-button {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  border: 0;
  background: transparent;
  color: #e0245e;
  font-size: 1.1rem;
  transition: transform 0.15s;
}
.heart-button:hover {
  transform: scale(1.2);
}
.artist-tile .tag {
  align-self: flex-start;
}

.liked-intro {
  margin: 0 0 1rem;
  color: var(--riffle-muted);
  font-weight: 600;
}

/* Heading row of a tab: a short note on the left, a link to the related page on the right */
.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  margin-bottom: 1rem;
}
.panel-head .panel-note {
  margin: 0;
  color: var(--riffle-muted);
  font-weight: 600;
}
.panel-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-blue);
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;
}
.panel-link:hover {
  border-color: var(--riffle-blue);
  background: #f3efff;
  transform: translateY(-1px);
}
.panel-link .bi-chevron-right {
  font-size: 0.75rem;
}
:root[data-theme='dark'] .panel-link:hover {
  background: rgba(124, 77, 255, 0.15);
}
.liked-intro i {
  color: #e0245e;
}
.liked-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.9rem;
}
.unlike-button {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid #ffc9dc;
  border-radius: 999px;
  background: #fff5f9;
  color: #c2185b;
  font-size: 0.82rem;
  font-weight: 700;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.unlike-button:hover:not(:disabled) {
  background: #e0245e;
  border-color: #e0245e;
  color: #fff;
}
.unlike-button:disabled {
  opacity: 0.6;
}
.liked-tile {
  animation: liked-in 0.4s ease backwards;
}
@keyframes liked-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.manage-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--riffle-blue);
  font-weight: 700;
  text-decoration: none;
}
.manage-link:hover {
  text-decoration: underline;
}

.row-list {
  margin: 0;
}
.event-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 0.9rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  background: var(--riffle-surface);
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, box-shadow 0.2s;
}
.event-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--accent);
  transform: scaleY(0);
  transform-origin: center;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.event-row:hover {
  transform: translateX(4px);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--riffle-border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 16%, transparent);
}
.event-row:hover::before {
  transform: scaleY(1);
}
.date-box {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  width: 54px;
  padding: 0.35rem 0;
  border: 0;
  border-radius: 11px;
  background: color-mix(in srgb, var(--accent) 14%, var(--riffle-surface));
  color: var(--accent);
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1.15;
}
.date-box strong {
  color: var(--riffle-ink);
  font-size: 1.2rem;
}
.date-box small {
  color: var(--riffle-muted);
  font-weight: 700;
}
.row-text {
  flex: 1;
  min-width: 0;
}
.row-text strong,
.row-text small {
  display: block;
}
.row-text small {
  color: var(--riffle-muted);
}
.row-arrow {
  color: var(--riffle-faint);
}

.song-rows {
  margin: 0;
}
.song-rows li {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 0.6rem;
  border-radius: 12px;
  transition: background 0.18s;
}
.song-rows li:hover {
  background: var(--riffle-surface-soft);
}
.song-number {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: linear-gradient(135deg, #ff4d8d, #7c4dff);
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.3);
}
/* top 3 get a brighter badge */
.song-rows li:nth-child(1) .song-number {
  background: linear-gradient(135deg, #ffd34d, #ff8a3d);
  box-shadow: 0 4px 12px rgba(255, 138, 61, 0.4);
}
.song-rows li:nth-child(2) .song-number {
  background: linear-gradient(135deg, #ff6b9d, #ff4d8d);
}
.song-rows li:nth-child(3) .song-number {
  background: linear-gradient(135deg, #8a6bff, #7c4dff);
}

.panel-title {
  font-size: 1.05rem;
  margin-bottom: 0.9rem;
}
.taste-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.empty-panel {
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  border: 1px dashed var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  color: var(--riffle-muted);
  text-align: center;
}
.empty-panel i {
  color: var(--riffle-faint);
  font-size: 2.2rem;
}
.empty-panel p {
  margin: 0;
}

/* ---- side cards ---- */
.side-card {
  position: relative;
  margin-bottom: 1rem;
  padding: 1.3rem 1.3rem 1.2rem;
  overflow: hidden;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background:
    radial-gradient(120% 90% at 0% 0%, rgba(124, 77, 255, 0.07), transparent 55%),
    var(--riffle-surface);
}
.side-card h2 {
  position: relative;
  margin: 0 0 0.8rem;
  padding-left: 0.7rem;
  font-size: 1.05rem;
}
/* accent tick before each side-card heading */
.side-card h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.15em;
  bottom: 0.15em;
  width: 3px;
  border-radius: 3px;
  background: linear-gradient(180deg, #ff4d8d, #7c4dff);
}
.side-card ul {
  margin: 0;
}
.activity-row {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--riffle-border);
  color: inherit;
  text-decoration: none;
}
.activity-row:hover .activity-text {
  color: var(--riffle-ink);
}
.activity-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: linear-gradient(135deg, #ff4d8d, #7c4dff);
  color: #fff;
  box-shadow: 0 4px 12px rgba(124, 77, 255, 0.28);
}
.activity-text {
  flex: 1;
  color: var(--riffle-muted);
  font-size: 0.85rem;
  line-height: 1.4;
}
.activity-text b {
  color: var(--riffle-ink);
}
.activity-row small,
.next-row small {
  color: var(--riffle-faint);
}

.next-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0;
  color: inherit;
  text-decoration: none;
}
.mini-date {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 28px;
  border: 1px solid var(--riffle-border);
  border-radius: 7px;
  color: var(--riffle-muted);
  font-size: 0.68rem;
  font-weight: 800;
}
.next-title {
  flex: 1;
  overflow: hidden;
  color: var(--riffle-ink);
  font-size: 0.9rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.side-empty {
  margin: 0;
  color: var(--riffle-muted);
  font-size: 0.9rem;
}

/* ---- edit form + buttons (as before) ---- */
.profile-box {
  padding: 25px;
  border: 1px solid var(--riffle-border);
  border-radius: 15px;
  background-color: var(--riffle-surface);
}

.profile-box h2 {
  font-size: 24px;
  margin-bottom: 10px;
}

.profile-box h3 {
  font-size: 18px;
  margin-bottom: 15px;
}

.profile-box p {
  color: var(--riffle-muted);
}

.text-input {
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid var(--riffle-border);
  border-radius: 10px;
  background-color: #f8f9fc;
  color: var(--riffle-ink);
  font-size: 16px;
  font-family: inherit;
}

.genre-tags,
.genre-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.genre-tag {
  padding: 8px 14px;
  border-radius: 25px;
  background-color: #eee7ff;
  color: #513ba0;
  font-weight: 600;
}

.genre-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--riffle-border);
  border-radius: 25px;
  cursor: pointer;
}

.genre-option.selected {
  background-color: #eee7ff;
  border-color: #7054dc;
  color: #513ba0;
}

.profile-button {
  display: inline-block;
  padding: 10px 22px;
  border: none;
  border-radius: 25px;
  background-color: #7c4dff;
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.profile-button:hover {
  background-color: #6a3cf0;
  color: #fff;
  transform: translateY(-1px);
}

.cancel-button {
  display: inline-block;
  padding: 10px 22px;
  border: 1px solid #14234b;
  border-radius: 25px;
  background-color: var(--riffle-surface);
  color: var(--riffle-ink);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.cancel-button:hover {
  background-color: var(--riffle-surface-soft);
  color: var(--riffle-ink);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
}

.page-links {
  justify-content: center;
}

.selected-song-section {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid var(--riffle-border);
}

.selected-song-section h3 {
  font-size: 18px;
  margin-bottom: 15px;
}

.selected-song-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.selected-song-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eef0f5;
}

.selected-song-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: #eee7ff;
  color: #513ba0;
  font-size: 24px;
}

.selected-song-info {
  flex: 1;
  min-width: 120px;
}

.selected-song-info strong {
  display: block;
  font-size: 14px;
}

.selected-song-info small {
  display: block;
  margin-top: 4px;
  color: var(--riffle-muted);
}

.remove-song-button {
  padding: 8px 14px;
  border: 1px solid var(--riffle-border);
  border-radius: 20px;
  background-color: var(--riffle-surface);
  color: var(--riffle-ink);
  cursor: pointer;
}

.remove-song-button:hover {
  background-color: #f3efff;
}

.remove-song-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.selected-song-count {
  margin-top: 15px;
  margin-bottom: 0;
  color: var(--riffle-muted);
  font-size: 14px;
}

.error-message {
  color: #b42318;
}

.success-message {
  color: #18754a;
}

@media (max-width: 575.98px) {
  .masthead {
    padding: 1.3rem 1.2rem 1.2rem;
  }
  .masthead__avatar {
    width: 76px;
    height: 76px;
    font-size: 1.7rem;
    border-radius: 20px;
  }
  .masthead__edit {
    order: 3;
  }
  .spec dd {
    font-size: 1.5rem;
  }
}

.profile-page {
  width: 100%;
  max-width: 1200px;
  padding-inline: 16px;
}

/* Keep the editing form from becoming excessively wide */
form.profile-box {
  max-width: 1000px;
  margin-inline: auto;
  padding: clamp(18px, 3vw, 32px);
}

.hero-info,
.artist-link > span,
.stat-card,
.stat-card > div {
  min-width: 0;
}

.hero-info h1,
.hero-meta,
.artist-link strong,
.row-text,
.genre-option span {
  overflow-wrap: anywhere;
}

.stat-card > i {
  flex-shrink: 0;
}

/* Allow artist cards to fit even on narrow phones */
.artist-grid {
  grid-template-columns:
    repeat(auto-fit, minmax(min(100%, 230px), 1fr));
}

.selected-song-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.selected-song-icon {
  width: 40px;
  height: 40px;
}

.selected-song-info {
  min-width: 0;
}

.selected-song-info strong,
.selected-song-info small {
  overflow-wrap: anywhere;
}

.profile-box label[for] {
  display: block;
  margin-bottom: 8px;
}

.text-input {
  min-height: 48px;
  font-size: 16px;
}

.profile-button,
.cancel-button,
.remove-song-button,
.tab-button {
  min-height: 44px;
}

.page-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 24px;
  margin-top: 20px;
}

.text-input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 3px solid #7054dc;
  outline-offset: 3px;
}

/* Stack editing sections before they become cramped */
@media (max-width: 991.98px) {
  form.profile-box > .row > .col-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .hero-actions {
    width: 100%;
  }
}

@media (max-width: 575.98px) {
  .hero-body {
    gap: 12px;
    align-items: flex-start;
  }

  .hero-info {
    flex: 0 0 100%;
  }

  .hero-meta {
    font-size: 13px;
    line-height: 1.7;
  }

  .hero-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .hero-actions > * {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    font-size: 14px;
  }

  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .stat-card {
    gap: 8px;
    padding: 12px;
  }

  .stat-card > i {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .stat-card span {
    display: block;
    margin-top: 4px;
    font-size: 12px;
  }

  .tab-bar {
    gap: 16px;
  }

  .tab-button {
    flex-shrink: 0;
    font-size: 14px;
  }

  .actions > button {
    flex: 1;
  }
}

/* ---- reset taste profile ---- */
.danger-zone {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem 1.25rem;
  border: 1px dashed #f0a5b5;
  border-radius: var(--riffle-radius);
  background: #fff8f9;
}
.danger-zone strong {
  color: #b3173f;
}
.danger-zone p {
  margin: 0.2rem 0 0;
  color: var(--riffle-muted);
  font-size: 0.9rem;
}
.reset-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  border: 2px solid #d6264f;
  border-radius: 999px;
  background: var(--riffle-surface);
  color: #d6264f;
  font-weight: 800;
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}
.reset-button:hover {
  background: #d6264f;
  color: #fff;
}

.reset-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(20, 24, 40, 0.6);
  backdrop-filter: blur(4px);
}
.reset-dialog {
  width: min(480px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  padding: 1.75rem 1.5rem 1.5rem;
  border-radius: 1.25rem;
  background: var(--riffle-surface);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
  text-align: left;
}
.reset-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 0.8rem;
  border-radius: 50%;
  background: #ffe3e9;
  color: #d6264f;
  font-size: 1.5rem;
}
.reset-dialog h2 {
  margin: 0 0 0.5rem;
  color: var(--riffle-ink);
  font-size: 1.4rem;
  font-weight: 800;
}
.reset-dialog p {
  margin: 0 0 0.5rem;
  color: var(--riffle-muted);
}
.reset-dialog ul {
  margin: 0 0 0.75rem;
  padding-left: 1.2rem;
  color: var(--riffle-ink);
}
.reset-keep {
  padding: 0.6rem 0.8rem;
  border-radius: 0.75rem;
  background: var(--riffle-surface-soft);
  font-size: 0.9rem;
}
.reset-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.9rem 0 1.1rem;
  color: var(--riffle-ink);
  font-weight: 700;
  cursor: pointer;
}
.reset-check input {
  width: 1.1rem;
  height: 1.1rem;
  accent-color: #d6264f;
}
.reset-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
}
.reset-cancel,
.reset-confirm {
  padding: 0.55rem 1.2rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.92rem;
}
.reset-cancel {
  border: 1px solid var(--riffle-border);
  background: var(--riffle-surface);
  color: var(--riffle-ink);
}
.reset-cancel:hover:not(:disabled) {
  background: var(--riffle-surface-soft);
}
.reset-confirm {
  border: 0;
  background: #d6264f;
  color: #fff;
}
.reset-confirm:disabled {
  background: #e9b9c4;
  cursor: not-allowed;
}
.reset-fade-enter-active,
.reset-fade-leave-active {
  transition: opacity 0.2s ease;
}
.reset-fade-enter-from,
.reset-fade-leave-to {
  opacity: 0;
}

/* Dark mode: the stat icon chip blends its accent into the dark surface;
   the gradient song/activity badges already read well on dark */
:root[data-theme='dark'] .genre-tag,
:root[data-theme='dark'] .genre-option.selected,
:root[data-theme='dark'] .selected-song-icon {
  background-color: rgba(124, 77, 255, 0.22);
  color: #e3d9ff;
}
:root[data-theme='dark'] .genre-option.selected {
  border-color: #b9a4ff;
}
:root[data-theme='dark'] .text-input {
  background-color: var(--riffle-surface-soft);
}
:root[data-theme='dark'] .remove-song-button:hover {
  background-color: rgba(124, 77, 255, 0.15);
}
:root[data-theme='dark'] .unlike-button {
  border-color: rgba(224, 36, 94, 0.45);
  background: rgba(224, 36, 94, 0.12);
  color: #ff8cbd;
}
:root[data-theme='dark'] .danger-zone {
  border-color: rgba(240, 165, 181, 0.4);
  background: rgba(224, 36, 94, 0.08);
}
:root[data-theme='dark'] .reset-icon {
  background: rgba(214, 38, 79, 0.2);
  color: #ff8ca5;
}
:root[data-theme='dark'] .reset-confirm:disabled {
  background: rgba(214, 38, 79, 0.35);
}

/* Dark mode: soften the masthead corner glows so they don't blow out */
:root[data-theme='dark'] .masthead {
  background:
    radial-gradient(var(--riffle-dots) 1.1px, transparent 1.1px) 0 0 / 22px 22px,
    radial-gradient(120% 140% at 100% 0%, rgba(255, 77, 141, 0.14), transparent 55%),
    radial-gradient(120% 140% at 0% 100%, rgba(124, 77, 255, 0.16), transparent 55%),
    var(--riffle-surface);
}
</style>
