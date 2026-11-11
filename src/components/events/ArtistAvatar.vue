<script setup>
import { computed } from 'vue'

// Placeholder avatar: initials on a hue-derived gradient. Becomes an <img>
// automatically once an artist has an `image` URL.
const props = defineProps({
  name: { type: String, required: true },
  hue: { type: Number, default: 220 }, // 0 to 360, a position on the colour wheel (see mockData.js)
  image: { type: String, default: '' }, // optional picture URL
  size: { type: Number, default: 40 }, // diameter in pixels
  ring: { type: Boolean, default: false }, // a white outline (used when avatars overlap in FriendStack)
})

// "Falling Islands" → "FI": drop symbols, split on spaces, take the first letter of the first two words
const initials = computed(() =>
  props.name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join(''),
)

// The size and colours come from the props, so one component works at any size.
// The gradient runs from the hue to a hue 40 steps further round the colour wheel (`% 360` wraps past 360 back to 0).
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(10, props.size * 0.36)}px`, // the letters scale with the circle, but never below 10px
  // a picture sits on top of the gradient, so an artist whose picture is missing still shows a coloured circle
  background: props.image
    ? `center / cover url(${props.image}), linear-gradient(135deg, hsl(${props.hue} 70% 38%), hsl(${(props.hue + 40) % 360} 75% 22%))`
    : `linear-gradient(135deg, hsl(${props.hue} 70% 38%), hsl(${(props.hue + 40) % 360} 75% 22%))`,
}))
</script>

<template>
  <span class="artist-avatar" :class="{ 'artist-avatar--ring': ring }" :style="style" :title="name">
    <template v-if="!image">{{ initials }}</template>
  </span>
</template>

<style scoped>
.artist-avatar {
  flex: none;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.02em;
  user-select: none;
}
.artist-avatar--ring {
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--riffle-border);
}
</style>
