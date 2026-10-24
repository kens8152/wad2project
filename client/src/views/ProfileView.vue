<script setup>
import { ref, computed, onMounted } from 'vue'

import { useUserStore } from '@/stores/user.js'
import { useNotificationsStore } from '@/stores/notifications'
import LoginPrompt from '@/components/layout/LoginPrompt.vue'
import ArtistAvatar from '@/features/events/components/ArtistAvatar.vue'

import { searchSongs } from '@/services/spotifyApi'
import { getSavedArtists, getArtistDetails, removeSavedArtist } from '@/services/matchmakingApi'
import { useEventsData } from '@/features/events/composables/useEventsData'
import { useSavedEvents } from '@/features/events/composables/useSavedEvents'
import { dowUpper, monthShort } from '@/features/events/utils/date'
import { formatDistance } from '@/features/events/utils/geo'
import { toast } from '@/composables/useToast'

import { supabase } from '@/services/supabase.js'

const userStore = useUserStore()
const notifications = useNotificationsStore()

const storageKey = 'riffle-preferences-v1:' + userStore.user.id

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
const isEditing = ref(false)
const displayName = ref('')
const selectedGenres = ref([])
const favouriteSongs = ref('')

const songQuery = ref('')
const songResults = ref([])
const songLoading = ref(false)
const songError = ref('')

const errorMessage = ref('')
const successMessage = ref('')

const saving = ref(false)

// ---- the new profile page: saved artists, saved events, tabs ------------------------
const activeTab = ref('artists')
const savedArtists = ref([])
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
  { value: savedArtists.value.length, label: 'Saved artists', icon: 'bi-person-heart' },
  { value: savedEvents.value.length, label: 'Saved events', icon: 'bi-calendar-heart' },
  { value: songList.value.length, label: 'Favourite songs', icon: 'bi-music-note-list' },
  { value: profile.value ? profile.value.genres.length : 0, label: 'Genres', icon: 'bi-vinyl' }
])

const tabs = computed(() => [
  { key: 'artists', label: 'Artists', count: savedArtists.value.length },
  { key: 'events', label: 'Events', count: savedEvents.value.length },
  { key: 'songs', label: 'Songs', count: songList.value.length },
  { key: 'taste', label: 'Taste', count: profile.value ? profile.value.genres.length : 0 }
])

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

async function loadSavedArtists() {
  try {
    const rows = await getSavedArtists()
    const details = await getArtistDetails(rows.map(row => row.artist_id))
    savedArtists.value = details
  } catch (error) {
    console.error('Could not load saved artists', error)
  }
}

async function unsaveArtist(artist) {
  savedArtists.value = savedArtists.value.filter(item => item.id !== artist.id)

  try {
    await removeSavedArtist(artist.id)
    toast('Removed ' + artist.name + ' from your saved artists')
  } catch (error) {
    console.error('Could not remove artist', error)
    toast('Could not remove that artist. Please try again.')
    loadSavedArtists()
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
  loadSavedArtists()
  loadJoinDate()

  try {
    const { data, error } = await supabase.from('profiles').select('display_name, genres, favourite_songs').eq('id', userStore.user.id).maybeSingle()

    if (error) throw error

    if (!data) return

    profile.value = {
      displayName: data.display_name,
      genres: genres.filter(genre => data.genres.includes(genre)),
      favouriteSongs: data.favourite_songs
    }

    userStore.updateDisplayName(data.display_name)
  } catch (error) {
    errorMessage.value = 'Your preferences could not be loaded: ' + error.message
  } finally {
    loadingProfile.value = false
  }
})

// Copy saved preferences into the editing form
function startEditing() {
  displayName.value = profile.value.displayName
  selectedGenres.value = [...profile.value.genres]
  favouriteSongs.value = profile.value.favouriteSongs

  errorMessage.value = ''
  successMessage.value = ''

  songQuery.value = ''
  songResults.value = []
  songError.value = ''

  isEditing.value = true
}

// Leave the saved profile unchanged
function cancelEditing() {
  isEditing.value = false
  errorMessage.value = ''
}

//search songs
async function searchForSongs() {
  songError.value = ''
  songResults.value = []

  if (!songQuery.value.trim()) {
    songError.value = 'Please enter a song or artist.'
    return
  }

  if (!localStorage.getItem('access_token')) {
    songError.value = 'Please connect Spotify through onboarding first.'
    return
  }

  songLoading.value = true

  try {
    songResults.value = await searchSongs(songQuery.value.trim())

    if (songResults.value.length === 0) {
      songError.value = 'No songs found. Try another search.'
    }
  } catch {
    songError.value = 'Songs could not be loaded. Please try connecting Spotify again.'
  } finally {
    songLoading.value = false
  }
}

