<script setup>
import { ref, computed, inject, watch } from 'vue'
import Forumsearch from '../../components/forum/forumsearch.vue'
import Forumsort from '../../components/forum/forumsort.vue'
import Postcard from '../../components/forum/postcard.vue'
import WheelList from '../../components/forum/WheelList.vue'

const props = defineProps({
  posts: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
})

const searchTerm = ref('')
const DEFAULT_SORT = { key: 'date', dir: 'desc' }
const sort = ref({ ...DEFAULT_SORT })

const postTime = (p) => new Date(p.created_at).getTime() || 0
const sortValue = {
  date: postTime,
  upvotes: (p) => p.upvotes ?? 0,
  comments: (p) => p.replies?.length ?? 0,
}

const results = computed(() => {
  const q = searchTerm.value.toLowerCase()
  const filtered = !q
    ? props.posts
    : props.posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content?.toLowerCase().includes(q) ||
          p.username?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      )

  const get = sortValue[sort.value.key] ?? postTime
  const direction = sort.value.dir === 'asc' ? 1 : -1
  return [...filtered].sort((a, b) => (get(a) - get(b)) * direction || postTime(b) - postTime(a))
})


const resetCount = inject('forumReset', ref(0))
watch(resetCount, () => {
  searchTerm.value = ''
  sort.value = { ...DEFAULT_SORT }
})
</script>

<template>
  <div class="vstack gap-3">
    <Teleport defer to="#forum-filter-slot">
      <div class="forum-filter-bar">
        <Forumsearch v-model="searchTerm" />
        <Forumsort v-model="sort" />
      </div>
    </Teleport>

    <WheelList :items="results" v-slot="{ item }">
      <Postcard :post="item" />
    </WheelList>
  </div>
</template>
