<script setup>
import { ref, watch, nextTick } from 'vue'

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
const time = ref(0)
const duration = ref(30)

async function start() {
  emit('open')
  await nextTick()
  audio.value.play()
}

function togglePlay() {
  if (audio.value.paused) {
    audio.value.play()
  } else {
    audio.value.pause()
  }
}

function seek(e) {
  audio.value.currentTime = e.target.value
}

function formatTime(seconds) {
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
}

watch(() => props.open, open => {
  if (!open) audio.value.pause()
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
      @timeupdate="time = audio.currentTime"
      @loadedmetadata="duration = audio.duration"
    ></audio>
  </div>
</template>

<style scoped>
/* Song row */
.song-row {
  background-color: rgba(255, 255, 255, 0.1);
  font-size: 0.875em;
  height: 2.25em;
  line-height: 2.25em;
}
.song-row:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* Player */
.song-player {
  background-color: rgba(255, 255, 255, 0.15);
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
