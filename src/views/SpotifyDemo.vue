

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

import axios from 'axios'
import { useRouter } from 'vue-router'

import { getTopGenres } from '@/services/lastFM'
import { fetchTopArtists } from '@/services/spotifyApi'
import { loginWithSpotify, exchangeCodeForToken, logout as clearSession } from '@/services/spotifyAuth'

// ---- Config -------------------------------------------------------------
const PROFILE_URL = 'https://api.spotify.com/v1/me'
const PLAYLISTS_URL = 'https://api.spotify.com/v1/me/playlists?limit=10'

// ---- State --------------------------------------------------------------
const router = useRouter()
const returnPath = ref('/onboarding')

const accessToken = ref(null)

const profile = ref(null)
const playlists = ref([])
const loading = ref(false)
const error = ref('')
const topGenres = ref([])
const albums = ref([])
const selectedGenre = ref('')

// ---- API calls ----------------------------------------------------------
const authHeader = () => ({ Authorization: `Bearer ${accessToken.value}` })

const fetchSpotifyProfile = async () => {
  const { data } = await axios.get(PROFILE_URL, { headers: authHeader() })
  profile.value = data
}

const fetchSpotifyPlaylists = async () => {
  const { data } = await axios.get(PLAYLISTS_URL, { headers: authHeader() })
  playlists.value = data.items
}

const getSelectedRecommendation = async () => {
  const searchUrl = `https://api.spotify.com/v1/search?q=genre%3A+${encodeURIComponent(selectedGenre.value)}&type=album&market=SG`;
  const { data } = await axios.get(searchUrl, { headers: authHeader() });
  albums.value = data.albums.items;
  selectedGenre.value = ''; 
};

const loadGenres = async () => {
  try{
    const artists = await fetchTopArtists(accessToken.value)
    topGenres.value = await getTopGenres(artists)
  } catch(e) {
    console.log(e.response?.status, e.response?.data)
    error.value = 'Could not load genres: ' + (e.response?.data?.error?.message || e.message)
  }
}

const loadData = async () => {
  loading.value = true
  error.value = ''
  try {
    // Sequential, as requested: profile first, then playlists
    await fetchSpotifyProfile()
    await fetchSpotifyPlaylists()
    loadGenres()
  } catch (e) {
    if (e.response?.status === 401) {
      logout() // expired or invalid token
      error.value = 'Session expired. Please log in again.'
    } else {
      error.value = e.response?.data?.error?.message || e.message
    }
  } finally {
    loading.value = false
  }
}

const logout = () => {
  clearSession() // clears localStorage
  accessToken.value = null
  profile.value = null
  playlists.value = []
  topGenres.value = []
  albums.value = []
  selectedGenre.value = ''
  error.value = ''
}

const trackCount = (p) => {
  const total = p.items?.total ?? p.tracks?.total
  return total == null ? '– tracks' : `${total} tracks`
}
// ---- Lifecycle ----------------------------------------------------------
// The dark Spotify look only applies while this page is open (not app-wide).
onBeforeUnmount(() => document.body.classList.remove('spotify-dark'))

