<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { findApplePreview } from '@/services/applePreviewApi'

// A small music player for a 30 second Apple Music preview of any song.
// It works like the song previews on the matchmaking cards, with a few more controls:
// play / pause, restart, back 5 seconds, forward 5 seconds, and a timeline.
//
// The page decides which song is open (so only one song plays at a time):
//   <SongPlayer title="Low Tide" artist="FallingIslands" :open="openSong === 'low-tide'" />
// When `open` becomes true the preview is looked up and starts playing; when it becomes false the song stops.
const props = defineProps({
  title: { type: String, required: true },
  artist: { type: String, default: '' },
  // an album picture the page already has; when empty, the picture from Apple is used
  cover: { type: String, default: '' },
  open: { type: Boolean, default: false },
})

const SKIP_SECONDS = 5

const audio = ref(null)
const track = ref(null) // { preview, url, artwork } from Apple
const status = ref('idle') // idle, loading, ready, missing, error
const playing = ref(false)
const ended = ref(false)
const time = ref(0)
const duration = ref(30)

const coverUrl = computed(() => props.cover || (track.value ? track.value.artwork : ''))
const progress = computed(() => (duration.value > 0 ? Math.min(100, (time.value / duration.value) * 100) : 0))
const timeLeft = computed(() => Math.max(0, duration.value - time.value))

function formatTime(seconds) {
  const whole = Math.floor(seconds)
  return Math.floor(whole / 60) + ':' + String(whole % 60).padStart(2, '0')
}

// look the preview up (once), then start playing it
async function start() {
  if (!track.value) {
    status.value = 'loading'
    const result = await findApplePreview(props.title, props.artist)

    // the song may have been closed while we were looking
    if (!props.open) {
      status.value = 'idle'
      return
    }
    if (!result) {
      status.value = 'missing'
      return
    }
    track.value = result
  }

  status.value = 'ready'
  if (audio.value.getAttribute('src') !== track.value.preview) {
    audio.value.src = track.value.preview
  }

  try {
    await audio.value.play()
  } catch {
    status.value = 'error'
  }
}

function togglePlay() {
  if (status.value !== 'ready') return

  if (ended.value) {
    restart()
  } else if (audio.value.paused) {
    audio.value.play()
  } else {
    audio.value.pause()
  }
}

// back to 0:00 and play again
function restart() {
  if (status.value !== 'ready') return
  audio.value.currentTime = 0
  audio.value.play()
}

// jump forward (+5) or back (-5), staying inside the clip
function skip(seconds) {
  if (status.value !== 'ready') return
  const target = audio.value.currentTime + seconds
  audio.value.currentTime = Math.min(duration.value, Math.max(0, target))
  time.value = audio.value.currentTime
  if (ended.value && seconds < 0) {
    ended.value = false
    audio.value.play()
  }
}

// dragging the timeline
function seek(event) {
  if (status.value !== 'ready') return
  audio.value.currentTime = Number(event.target.value)
  time.value = audio.value.currentTime
}

function onLoadedMetadata() {
  if (audio.value.duration) duration.value = audio.value.duration
}

// a player that is created already open (for example a song that was removed and added again) starts right away
onMounted(() => {
  if (props.open) start()
})

watch(
  () => props.open,
  open => {
    if (open) {
      start()
    } else if (audio.value) {
      audio.value.pause()
    }
  }
)
</script>

<template>
  <div>
    <div v-if="open" class="song-player" :class="{ 'is-playing': playing }">
      <div class="player-top">
        <!-- cover, with equalizer bars that dance while the song plays -->
        <div class="player-cover">
          <img v-if="coverUrl" :src="coverUrl" alt="" class="player-art" />
          <span v-else class="player-art player-art--empty"><i class="bi bi-music-note-beamed"></i></span>

          <span class="equalizer" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </span>
        </div>

        <div class="player-meta">
          <strong class="player-title">{{ title }}</strong>
          <span class="player-artist">{{ artist }}</span>
          <span class="player-state" role="status" aria-live="polite">
            <template v-if="status === 'loading'">
              <span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Finding the preview…
            </template>
            <template v-else-if="status === 'missing'">No preview available for this song</template>
            <template v-else-if="status === 'error'">This preview could not be played</template>
            <template v-else-if="playing">Now playing · 30s preview</template>
            <template v-else-if="ended">Preview finished</template>
            <template v-else>Paused · 30s preview</template>
          </span>
        </div>

        <a
          v-if="track"
          :href="track.url"
          target="_blank"
          rel="noopener"
          class="player-link"
          title="Listen on Apple Music"
          aria-label="Listen on Apple Music"
        >
          <i class="bi bi-apple"></i>
        </a>
      </div>

      <!-- timeline: how much has played and how much is left -->
      <div class="player-timeline">
        <span class="player-time">{{ formatTime(time) }}</span>
        <input
          type="range"
          class="timeline-range"
          min="0"
          :max="duration"
          step="0.1"
          :value="time"
          :style="{ '--progress': progress + '%' }"
          :disabled="status !== 'ready'"
          aria-label="Seek"
          @input="seek"
        />
        <span class="player-time">-{{ formatTime(timeLeft) }}</span>
      </div>

      <!-- controls -->
      <div class="player-controls">
        <button type="button" class="control-btn" :disabled="status !== 'ready'" title="Replay from the start" aria-label="Replay from the start" @click="restart">
          <i class="bi bi-skip-start-fill"></i>
        </button>

        <button type="button" class="control-btn control-btn--skip" :disabled="status !== 'ready'" title="Back 5 seconds" aria-label="Back 5 seconds" @click="skip(-SKIP_SECONDS)">
          <i class="bi bi-rewind-fill"></i><small>5</small>
        </button>

        <button
          type="button"
          class="control-btn control-btn--play"
          :disabled="status !== 'ready'"
          :aria-label="ended ? 'Play again' : playing ? 'Pause' : 'Play'"
          @click="togglePlay"
        >
          <span v-if="status === 'loading'" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
          <i v-else class="bi" :class="ended ? 'bi-arrow-repeat' : playing ? 'bi-pause-fill' : 'bi-play-fill'"></i>
        </button>

        <button type="button" class="control-btn control-btn--skip" :disabled="status !== 'ready'" title="Forward 5 seconds" aria-label="Forward 5 seconds" @click="skip(SKIP_SECONDS)">
          <small>5</small><i class="bi bi-fast-forward-fill"></i>
        </button>

      </div>
    </div>

    <audio
      ref="audio"
      preload="none"
      @play="playing = true; ended = false"
      @pause="playing = false"
      @ended="playing = false; ended = true"
      @timeupdate="time = audio.currentTime"
      @loadedmetadata="onLoadedMetadata"
      @error="status = track ? 'error' : status"
    ></audio>
  </div>
