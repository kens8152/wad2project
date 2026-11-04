<script setup>
import { computed } from 'vue'
import { isVideo } from '../../composables/forum/media.js'

const props = defineProps({
  images: { type: Array, default: () => [] },
  max: { type: Number, default: Infinity },
  linked: { type: Boolean, default: false },
})

const shown = computed(() => props.images.slice(0, props.max))
const hidden = computed(() => props.images.length - shown.value.length)
</script>

<template>
  <div v-if="images.length" class="post-images" :class="{ single: shown.length === 1 }">
    <component
      :is="linked && !isVideo(src) ? 'a' : 'div'"
      v-for="(src, i) in shown"
      :key="src"
      class="post-image"
      :class="{ 'is-video': isVideo(src) }"
      :href="linked && !isVideo(src) ? src : null"
      :target="linked && !isVideo(src) ? '_blank' : null"
      :rel="linked && !isVideo(src) ? 'noopener' : null"
    >
      <template v-if="isVideo(src)">
        <video
          :src="linked ? src : `${src}#t=0.1`"
          :controls="linked"
          :muted="!linked"
          playsinline
          preload="metadata"
        ></video>
        <i v-if="!linked" class="bi bi-play-circle-fill play" aria-hidden="true"></i>
      </template>
      <img v-else :src="src" :alt="`Photo ${i + 1}`" loading="lazy" />
      <span v-if="hidden && i === shown.length - 1" class="more">+{{ hidden }}</span>
    </component>
  </div>
</template>

<style scoped>
.post-images {
  max-width: 560px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.4rem;
}
.post-image {
  position: relative;
  display: block;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--riffle-border);
}
.post-images.single {
  grid-template-columns: minmax(0, 1fr);
}
.post-images.single .post-image {
  aspect-ratio: auto;
}
.post-image img,
.post-image video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.post-image video {
  background: #000;
}
.post-images.single .post-image img,
.post-images.single .post-image video {
  height: auto;
  max-height: 360px;
}
.post-images.single .post-image video {
  object-fit: contain;
}
.play {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 2.6rem;
  opacity: 0.9;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45));
  pointer-events: none;
}
.post-images:not(.single) .post-image:last-child:nth-child(odd) {
  grid-column: span 2;
  aspect-ratio: 2;
}
.more {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 31, 75, 0.5);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 800;
}
</style>