onMounted(async () => {
  document.body.classList.add('spotify-dark')

  const savedReturnTo = sessionStorage.getItem('riffle-spotify-return-to')

  if (savedReturnTo === '/profile') {
    returnPath.value = '/profile'
  }
  const params = new URLSearchParams(window.location.search)

// Handle cancelled or unsuccessful Spotify authorisation.
if (params.get('error')) {
  const spotifyError = params.get('error')
  const returnTo = sessionStorage.getItem('riffle-spotify-return-to')

  sessionStorage.removeItem('riffle-spotify-return-to')
  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')

  // Remove the callback parameters from the browser address.
  window.history.replaceState({}, document.title, window.location.pathname)

  // Return to the editor when the user cancels the connection.
  if (spotifyError === 'access_denied' && returnTo === '/onboarding') {
    await router.replace({ path: '/onboarding', query: { spotify: 'cancelled' } })
    return
  }

  // Preserve the return destination for connections started from the profile.
  if (spotifyError === 'access_denied' && returnTo === '/profile') {
    await router.replace('/profile')
    return
  }

  error.value = spotifyError === 'access_denied' ? 'Spotify connection cancelled.' : 'Spotify authorisation failed. Please try connecting again.'
  return
}

  // Returned from Spotify with a code -> exchange it
  const code = params.get('code')
  if (code) {
    const returnedState = params.get('state')
    const savedState = localStorage.getItem('pkce_state')
    // Remove ?code=... from the URL right away (codes are single-use)
    window.history.replaceState({}, document.title, window.location.pathname)

        if (!returnedState || returnedState !== savedState) {
    sessionStorage.removeItem('riffle-spotify-return-to')
    error.value = 'State mismatch. Please try logging in again.'
    return
    }

    try {
    const token = await exchangeCodeForToken(code)
    accessToken.value = token

    const returnTo = sessionStorage.getItem('riffle-spotify-return-to')
    sessionStorage.removeItem('riffle-spotify-return-to')

    if (returnTo === '/onboarding') {
      await router.replace({ path: '/onboarding', query: { spotify: 'connected' } })
      return
    }

    if (returnTo === '/profile') {
      await router.replace('/profile')
      return
    }

    await loadData()
  } catch (e) {
    sessionStorage.removeItem('riffle-spotify-return-to')
    error.value = e.response?.data?.error_description || e.message
  }
    return
  }

  // Existing session in localStorage
  const saved = localStorage.getItem('access_token')
  const expiresAt = Number(localStorage.getItem('token_expires_at') || 0)
  if (saved && Date.now() < expiresAt) {
    accessToken.value = saved
    await loadData()
  } else if (saved) {
    logout()
  }
})
</script>

<template>
  <div class="app">
    <!-- Introduce the Spotify connection. -->
    <header class="spotify-heading">
      <span class="spotify-eyebrow">YOUR MUSIC, YOUR RIFFLE</span>
      <h1>Bring your sound along.</h1>
      <p>Connect Spotify to explore your playlists and discover more of what you love.</p>
    </header>

    <!-- Display any connection error. -->
    <p v-if="error" class="error spotify-error" role="alert">{{ error }}</p>

    <!-- Show the connection card when logged out of Spotify. -->
    <section v-if="!accessToken" class="spotify-connect-card" aria-labelledby="spotify-connect-heading">
      <span class="spotify-logo" aria-hidden="true"><i class="bi bi-spotify"></i></span>
      <h2 id="spotify-connect-heading">Connect your Spotify</h2>
      <p>View your Spotify profile and playlists, and explore music through Riffle.</p>
      <button class="spotify-login-button" type="button" @click="loginWithSpotify()"><i class="bi bi-spotify" aria-hidden="true"></i> Connect Spotify <i class="bi bi-arrow-right" aria-hidden="true"></i></button>
      <small>You’ll continue to Spotify to approve access.</small>
    </section>

    <!-- v-else must immediately follow the section with v-if. -->
    <template v-else>
      <button class="secondary" type="button" @click="logout">Log out</button>

      <section v-if="profile" class="profile">
        <img v-if="profile.images?.length" :src="profile.images[0].url" alt="Avatar" />
        <div>
          <h2>{{ profile.display_name }}</h2>
          <p>{{ profile.email }}</p>
          <p>{{ profile.country }} · {{ profile.product }}</p>
        </div>
      </section>

      <p v-if="topGenres.length">Your top genres: <strong>{{ topGenres.join(', ') }}</strong></p>

      <h2>Your playlists</h2>
      <p v-if="loading">Loading…</p>
      <p v-else-if="!playlists.length">No playlists found.</p>

      <div class="grid">
        <a v-for="p in playlists" :key="p.id" class="card" :href="p.external_urls?.spotify" target="_blank" rel="noopener">
          <img v-if="p.images?.length" :src="p.images[0].url" :alt="p.name" />
          <strong>{{ p.name }}</strong>
          <small>{{ trackCount(p) }}</small>
        </a>
      </div>

      <h2>Song Recommendation:</h2>
      <input v-model="selectedGenre" type="text" placeholder="Enter a genre" style="margin-right: 10px;" />
      <button type="button" @click="getSelectedRecommendation">Get Recommendation</button>

      <div class="grid" style="margin-top: 20px;">
        <a v-for="album in albums" :key="album.id" class="card" :href="album.external_urls?.spotify" target="_blank" rel="noopener">
          <img v-if="album.images?.length" :src="album.images[0].url" :alt="album.name" />
          <strong>{{ album.name }}</strong>
          <small>{{ album.total_tracks }} tracks</small>
        </a>
      </div>
    </template>

    <!-- Keep the return link available in both connection states. -->
    <RouterLink :to="returnPath" class="return-link"><i class="bi bi-arrow-left" aria-hidden="true"></i> Return to Riffle</RouterLink>
  </div>
