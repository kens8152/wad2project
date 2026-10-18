<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventsStore } from '@/stores/events'
import { toast } from '@/composables/useToast'
import ProfileEventCard from '../components/ProfileEventCard.vue'
import { useArtistProfile } from '../composables/useArtistProfile.js'
import { useFavouriteArtists } from '../composables/useFavouriteArtists'

const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()

// the artist id comes from the url: /artists/:id
const artistId = computed(() => route.params.id)

const { artist, profile, upcomingEvents, pastEvents, portfolio } = useArtistProfile(artistId)
const { favourites, toggleFavourite } = useFavouriteArtists()

onMounted(() => {
  if (eventsStore.events.length === 0) {
    eventsStore.fetchEvents()
  }
})

// still waiting for the events to load
const isLoading = computed(() => eventsStore.loading || eventsStore.events.length === 0)

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
const activeTab = ref('portfolio')

const tabs = computed(() => [
  { value: 'portfolio', label: 'Portfolio', count: portfolio.value.length },
  { value: 'upcoming', label: 'Upcoming events', count: upcomingEvents.value.length },
  { value: 'past', label: 'Past events', count: pastEvents.value.length },
])

// the events shown under the tabs
const shownEvents = computed(() => {
  if (activeTab.value === 'upcoming') return upcomingEvents.value
  if (activeTab.value === 'past') return pastEvents.value
  return portfolio.value
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
    <div v-if="eventsStore.error" class="profile-state">
      <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
      <p class="mb-3">{{ eventsStore.error }}</p>
      <button class="btn btn-riffle" @click="eventsStore.fetchEvents()">Try again</button>
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

    <!-- The profile -->
    <template v-else>
      <!-- Hero banner -->
      <header class="hero" :style="{ '--genre': genreColor }">
        <img
          v-if="artist.image && !heroImageFailed"
          :src="artist.image"
          :alt="artist.name"
          class="hero__img"
          @error="heroImageFailed = true"
        />
        <div class="hero__shade"></div>

        <button type="button" class="hero__back" @click="goBack">
          <i class="bi bi-arrow-left"></i>
          Back
        </button>

        <div class="hero__bottom">
          <div>
            <span class="hero__genre"><i class="dot"></i>{{ artist.genre.name }}</span>
            <h1 class="hero__name">{{ artist.name }}</h1>
          </div>

          <div class="hero__actions">
            <button type="button" class="glass-pill" :aria-pressed="isFavourite" @click="onFavourite">
              <i class="bi" :class="isFavourite ? 'bi-heart-fill' : 'bi-heart'"></i>
              {{ isFavourite ? 'Favourited' : 'Favourite' }}
            </button>
            <button type="button" class="glass-pill" @click="onShare">
              <i class="bi bi-share"></i>
              Share
            </button>
          </div>
        </div>
      </header>

      <div class="profile-body" :style="{ '--genre': genreColor }">
        <!-- About -->
        <section class="profile-section">
          <h2 class="profile-section__title">About</h2>
          <p v-if="profile.bio" class="profile-about">{{ profile.bio }}</p>
          <p v-else class="profile-about text-secondary">No biography has been added yet.</p>

          <div class="profile-meta">
            <span v-if="upcomingEvents.length > 1" class="meta-chip"><i class="bi bi-calendar-event"></i>{{ upcomingEvents.length }} events</span>
            <span v-else-if="upcomingEvents.length === 1" class="meta-chip"><i class="bi bi-clock-history"></i>{{ upcomingEvents.length }} event</span>
            <span v-if="profile.formed" class="meta-chip"><i class="bi bi-clock-history"></i>Since {{ profile.formed }}</span>
            <span v-if="artist.tag" class="meta-chip">#{{ artist.tag }}</span>
          </div>
        </section>

        <!-- Social links -->
        <section v-if="socialLinks.length > 0" class="profile-section">
          <h2 class="profile-section__title">Follow</h2>
          <div class="socials">
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
        </section>

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
      </div>
    </template>
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
  background: #fff;
  border: 1px dashed var(--riffle-border);
}

/* ---------- hero banner ---------- */
.hero {
  position: relative;
  min-height: 240px;
  padding: 1.1rem 1.5rem 1.4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 18px;
  overflow: hidden;
  color: #fff;
  background: linear-gradient(135deg, var(--genre), color-mix(in srgb, var(--genre) 40%, #1b1b3a));
}
.hero__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.35;
}
.hero__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.55));
}
.hero__back,
.hero__bottom {
  position: relative; /* so they sit above the picture */
}

.hero__back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  border: 0;
  background: none;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
}
.hero__back:hover {
  text-decoration: underline;
}

.hero__bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.hero__genre {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: #fff;
  color: var(--riffle-ink);
  font-size: 0.8rem;
  font-weight: 700;
}
.hero__genre .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre);
}
.hero__name {
  margin: 0.6rem 0 0;
  font-size: 3rem;
  line-height: 1.05;
  font-weight: 800;
  color: #fff;
}

.hero__actions {
  display: flex;
  gap: 0.75rem;
}
/* glass buttons (same idea as the buttons in your design) */
.glass-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 14px rgba(0, 0, 0, 0.3);
  transition: background 0.15s, transform 0.15s;
}
.glass-pill:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}
.glass-pill[aria-pressed='true'] .bi-heart-fill {
  color: #ff6b6b;
}

/* ---------- body ---------- */
.profile-body {
  padding-top: 1.6rem;
}
.profile-section + .profile-section {
  margin-top: 2rem;
}
.profile-section__title {
  margin: 0 0 0.6rem;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--riffle-ink);
}
.profile-about {
  max-width: 760px;
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: #545454;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.9rem;
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
  gap: 0.75rem;
}
.socials__btn {
  width: 43px;
  height: 43px;
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
  background: #eef0f8;
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
  background: #fff;
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
  .hero {
    padding: 1rem;
  }
  .hero__name {
    font-size: 2.2rem;
  }
}
</style>