function getSongText(song) {
  return song.name + ' — ' + song.artists.map(artist => artist.name).join(', ')
}

function isSongAdded(song) {
  return favouriteSongs.value.split('\n').includes(getSongText(song))
}

function addSong(song) {
  if (isSongAdded(song)) return

  const songText = getSongText(song)

  if (favouriteSongs.value.trim()) {
    favouriteSongs.value = favouriteSongs.value.trim() + '\n' + songText
  } else {
    favouriteSongs.value = songText
  }
}

function removeSong(song) {
  favouriteSongs.value = favouriteSongs.value.split('\n').filter(text => text !== getSongText(song)).join('\n')
}
// Validate and save changes
async function saveProfile() {
  if (!userStore.isLoggedIn || saving.value) return

  errorMessage.value = ''
  successMessage.value = ''

  if (!displayName.value.trim()) {
    errorMessage.value = 'Please enter your display name.'
    return
  }

  if (selectedGenres.value.length === 0) {
    errorMessage.value = 'Please select at least one genre.'
    return
  }

  saving.value = true

  const updatedProfile = {
    displayName: displayName.value.trim(),
    genres: [...selectedGenres.value],
    favouriteSongs: favouriteSongs.value.trim()
  }

  try {
    const { error } = await supabase.from('profiles').upsert({
      id: userStore.user.id,
      display_name: updatedProfile.displayName,
      genres: updatedProfile.genres,
      favourite_songs: updatedProfile.favouriteSongs,
      onboarding_completed: true
    }, { onConflict: 'id' })

    if (error) throw error

    userStore.updateDisplayName(updatedProfile.displayName)
    profile.value = updatedProfile
    isEditing.value = false
    successMessage.value = 'Your profile has been updated.'

    // Keep the navbar's current local copy in sync during migration
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedProfile))
    } catch (cacheError) {
      console.warn('Profile saved online, but local copy could not be updated:', cacheError)
    }
  } catch (error) {
    errorMessage.value = 'Your changes could not be saved: ' + error.message
  } finally {
    saving.value = false
  }
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
      <template v-if="!isEditing">
        <section class="hero-card">
          <div class="hero-banner" aria-hidden="true">
            <span class="note note--1"><i class="bi bi-music-note-beamed"></i></span>
            <span class="note note--2"><i class="bi bi-music-note"></i></span>
            <span class="note note--3"><i class="bi bi-music-note-beamed"></i></span>
          </div>

          <div class="hero-body">
            <span class="hero-avatar">{{ userStore.user.initials }}</span>

            <div class="hero-info">
              <h1>{{ profile.displayName }}</h1>
              <p class="hero-meta">
                {{ handle }} · {{ userStore.user.location.label }}<template v-if="joinedLabel"> · {{ joinedLabel }}</template>
              </p>
              <div class="hero-tags">
                <span v-for="tag in shownTags" :key="tag" class="tag">{{ tag }}</span>
                <button v-if="genreTags.length > 3" type="button" class="tag tag--button" @click="showAllTags = !showAllTags">
                  {{ showAllTags ? 'Show less' : '+' + (genreTags.length - 3) + ' more' }}
                </button>
              </div>
            </div>

            <div class="hero-actions">
              <button class="profile-button" type="button" @click="startEditing"><i class="bi bi-pencil me-1"></i> Edit profile</button>
              <RouterLink to="/notifications" class="cancel-button"><i class="bi bi-gear me-1"></i> Settings</RouterLink>
            </div>
          </div>
        </section>

        <section class="stats-row">
          <div v-for="stat in stats" :key="stat.label" class="stat-card">
            <i class="bi" :class="stat.icon"></i>
            <div>
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </div>
          </div>
        </section>

        <div class="row g-4">
          <section class="col-12 col-lg-8">
            <nav class="tab-bar" role="tablist" aria-label="Your profile">
              <button
                v-for="tab in tabs"
                :key="tab.key"
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

            <!-- saved artists -->
            <div v-if="activeTab === 'artists'" class="tab-panel">
              <div v-if="savedArtists.length" class="artist-grid">
                <article v-for="artist in savedArtists" :key="artist.id" class="artist-tile" :style="{ '--accent': artist.genreColor }">
                  <RouterLink :to="'/artists/' + artist.id" class="artist-link">
                    <ArtistAvatar :name="artist.name" :image="artist.image" :size="52" />
                    <span>
                      <strong>{{ artist.name }}</strong>
                      <small>{{ artist.genre }}</small>
                    </span>
                  </RouterLink>
                  <button type="button" class="heart-button" :aria-label="'Remove ' + artist.name + ' from saved artists'" @click="unsaveArtist(artist)">
                    <i class="bi bi-heart-fill"></i>
                  </button>
                  <span v-if="artist.tag" class="tag">#{{ artist.tag }}</span>
                </article>
              </div>
              <div v-else class="empty-panel">
                <i class="bi bi-person-heart"></i>
                <p>You have not saved any artists yet.</p>
                <RouterLink to="/matchmaking" class="profile-button">Find artists</RouterLink>
              </div>
              <RouterLink v-if="savedArtists.length" :to="{ name: 'saved-artists' }" class="manage-link">Manage saved artists <i class="bi bi-arrow-right"></i></RouterLink>
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
      </template>

      <!-- ============ edit your profile ============ -->
      <form v-else class="profile-box" @submit.prevent="saveProfile">
        <h2>Edit your profile</h2>

        <div class="mb-4">
          <label for="profile-name">Display name</label>
          <input id="profile-name" v-model.trim="displayName" class="text-input" type="text" maxlength="50" required>
        </div>

        <div class="row">
          <section class="col-12 col-md-6 mb-3">
            <h3>Favourite genres</h3>
            <p>Select at least one genre.</p>
            <div class="genre-options">
              <label v-for="genre in genres" :key="genre" class="genre-option" :class="{ selected: selectedGenres.includes(genre) }">
                <input v-model="selectedGenres" type="checkbox" :value="genre">
                <span>{{ genre }}</span>
              </label>
            </div>
          </section>

          <section class="col-12 col-md-6 mb-3">
            <h3>Favourite songs</h3>

            <label for="profile-song-search">Search Spotify</label>
            <input id="profile-song-search" v-model="songQuery" class="text-input" type="text" placeholder="Enter a song or artist" @keydown.enter.prevent="searchForSongs">

            <button class="profile-button mt-2" type="button" :disabled="songLoading" @click="searchForSongs">{{ songLoading ? 'Searching…' : 'Search' }}</button>

            <p v-if="songError" class="error-message" role="alert">{{ songError }}</p>

            <ul class="list-unstyled mt-3">
              <li v-for="song in songResults" :key="song.id" class="mb-3">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <strong>{{ song.name }}</strong>
                    <div>{{ song.artists.map(artist => artist.name).join(', ') }}</div>
                  </div>
                  <button v-if="!isSongAdded(song)" class="profile-button" type="button" @click="addSong(song)">+ Add</button>
                  <button v-else class="cancel-button" type="button" @click="removeSong(song)">Remove</button>
                </div>
              </li>
            </ul>

            <label for="profile-songs">Selected songs — one per line</label>
            <textarea id="profile-songs" v-model.trim="favouriteSongs" class="text-input" rows="6"></textarea>
          </section>
        </div>

        <div class="actions">
          <button class="profile-button" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save changes' }}</button>
          <button class="cancel-button" type="button" :disabled="saving" @click="cancelEditing">Cancel</button>
        </div>
      </form>

      <div v-if="isEditing" class="page-links">
        <RouterLink to="/discover">Explore artists</RouterLink>
        <RouterLink to="/onboarding">Return to onboarding</RouterLink>
      </div>
    </template>
  </main>
  <LoginPrompt v-else />
