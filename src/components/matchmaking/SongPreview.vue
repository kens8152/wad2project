<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  track: {
    type: Object,
    required: true,
  },
  open: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['open'])

const audio = ref(null)
const playing = ref(false)
// Apple gives a 30 second preview; only the middle 10 seconds (usually the chorus) are played
const CLIP_START = 10
const CLIP_LENGTH = 10
const time = ref(0) // seconds into the 10 second clip
const duration = CLIP_LENGTH

async function start() {
  emit('open')
  await nextTick()
  try {
    await audio.value.play()
  } catch (error) {
    console.error('Could not play the preview', error)
  }
}

function togglePlay() {
  if (audio.value.paused) {
    // after the clip has ended, play it again from its start
    if (time.value >= CLIP_LENGTH) audio.value.currentTime = CLIP_START
    audio.value.play()
  } else {
    audio.value.pause()
  }
}

function seek(e) {
  audio.value.currentTime = CLIP_START + Number(e.target.value)
}

// jump to the start of the clip once the song is loaded
function onLoaded() {
  audio.value.currentTime = CLIP_START
}

// follow the song, and stop when the 10 seconds are over
function onTime() {
  time.value = Math.min(CLIP_LENGTH, Math.max(0, audio.value.currentTime - CLIP_START))
  if (time.value >= CLIP_LENGTH) audio.value.pause()
}

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

watch(() => props.open, open => {
  if (!open) audio.value.pause()
})

// a card that is removed (swiped away, or the page is left) must not keep playing
onBeforeUnmount(() => {
  audio.value.pause()
})
</script>

<template>
  <div>
    <button
      v-show="!open"
      class="song-row btn btn-sm border-0 rounded-3 w-100 py-0 text-start text-white text-truncate"
      @click="start"
    >
      <i class="bi bi-play-circle-fill me-2"></i>{{ track.title }}
    </button>

    <Transition name="song">
      <div v-show="open" class="song-player rounded-3">
        <div class="h-100 d-flex align-items-center gap-2 px-2">
          <img :src="track.artwork" alt="" class="song-art rounded-2 flex-shrink-0" />

          <div class="flex-grow-1 overflow-hidden">
            <div class="d-flex align-items-center gap-2">
              <span class="fw-semibold text-truncate">{{ track.title }}</span>
              <span class="song-time ms-auto opacity-75 text-nowrap">{{ formatTime(time) }} / {{ formatTime(duration) }}</span>
              <a
                :href="track.url"
                target="_blank"
                rel="noopener"
                class="text-white"
                title="Listen on Apple Music"
                aria-label="Listen on Apple Music"
              >
                <i class="bi bi-apple"></i>
              </a>
            </div>

            <input
              type="range"
              class="form-range"
              min="0"
              :max="duration"
              step="0.1"
              :value="time"
              aria-label="Seek"
              @input="seek"
            />
          </div>

          <button
            class="play-btn btn btn-light rounded-circle flex-shrink-0 p-0"
            :aria-label="playing ? 'Pause' : 'Play'"
            @click="togglePlay"
          >
            <i class="bi" :class="playing ? 'bi-pause-fill' : 'bi-play-fill'"></i>
          </button>
        </div>
      </div>
    </Transition>

    <audio
      ref="audio"
      :src="track.preview"
      preload="none"
      @play="playing = true"
      @pause="playing = false"
      @timeupdate="onTime"
      @loadedmetadata="onLoaded"
    ></audio>
  </div>
</template>

<style scoped>
/* Song row */
.song-row {
  background-color: color-mix(in srgb, var(--riffle-surface) 10%, transparent);
  font-size: 0.875em;
  height: 2.25em;
  line-height: 2.25em;
}
.song-row:hover {
  background-color: color-mix(in srgb, var(--riffle-surface) 20%, transparent);
}

/* Player */
.song-player {
  background-color: color-mix(in srgb, var(--riffle-surface) 15%, transparent);
  height: 64px;
}
.song-art {
  width: 44px;
  height: 44px;
}
.song-time {
  font-size: 0.85em;
}
.play-btn {
  width: 36px;
  height: 36px;
}

/* Player open / close */
.song-enter-active,
.song-leave-active {
  transition: height 0.35s ease;
  overflow: hidden;
}
.song-enter-from,
.song-leave-to {
  height: 0;
}
</style>
