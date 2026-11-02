<script setup>
import { computed } from 'vue'

const props = defineProps({
  song: { type: Object, required: true },
})

const src = computed(() => `https://open.spotify.com/embed/track/${encodeURIComponent(props.song.id)}?utm_source=generator`)
</script>

<template>
  <div class="song-embed">
    <iframe
      :src="src"
      :title="`${song.name} by ${song.artists} on Spotify`"
      width="100%"
      height="80"
      frameborder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    ></iframe>
  </div>
</template>

<style scoped>
.song-embed {
  width: min(300px, 100%);
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #282828;
}
.song-embed iframe {
  display: block;
  border: 0;
}
</style>
