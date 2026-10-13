<template>
  <div class="app">
    <h1>Spotify Demo</h1>

    <p v-if="error" class="error">{{ error }}</p>

    <!-- Logged out -->
    <button v-if="!accessToken" @click="loginWithSpotify">Log in with Spotify</button>

    <!-- Logged in -->
    <template v-else>
      <button class="secondary" @click="logout">Log out</button>

      <section v-if="profile" class="profile">
        <img v-if="profile.images?.length" :src="profile.images[0].url" alt="Avatar" />
        <div>
          <h2>{{ profile.display_name }}</h2>
          <p>{{ profile.email }}</p>
          <p>{{ profile.country }} · {{ profile.product }}</p>
        </div>
      </section>

      <p v-if="topGenres.length">
        Your top genres: <strong>{{ topGenres.join(', ') }}</strong>
      </p>

      <h2>Your playlists</h2>
      <p v-if="loading">Loading…</p>
      <p v-else-if="!playlists.length">No playlists found.</p>
      <div class="grid">
        <a
          v-for="p in playlists"
          :key="p.id"
          class="card"
          :href="p.external_urls?.spotify"
          target="_blank"
          rel="noopener"
        >
          <img v-if="p.images?.length" :src="p.images[0].url" :alt="p.name" />
          <strong>{{ p.name }}</strong>
          <small>{{ trackCount(p) }}</small>
        </a>
      </div>
      <h2>Song Recommendation:</h2>
      <input type="text" v-model="selectedGenre" placeholder="Enter a genre"  style="margin-right: 10px;"/>
      <button @click="getSelectedRecommendation">Get Recommendation</button>
      <div class="grid" style="margin-top: 20px;">
        <a
          v-for="album in albums"
          :key="album.id"
          class="card"
          :href="album.external_urls?.spotify"
          target="_blank"
          rel="noopener"
        >
          <img v-if="album.images?.length" :src="album.images[0].url" :alt="album.name" />
          <strong>{{ album.name }}</strong>
          <small>{{ album.total_tracks }} tracks</small>
        </a>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// ---- Config -------------------------------------------------------------
const CLIENT_ID = 'aa4e949f8a06492bbfaac8ecad2c7e52' // no client secret needed with PKCE
const REDIRECT_URI = 'http://127.0.0.1:5173/' // must match the Dashboard EXACTLY
const SCOPES = 'user-read-private user-read-email playlist-read-private user-top-read'

const AUTH_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const PROFILE_URL = 'https://api.spotify.com/v1/me'
const PLAYLISTS_URL = 'https://api.spotify.com/v1/me/playlists?limit=10'
const SEARCHALBUM_URL = `https://api.spotify.com/v1/search?q=genre%3A+Singapore&type=album&market=SG`
const LASTFM_KEY = 'f25905dc6b0a401b819f17f72c971095'

// ---- State --------------------------------------------------------------
const accessToken = ref(null)
const profile = ref(null)
const playlists = ref([])
const loading = ref(false)
const error = ref('')
const topGenres = ref([])
const trackCount = (p) => {
  const total = p.items?.total ?? p.tracks?.total
  return total == null ? '– tracks' : `${total} tracks`
}
const albums = ref([])
const selectedGenre = ref('')
// ---- PKCE helpers -------------------------------------------------------
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => chars[v % chars.length]).join('')
}

async function sha256(plain) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain))
}

function base64encode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

// ---- Auth flow ----------------------------------------------------------
const loginWithSpotify = async () => {
  const verifier = generateRandomString(64)
  const challenge = base64encode(await sha256(verifier))
  const state = generateRandomString(16)

  localStorage.setItem('pkce_verifier', verifier)
  localStorage.setItem('pkce_state', state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })

  window.location.href = `${AUTH_URL}?${params.toString()}`
}

const exchangeCodeForToken = async (code) => {
  const verifier = localStorage.getItem('pkce_verifier')
  if (!verifier) throw new Error('Missing PKCE verifier. Please log in again.')

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  localStorage.removeItem('pkce_verifier')
  localStorage.removeItem('pkce_state')
  return response.data.access_token
}

const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('token_expires_at')
  accessToken.value = null
  profile.value = null
  playlists.value = []
  topGenres.value = []
}

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

// const getRecommendation = async () => {
//   const { data } = await axios.get(SEARCHALBUM_URL, { headers: authHeader() })
//   albums.value = data.albums.items;
// }

const getSelectedRecommendation = async () => {
  const searchUrl = `https://api.spotify.com/v1/search?q=genre%3A+${encodeURIComponent(selectedGenre.value)}&type=album&market=SG`;
  const { data } = await axios.get(searchUrl, { headers: authHeader() });
  albums.value = data.albums.items;
  selectedGenre.value = ''; // Clear the input field after fetching recommendations
};

const fetchTopGenres = async () => {
  try {
    const { data } = await axios.get(
      'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=15',
      { headers: authHeader() }
    )

    const artists = data.items

    const scores = {}
    const BATCH = 5
    const IGNORE = ['seen live', 'favorites', 'favourite', 'favourites', 'female vocalists', 'male vocalists']
    for (let start = 0; start < artists.length; start += BATCH) {
      const batch = artists.slice(start, start + BATCH)

      const results = await Promise.all(
        batch.map((artist) =>
          axios
            .get('https://ws.audioscrobbler.com/2.0/', {
              params: {
                method: 'artist.getTopTags',
                artist: artist.name,
                api_key: LASTFM_KEY,
                format: 'json',
                autocorrect: 1,
              },
            })
            .catch(() => null) 
        )
      )

      results.forEach((res, j) => {
        if (!res) return
        const weight = artists.length - (start + j)
        ;(res.data.toptags?.tag || []).slice(0, 5).forEach((t) => {
          const g = t.name.toLowerCase()
          if (IGNORE.includes(g)) return
          scores[g] = (scores[g] || 0) + weight * (Number(t.count) / 100)
        })
      })

      if (start + BATCH < artists.length) await new Promise((r) => setTimeout(r, 1000))
    }

    topGenres.value = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
  } catch (e) {
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
    await getSelectedRecommendation()
    await fetchTopGenres()
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

// ---- Lifecycle ----------------------------------------------------------
onMounted(async () => {
  const params = new URLSearchParams(window.location.search)

  // Returned from Spotify with an error (e.g. user denied access)
  if (params.get('error')) {
    error.value = `Spotify auth error: ${params.get('error')}`
    window.history.replaceState({}, document.title, window.location.pathname)
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
      error.value = 'State mismatch. Please try logging in again.'
      return
    }

    try {
      const token = await exchangeCodeForToken(code)
      localStorage.setItem('access_token', token)
      // Spotify tokens last 1 hour
      localStorage.setItem('token_expires_at', String(Date.now() + 3600 * 1000))
      accessToken.value = token
      await loadData()
    } catch (e) {
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

<style scoped>
:global(body) { background-color: #121212; }
h1, h2,p {color:white}
.app { max-width: 900px; margin: 2rem auto; padding: 0 1rem; font-family: system-ui, sans-serif; }
button { padding: 0.6rem 1.2rem; border: 0; border-radius: 999px; background: #1db954; color: #fff; font-weight: 600; cursor: pointer; }
button:hover { opacity: 0.9; }
button.secondary { background: #444; margin-bottom: 1rem; }
.error { color: #c0392b; }
.profile { display: flex; gap: 1rem; align-items: center; margin: 1rem 0; }
.profile img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
.card { display: flex; flex-direction: column; gap: 0.25rem; text-decoration: none; color: inherit; padding: 0.75rem; border-radius: 8px; background: #f4f4f4; }
.card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; }
</style>