</template>

<style scoped>
:global(body.spotify-dark) {
  background-color: #121212;
  color: #fff;
}

h1,
h2,
p {
  color: white;
}

.app {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
}

button {
  padding: 0.6rem 1.2rem;
  border: 0;
  border-radius: 999px;
  background: #1db954;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}

button.secondary {
  background: #444;
  margin-bottom: 1rem;
}

.error {
  color: #c0392b;
}

.profile {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
}

.profile img {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-decoration: none;
  color: inherit;
  padding: 0.75rem;
  border-radius: 8px;
  background: #212121;
}

.card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
}

.return-link {
  display: block;
  margin-bottom: 20px;
  color: white;
  text-decoration: underline;
}

.app {
  width: calc(100% - 32px);
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 0;
  font-family: inherit;
}

/* Centre the page introduction. */
.spotify-heading {
  max-width: 620px;
  margin: 0 auto 20px;
  text-align: center;
}

/* Style the small introductory label. */
.spotify-eyebrow {
  color: #b8a3ff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
}

/* Use a heading size that also fits smaller screens. */
.spotify-heading h1 {
  margin: 12px 0;
  color: #fff;
  font-size: 36px;
  font-weight: 800;
  line-height: 1.2;
}

/* Make the description easier to read. */
.spotify-heading p {
  margin: 0;
  color: #b5b1ca;
  font-size: 15px;
  line-height: 1.7;
}

/* Centre the return link and separate it from the connection card. */
.return-link {
  display: block;
  width: fit-content;
  margin: 0 auto 24px;
  color: #c6b7ff;
  font-size: 14px;
  text-align: center;
  text-decoration: none;
}

/* Underline the return link when hovered. */
.return-link:hover {
  text-decoration: underline;
}

/* Group the connection controls inside a rounded card. */
.spotify-connect-card {
  box-sizing: border-box;
  max-width: 500px;
  margin: 0 auto;
  padding: 36px 28px;
  border: 1px solid #39334e;
  border-radius: 24px;
  background: #19152b;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.18);
  text-align: center;
}

/* Display a large Spotify icon above the card heading. */
.spotify-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  margin-bottom: 20px;
  border-radius: 22px;
  background: #14392b;
  color: #1ed760;
  font-size: 42px;
}

/* Style the connection card's heading. */
.spotify-connect-card h2 {
  margin: 0 0 12px;
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}

/* Add breathing room around the explanatory text. */
.spotify-connect-card p {
  margin: 0 0 24px;
  color: #b5b1ca;
  font-size: 14px;
  line-height: 1.7;
}

/* Align the button icons and label and provide a large click target. */
.spotify-login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  padding: 12px 18px;
  border: 0;
  border-radius: 14px;
  background: #1ed760;
  color: #102217;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

/* Darken the button slightly when hovered. */
.spotify-login-button:hover {
  background: #1bc457;
  opacity: 1;
}

/* Explain the next step below the connection button. */
.spotify-connect-card small {
  display: block;
  margin-top: 16px;
  color: #aaa5bf;
  font-size: 12px;
  line-height: 1.6;
}

/* Present errors inside a readable alert box. */
.spotify-error {
  padding: 14px 18px;
  border: 1px solid #89434e;
  border-radius: 12px;
  background: #3b202b;
  color: #ffc0c7;
  overflow-wrap: anywhere;
}

/* Adjust spacing and heading size for phones. */
@media (max-width: 575.98px) {
  .app {
    padding: 32px 0;
  }

  .spotify-heading h1 {
    font-size: 28px;
  }

  .spotify-connect-card {
    padding: 28px 20px;
  }
}
</style>