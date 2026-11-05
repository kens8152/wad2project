<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import { useUserStore } from '@/stores/user'
import { toast } from '@/composables/useToast'
import { useSavedArtists } from '@/composables/artists/useSavedArtists'
import ProfileEventCard from '../../components/artists/ProfileEventCard.vue'
import { useArtistProfile } from '../../composables/artists/useArtistProfile.js'
import { useFavouriteArtists } from '../../composables/artists/useFavouriteArtists'

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()

// the artist id comes from the url: /artists/:id
const artistId = computed(() => route.params.id)

const { artist, profile, profileLoading, profileError, fetchArtist, upcomingEvents, pastEvents, portfolio } = useArtistProfile(artistId)
const { favourites, toggleFavourite } = useFavouriteArtists()

onMounted(() => {
  if (eventsStore.events.length === 0) {
    eventsStore.fetchEvents()
  }
})

// still waiting for the artist to load
const isLoading = computed(() => profileLoading.value)

const isFavourite = computed(() => {
  if (artist.value === null) return false
  return favourites.value.includes(artist.value.id)
})

const genreColor = computed(() => {
  if (artist.value === null) return '#2563eb'
  return artist.value.genre.color || '#2563eb'
})

// ----- hero picture (if it fails to load we only show the colour) -----
const heroImageFailed = ref(false)

// ----- buttons -----
function goBack() {
  // if there is a page before this one go back to it, otherwise go to the artists page
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'artists' })
  }
}

function onFavourite() {
  toggleFavourite(artist.value)
}

// ----- save (a separate bookmark list, not the same as following) -----
const userStore = useUserStore()
const { loadSaved, isSaved: isArtistSaved, toggleSaved } = useSavedArtists()
const isSaved = computed(() => isArtistSaved(artistId.value))
const savingArtist = ref(false)

async function loadSavedList() {
  if (!userStore.isLoggedIn) return

  try {
    await loadSaved()
  } catch (error) {
    console.error('Could not load saved artists', error)
  }
}
watch(artistId, loadSavedList, { immediate: true })

async function onSave() {
  if (!userStore.isLoggedIn) {
    toast('Please log in to save artists.')
    return
  }
  if (savingArtist.value) return

  savingArtist.value = true
  try {
    const nowSaved = await toggleSaved(artistId.value)
    toast(nowSaved ? 'Artist saved' : 'Artist removed from saved')
  } catch (error) {
    console.error('Could not update saved artist', error)
    toast('Could not update this artist. Please try again.')
  } finally {
    savingArtist.value = false
  }
}

async function onShare() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast('Link copied to clipboard')
  } catch (error) {
    toast('Could not copy the link')
  }
}

// ----- social links (icon depends on the network) -----
const socialIcons = {
  instagram: 'bi-instagram',
  spotify: 'bi-spotify',
  youtube: 'bi-youtube',
  x: 'bi-twitter-x',
  facebook: 'bi-facebook',
}

const socialLinks = computed(() => {
  const list = []
  const socials = profile.value.socials || {}

  for (const network in socials) {
    list.push({
      network: network,
      url: socials[network],
      icon: socialIcons[network] || 'bi-link-45deg',
    })
  }
  return list
})

// ----- tabs -----
// The portfolio is the artist's showcase: only their best (most popular) events, about half of all their events, so it is
// always a selection (1 event shows 1, 3 events show 2, 6 events show 3), and never more than 4.
// The Upcoming and Past tabs still list everything.
const featured = computed(() => {
  const size = Math.min(4, Math.max(1, Math.ceil(portfolio.value.length / 2)))
  return portfolio.value.slice().sort((a, b) => b.going - a.going).slice(0, size)
})

const activeTab = ref('portfolio')

const tabs = computed(() => [
  { value: 'portfolio', label: 'Portfolio', count: featured.value.length },
  { value: 'upcoming', label: 'Upcoming events', count: upcomingEvents.value.length },
  { value: 'past', label: 'Past events', count: pastEvents.value.length },
])

// the events shown under the tabs
const shownEvents = computed(() => {
  if (activeTab.value === 'upcoming') return upcomingEvents.value
  if (activeTab.value === 'past') return pastEvents.value
  return featured.value
})