</template>


<style scoped>
.profile-page {
  padding-top: 1.75rem;
  padding-bottom: 3rem;
  color: var(--riffle-ink);
}

/* ---- hero ---- */
.hero-card {
  margin-bottom: 1.25rem;
  overflow: hidden;
  border: 1px solid var(--riffle-border);
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--riffle-shadow-sm);
}
.hero-banner {
  position: relative;
  height: 120px;
  overflow: hidden;
  background: linear-gradient(120deg, #ffd1e3 0%, #d9d3fb 45%, #cfe4fb 100%);
}
.note {
  position: absolute;
  color: rgba(255, 255, 255, 0.85);
  font-size: 2rem;
  animation: drift 6s ease-in-out infinite;
}
.note--1 {
  left: 12%;
  top: 28px;
}
.note--2 {
  left: 46%;
  top: 56px;
  font-size: 1.5rem;
  animation-delay: -2s;
}
.note--3 {
  right: 14%;
  top: 22px;
  font-size: 2.4rem;
  animation-delay: -4s;
}
@keyframes drift {
  0%,
  100% {
    transform: translateY(0) rotate(-6deg);
  }
  50% {
    transform: translateY(-10px) rotate(6deg);
  }
}

.hero-body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1.25rem;
  padding: 0 1.75rem 1.5rem;
}
.hero-avatar {
  position: relative;
  z-index: 1; /* above the banner it overlaps */
  display: grid;
  place-items: center;
  flex: none;
  width: 104px;
  height: 104px;
  margin-top: -52px;
  border: 5px solid #fff;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffc9dc, #d9d3fb);
  color: var(--riffle-ink);
  font-size: 2.2rem;
  font-weight: 800;
  box-shadow: var(--riffle-shadow);
}
.hero-info {
  flex: 1;
  min-width: 220px;
  padding-top: 0.75rem;
}
.hero-info h1 {
  margin: 0;
  font-size: 1.7rem;
}
.hero-meta {
  margin: 0.15rem 0 0.6rem;
  color: var(--riffle-muted);
}
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.8rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: #fff;
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