</template>

<style scoped>
/* the card */
.song-player {
  margin-top: 4px;
  padding: 10px 14px 8px;
  border-radius: 16px;
  background: linear-gradient(135deg, #14234b 0%, #2b3c78 100%);
  color: #fff;
  box-shadow: 0 10px 26px rgba(20, 35, 75, 0.25);
  animation: player-in 0.3s ease;
}
@keyframes player-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.player-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* cover + equalizer */
.player-cover {
  position: relative;
  flex: none;
  width: 48px;
  height: 48px;
}
.player-art {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.15);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.player-art--empty {
  display: grid;
  place-items: center;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.8);
}
.is-playing .player-art {
  box-shadow: 0 0 0 3px rgba(255, 122, 184, 0.55), 0 8px 20px rgba(255, 122, 184, 0.35);
  animation: cover-pulse 1.8s ease-in-out infinite;
}
@keyframes cover-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}

.equalizer {
  position: absolute;
  left: 4px;
  bottom: 4px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  padding: 2px 3px;
  border-radius: 5px;
  background: rgba(20, 35, 75, 0.7);
}
.equalizer span {
  width: 2px;
  height: 100%;
  border-radius: 2px;
  background: #ff7ab8;
  transform-origin: bottom;
  transform: scaleY(0.25);
}
/* the bars only move while the song plays */
.is-playing .equalizer span {
  animation: equalize 0.9s ease-in-out infinite;
}
.equalizer span:nth-child(2) {
  animation-delay: -0.3s;
}
.equalizer span:nth-child(3) {
  animation-delay: -0.6s;
}
.equalizer span:nth-child(4) {
  animation-delay: -0.15s;
}
@keyframes equalize {
  0%,
  100% {
    transform: scaleY(0.25);
  }
  50% {
    transform: scaleY(1);
  }
}

/* title, artist, state */
.player-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}
.player-title {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-artist {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-state {
  margin-top: 1px;
  color: #ff9fcb;
  font-size: 11px;
}
.player-link {
  flex: none;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  text-decoration: none;
  transition: background 0.15s;
}
.player-link:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

/* timeline */
.player-timeline {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.player-time {
  flex: none;
  min-width: 34px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.timeline-range {
  flex: 1;
  height: 6px;
  margin: 0;
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  /* the pink part is how much of the clip has played */
  background: linear-gradient(to right, #ff7ab8 var(--progress, 0%), rgba(255, 255, 255, 0.25) var(--progress, 0%));
}
.timeline-range:disabled {
  cursor: default;
  opacity: 0.6;
}
.timeline-range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  appearance: none;
  -webkit-appearance: none;
}
.timeline-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}
.timeline-range:focus-visible::-webkit-slider-thumb {
  outline: 2px solid #ff7ab8;
  outline-offset: 2px;
}

/* buttons */
.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
}
.control-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  font-size: 18px;
  transition: background 0.15s, transform 0.15s, opacity 0.15s;
}
.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}
.control-btn:active:not(:disabled) {
  transform: scale(0.92);
}
.control-btn:disabled {
  opacity: 0.4;
}
.control-btn:focus-visible {
  outline: 2px solid #ff7ab8;
  outline-offset: 2px;
}
.control-btn--skip {
  border-radius: 20px;
}
.control-btn--skip small {
  font-size: 12px;
  font-weight: 700;
}
.control-btn--play {
  width: 42px;
  height: 42px;
  background: #fff;
  color: #14234b;
  font-size: 24px;
}
.control-btn--play:hover:not(:disabled) {
  background: #ffe6f1;
}
@media (prefers-reduced-motion: reduce) {
  .song-player,
  .is-playing .player-art,
  .is-playing .equalizer span {
    animation: none;
  }
}
</style>
