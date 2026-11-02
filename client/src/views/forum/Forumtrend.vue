<script setup>
import { ref, computed } from 'vue'
import Postcard from '../../components/forum/postcard.vue'
import TagDrums from '../../components/forum/TagDrums.vue'
import WheelList from '../../components/forum/WheelList.vue'
import { topTags as trendingTags } from '../../composables/forum/trendingTags.js'

const props = defineProps({
  posts: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
})

const selectedTag = ref(null)

const byUpvotes = (a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0)

const topTags = computed(() => trendingTags(props.posts))

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

    <WheelList :items="shownPosts" v-slot="{ item }">
      <Postcard :post="item" />
    </WheelList>

    <p v-if="!shownPosts.length" class="text-body-secondary mx-3 mb-0">Nothing to show yet.</p>
  </div>
</template>