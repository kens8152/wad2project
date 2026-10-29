<script setup>
import { ref, computed } from 'vue'
import Postcard from '../../components/forum/postcard.vue'
import TagDrums from '../../components/forum/TagDrums.vue'

const props = defineProps({
  posts: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
})

const selectedTag = ref(null)

const byUpvotes = (a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0)

const topTags = computed(() => {
  const map = new Map()
  for (const post of props.posts) {
    const seen = new Set()
    for (const raw of post.tags ?? []) {
      const key = raw.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const entry = map.get(key) ?? { key, name: raw, count: 0 }
      entry.count++
      map.set(key, entry)
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5)
})

const topPosts = computed(() => [...props.posts].sort(byUpvotes).slice(0, 10))

const selectedKey = computed(() => selectedTag.value?.toLowerCase() ?? '')

function displayTagPost(name) {
  selectedTag.value = selectedTag.value === name ? null : name
}

const shownPosts = computed(() => {
  if (!selectedTag.value) return topPosts.value
  return props.posts
    .filter((p) => p.tags?.some((t) => t.toLowerCase() === selectedKey.value))
    .sort(byUpvotes)
})
</script>

<template>
  <div class="vstack gap-3">
    <TagDrums
      v-if="topTags.length"
      title="Trending tags"
      :tags="topTags"
      :selected="selectedKey"
      @select="displayTagPost"
    />

    <h5 class="px-3 mb-0">
      {{ selectedTag ? `Posts tagged #${selectedTag}` : 'Trending posts' }}
    </h5>

    <Postcard v-for="r in shownPosts" :key="r.id" :post="r" />

    <p v-if="!shownPosts.length" class="text-body-secondary mx-3 mb-0">Nothing to show yet.</p>
  </div>
</template>