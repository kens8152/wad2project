<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { isVideo } from '../../composables/forum/media.js'


const photos = defineModel({ type: Array, default: () => [] })

const MAX_PHOTOS = 4
const MAX_PHOTO_MB = 5
const MAX_VIDEO_MB = 50

const error = ref('')

function onPick(e) {
  error.value = ''
  const picked = [...e.target.files]
  e.target.value = ''
  const next = [...photos.value]
  for (const file of picked) {
    if (next.length >= MAX_PHOTOS) {
      error.value = `You can add up to ${MAX_PHOTOS} photos or videos.`
      break
    }
    const video = file.type.startsWith('video/')
    if (!video && !file.type.startsWith('image/')) {
      error.value = `${file.name} is not a photo or video.`
      continue
    }
    const limit = video ? MAX_VIDEO_MB : MAX_PHOTO_MB
    if (file.size > limit * 1024 * 1024) {
      error.value = `${file.name} is bigger than ${limit} MB.`
      continue
    }
    next.push({ file, url: URL.createObjectURL(file) })
  }
  photos.value = next
}

function remove(i) {
  const photo = photos.value[i]
  if (photo.file) URL.revokeObjectURL(photo.url)
  photos.value = photos.value.filter((_, j) => j !== i)
  error.value = ''
}

onBeforeUnmount(() => {
  photos.value.forEach((p) => p.file && URL.revokeObjectURL(p.url))
})
</script>

<template>
  <div>
    <span class="form-label d-block">
      Photos &amp; videos <span class="text-body-secondary small">(optional, up to {{ MAX_PHOTOS }})</span>
    </span>
    <div class="d-flex flex-wrap gap-2">
      <div v-for="(p, i) in photos" :key="p.url" class="photo-thumb">
        <template v-if="isVideo(p)">
          <video :src="p.url" muted playsinline preload="metadata"></video>
          <i class="bi bi-play-circle-fill video-badge" aria-hidden="true"></i>
        </template>
        <img v-else :src="p.url" :alt="`Photo ${i + 1}`" />
        <button
          type="button"
          class="photo-remove btn-close"
          :aria-label="`Remove item ${i + 1}`"
          @click="remove(i)"
        ></button>
      </div>
      <label v-if="photos.length < MAX_PHOTOS" class="photo-add" title="Add photos or videos">
        <i class="bi bi-images fs-4"></i>
        <span class="small">Add</span>
        <input type="file" accept="image/*,video/*" multiple class="visually-hidden" @change="onPick" />
      </label>
    </div>
    <div v-if="error" class="form-text text-danger">{{ error }}</div>
  </div>
</template>

<style scoped>
.photo-thumb,
.photo-add {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 12px;
  overflow: hidden;
}
.photo-thumb img,
.photo-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.video-badge {
  position: absolute;
  left: 6px;
  bottom: 4px;
  color: #fff;
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 0.3rem;
  font-size: 0.55rem;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  opacity: 1;
}
.photo-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  border: 1.5px dashed var(--riffle-faint);
  color: var(--riffle-muted);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}
.photo-add:hover,
.photo-add:focus-within {
  border-color: #7c4dff;
  color: #7c4dff;
  background: color-mix(in srgb, #7c4dff 6%, transparent);
}
</style>
