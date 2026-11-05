<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { searchSongs } from '@/services/spotifyApi'


const song = defineModel({ type: Object, default: null })

const query = ref('')
const results = ref([])
const searching = ref(false)
const error = ref('')

let timer = null
let version = 0

const toSong = (track) => ({
  id: track.id,
  name: track.name,
  artists: track.artists.map((a) => a.name).join(', '),
  image: track.album?.images?.at(-1)?.url ?? track.album?.images?.[0]?.url ?? '',
  url: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
})

watch(query, (q) => {
  clearTimeout(timer)
  error.value = ''
  const term = q.trim()
  if (!term) {
    version++
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(() => search(term), 350)
})

async function search(term) {
  const mine = ++version
  try {
    const tracks = await searchSongs(term)
    if (mine !== version) return
    results.value = tracks.filter((t) => t?.id).map(toSong)
    if (!results.value.length) error.value = 'No songs found.'
  } catch (e) {
    if (mine !== version) return
    results.value = []
    error.value = 'Could not search songs. Please try again.'
  } finally {
    if (mine === version) searching.value = false
  }
}

function choose(s) {
  song.value = s
  query.value = ''
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div>
    <span class="form-label d-block">
      Song <span class="text-body-secondary small">(optional)</span>
    </span>

    <div v-if="song" class="chosen">
      <img v-if="song.image" :src="song.image" alt="" class="chosen__art" />
      <span class="chosen__text">
        <span class="chosen__name">{{ song.name }}</span>
        <span class="chosen__artist">{{ song.artists }}</span>
      </span>
      <i class="bi bi-spotify chosen__brand" aria-hidden="true"></i>
      <button type="button" class="btn-close ms-1" aria-label="Remove song" @click="song = null"></button>
    </div>

    <template v-else>
      <div class="input-group">
        <span class="input-group-text"><i class="bi bi-spotify text-success"></i></span>
        <input
          v-model="query"
          type="search"
          class="form-control"
          placeholder="Search for a song"
          aria-label="Search Spotify for a song"
        />
      </div>

      <div v-if="searching" class="small text-body-secondary mt-2">
        <span class="spinner-border spinner-border-sm me-1" role="status"></span>Searching…
      </div>
      <p v-else-if="error" class="small text-danger mt-2 mb-0">{{ error }}</p>

      <ul v-if="results.length && !searching" class="results list-unstyled mt-2 mb-0">
        <li v-for="r in results" :key="r.id">
          <button type="button" class="result" @click="choose(r)">
            <img v-if="r.image" :src="r.image" alt="" class="chosen__art" />
            <span class="chosen__text">
              <span class="chosen__name">{{ r.name }}</span>
              <span class="chosen__artist">{{ r.artists }}</span>
            </span>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.chosen,
.result {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border-radius: 10px;
  text-align: left;
}
.chosen {
  border: 1px solid #1db954;
  background: rgba(29, 185, 84, 0.06);
}
.result {
  border: 0;
  background: none;
}
.result:hover,
.result:focus-visible {
  background: var(--bs-secondary-bg);
}
.results {
  max-height: 260px;
  overflow-y: auto;
}
.chosen__art {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
}
.chosen__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
  line-height: 1.25;
}
.chosen__name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chosen__artist {
  font-size: 0.85em;
  color: var(--riffle-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chosen__brand {
  color: #1db954;
  font-size: 1.1rem;
}
</style>
