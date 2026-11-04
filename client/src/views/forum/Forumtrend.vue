<script setup>
import { computed } from 'vue'
import Postcard from '../../components/forum/postcard.vue'
import TagDrums from '../../components/forum/TagDrums.vue'
import WheelList from '../../components/forum/WheelList.vue'
import { topTags as trendingTags } from '../../composables/forum/trendingTags.js'

const props = defineProps({
  posts: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
})

const byUpvotes = (a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0)

const topTags = computed(() => trendingTags(props.posts))

const topPosts = computed(() => [...props.posts].sort(byUpvotes).slice(0, 10))
</script>

<template>
  <div class="vstack gap-3">
    <TagDrums v-if="topTags.length" title="Trending tags" :tags="topTags" />

    <h5 class="px-3 mb-0">Trending posts</h5>

    <WheelList :items="topPosts" v-slot="{ item }">
      <Postcard :post="item" />
    </WheelList>

    <p v-if="!topPosts.length" class="text-body-secondary mx-3 mb-0">Nothing to show yet.</p>
  </div>
</template>