const emptyMessage = computed(() => {
  if (activeTab.value === 'upcoming') return 'No upcoming events yet.'
  if (activeTab.value === 'past') return 'No past events yet.'
  return 'Nothing in the portfolio yet.'
})
</script>

<template>
  <div class="artist-profile container-xxl">
    <!-- Error -->
    <div v-if="profileError" class="profile-state">
      <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
      <p class="mb-3">{{ profileError }}</p>
      <button class="btn btn-riffle" @click="fetchArtist(artistId)">Try again</button>
    </div>

    <!-- Loading -->
    <div v-else-if="isLoading" class="profile-state">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <!-- Artist not found -->
    <div v-else-if="artist === null" class="profile-state">
      <i class="bi bi-person-x fs-1 text-secondary"></i>
      <h2 class="h5 mt-2">We couldn't find this artist</h2>
      <RouterLink :to="{ name: 'artists' }" class="btn btn-riffle mt-2">Back to artists</RouterLink>
    </div>

    <!-- The profile: the artist on the left, their events on the right -->
    <div v-else class="profile-layout" :style="{ '--genre': genreColor }">
      <aside class="profile-side">
        <button type="button" class="profile-back" @click="goBack">
          <i class="bi bi-arrow-left"></i>
          Back
        </button>

        <div class="profile-photo">
          <img
            v-if="artist.image && !heroImageFailed"
            :src="artist.image"
            :alt="artist.name"
            class="profile-photo__img"
            @error="heroImageFailed = true"
          />
          <span v-else class="profile-photo__initial" aria-hidden="true">{{ artist.name.charAt(0) }}</span>
        </div>

        <p class="profile-kicker"><i class="dot"></i>{{ artist.genre.name }}</p>
        <h1 class="profile-name">{{ artist.name }}</h1>

        <div class="profile-actions">
          <button type="button" class="profile-pill" :aria-pressed="isFavourite" @click="onFavourite">
            <i class="bi" :class="isFavourite ? 'bi-heart-fill' : 'bi-heart'"></i>
            {{ isFavourite ? 'Following' : 'Follow' }}
          </button>
          <button type="button" class="profile-pill" :aria-pressed="isSaved" :disabled="savingArtist" @click="onSave">
            <i class="bi" :class="isSaved ? 'bi-bookmark-fill' : 'bi-bookmark'"></i>
            {{ isSaved ? 'Saved' : 'Save' }}
          </button>
          <button type="button" class="profile-pill" @click="onShare">
            <i class="bi bi-share"></i>
            Share
          </button>
        </div>

        <div class="profile-meta">
          <span v-if="upcomingEvents.length > 0" class="meta-chip"><i class="bi bi-calendar-event"></i>{{ upcomingEvents.length }} upcoming</span>
          <span v-if="pastEvents.length > 0" class="meta-chip"><i class="bi bi-clock-history"></i>{{ pastEvents.length }} past</span>
          <span v-if="profile.formed" class="meta-chip"><i class="bi bi-clock-history"></i>Since {{ profile.formed }}</span>
          <span v-if="artist.tag" class="meta-chip">#{{ artist.tag }}</span>
        </div>


        <div class="profile-divider"></div>

        <p v-if="profile.bio" class="profile-about">{{ profile.bio }}</p>
        <p v-else class="profile-about text-secondary">No biography has been added yet.</p>


        <div v-if="socialLinks.length > 0" class="profile-divider"></div>
        <div v-if="socialLinks.length > 0" class="socials">
          <a
            v-for="link in socialLinks"
            :key="link.network"
            :href="link.url"
            class="socials__btn"
            target="_blank"
            rel="noopener"
            :aria-label="link.network"
          >
            <i class="bi" :class="link.icon"></i>
          </a>
        </div>
      </aside>

      <main class="profile-main">
        <!-- Tabs: upcoming / past / portfolio -->
        <section class="profile-section">
          <div class="profile-tabs" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              type="button"
              role="tab"
              class="profile-tabs__btn"
              :class="{ 'is-active': activeTab === tab.value }"
              :aria-selected="activeTab === tab.value"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
              <span class="profile-tabs__count">{{ tab.count }}</span>
            </button>
          </div>

          <p v-if="shownEvents.length === 0" class="profile-empty" :key="activeTab + '-empty'">{{ emptyMessage }}</p>

          <div v-else class="profile-grid" :key="activeTab + '-grid'">
            <ProfileEventCard v-for="event in shownEvents" :key="event.id" :event="event" />
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.artist-profile {
  padding-top: 1.1rem;
  padding-bottom: 2.5rem;
}