/* ---- stats ---- */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.9rem;
  margin-bottom: 1.5rem;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1.2rem;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--riffle-shadow);
}
.stat-card > i {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #ece9ff;
  color: #5b45c9;
  font-size: 1.25rem;
}
.stat-card strong {
  display: block;
  font-size: 1.5rem;
  line-height: 1.1;
}
.stat-card span {
  color: var(--riffle-muted);
  font-size: 0.85rem;
}

/* ---- tabs ---- */
.tab-bar {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--riffle-border);
}
.tab-button {
  position: relative;
  padding: 0.6rem 0.1rem 0.8rem;
  border: 0;
  background: transparent;
  color: var(--riffle-muted);
  font-weight: 700;
  white-space: nowrap;
  transition: color 0.15s;
}
.tab-button:hover {
  color: var(--riffle-ink);
}
.tab-button.is-active {
  color: var(--riffle-ink);
}
.tab-button.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--riffle-coral), var(--riffle-coral-soft));
}
.tab-count {
  margin-left: 0.2rem;
  color: var(--riffle-faint);
  font-weight: 600;
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
  padding: 1rem;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.artist-tile:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: var(--riffle-shadow);
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
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 0.4rem;
  border-bottom: 1px solid var(--riffle-border);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s;
}
.event-row:hover {
  background: #f6f7fc;
}
.date-box {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  width: 54px;
  padding: 0.3rem 0;
  border: 2px solid var(--accent);
  border-radius: 10px;
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
  padding: 0.75rem 0.4rem;
  border-bottom: 1px solid var(--riffle-border);
}
.song-number {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ece9ff;
  color: #5b45c9;
  font-weight: 800;
  font-size: 0.85rem;
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
  background: #fff;
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
  margin-bottom: 1rem;
  padding: 1.2rem 1.3rem;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: #fff;
}
.side-card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
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
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ece9ff;
  color: #5b45c9;
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
  background-color: white;
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
  color: #64708a;
}

.text-input {
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid #d8deeb;
  border-radius: 10px;
  background-color: #f8f9fc;
  color: #14234b;
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
  border: 1px solid #d8deeb;
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
  background-color: #14234b;
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}

.profile-button:hover {
  background-color: #304779;
  color: #fff;
  transform: translateY(-1px);
}

.cancel-button {
  display: inline-block;
  padding: 10px 22px;
  border: 1px solid #14234b;
  border-radius: 25px;
  background-color: white;
  color: #14234b;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.cancel-button:hover {
  background-color: #eef1fb;
  color: #14234b;
}

.actions,
.page-links {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 20px;
}

.page-links {
  justify-content: center;
}

.error-message {
  color: #b42318;
}

.success-message {
  color: #18754a;
}

@media (max-width: 991.98px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 575.98px) {
  .hero-body {
    padding: 0 1.1rem 1.25rem;
  }
  .hero-avatar {
    width: 84px;
    height: 84px;
    margin-top: -42px;
    font-size: 1.8rem;
  }
  .stat-card {
    padding: 0.8rem;
  }
}
</style>