.profile-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 2rem;
  text-align: center;
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  border: 1px dashed var(--riffle-border);
}

/* ---------- the layout: the artist on the left, their events on the right ---------- */
.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.6rem;
}
.profile-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.2rem 2rem 2rem;
  border: 1px solid var(--riffle-border);
  border-radius: 18px;
  background: var(--riffle-surface);
  box-shadow: var(--riffle-shadow);
}
.profile-divider {
  align-self: stretch;
  height: 1px;
  margin: 1.2rem 0;
  background: var(--riffle-border);
}
.profile-main {
  min-width: 0;
}
@media (min-width: 992px) {
  .profile-layout {
    grid-template-columns: 420px minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
  }
}

.profile-back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
  padding: 0.1rem 0;
  border: 0;
  background: none;
  color: var(--riffle-muted);
  font-weight: 700;
}
.profile-back:hover {
  color: var(--riffle-ink);
}

/* the picture is a circle (a letter on the genre colour when there is no picture) */
.profile-photo {
  width: 180px;
  height: 180px;
  margin-bottom: 1.2rem;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--genre), color-mix(in srgb, var(--genre) 40%, #1b1b3a));
  box-shadow: 0 0 0 4px var(--riffle-surface), 0 0 0 5px var(--riffle-border), var(--riffle-shadow);
}
.profile-photo__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-photo__initial {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #fff;
  font-size: 3.6rem;
  font-weight: 800;
}

.profile-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--riffle-muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.profile-kicker .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
}
.profile-name {
  margin: 0.4rem 0 0;
  font-size: 2.3rem;
  line-height: 1.05;
  font-weight: 800;
  color: var(--riffle-ink);
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.1rem;
}
.profile-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--riffle-border);
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}
.profile-pill:hover:not(:disabled) {
  border-color: var(--genre);
  transform: translateY(-1px);
}
.profile-pill[aria-pressed='true'] {
  border-color: var(--genre);
  background: color-mix(in srgb, var(--genre) 12%, var(--riffle-surface));
}
.profile-pill[aria-pressed='true'] .bi-heart-fill {
  color: #e0245e;
}

.profile-about {
  align-self: stretch;
  text-align: left;
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--riffle-muted);
}

.profile-meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: #f1f4fb;
  color: var(--riffle-ink);
  font-size: 0.85rem;
  font-weight: 600;
}
.meta-chip .bi {
  color: var(--genre);
}

/* social buttons: dark circles like the design */
.socials {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
}
.socials__btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #121212;
  border: 1px solid #272727;
  color: #a2a2a2;
  text-decoration: none;
  transition: color 0.15s, transform 0.15s, border-color 0.15s;
}
.socials__btn:hover {
  color: #fff;
  border-color: var(--genre);
  transform: translateY(-2px);
}

/* tabs */
.profile-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 1.6rem;
  margin-bottom: 1.2rem;
  border-bottom: 1px solid var(--riffle-border);
}
.profile-tabs__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  font-weight: 700;
  color: var(--riffle-muted);
  transition: color 0.15s;
}
.profile-tabs__btn:hover {
  color: var(--riffle-ink);
}
.profile-tabs__btn.is-active {
  color: var(--riffle-ink);
  border-bottom-color: var(--genre);
}
.profile-tabs__count {
  min-width: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--riffle-surface-soft);
  font-size: 0.75rem;
  line-height: 22px;
  text-align: center;
}
.profile-tabs__btn.is-active .profile-tabs__count {
  background: var(--genre);
  color: #fff;
}

.profile-empty {
  padding: 2rem;
  text-align: center;
  color: var(--riffle-muted);
  border: 1px dashed var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.1rem;
  min-height: 400px;
  align-content: start;
}

@media (max-width: 575.98px) {
  .profile-side {
    padding: 1.1rem 1.1rem 1.4rem;
  }
  .profile-photo {
    width: 150px;
    height: 150px;
  }
  .profile-name {
    font-size: 1.9rem;
  }
}

/* Dark mode: the light chips become dark, so their text stays readable */
:root[data-theme='dark'] .meta-chip {
  background: var(--riffle-surface-soft);
}
</style>