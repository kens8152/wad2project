<script setup>
import { ref, computed } from 'vue'
import ForumMenuButton from '../../components/forum/forummenubutton.vue'
import Forumsearch from '../../components/forum/forumsearch.vue'
import Forumsort from '../../components/forum/forumsort.vue'
import Postcard from '../../components/forum/postcard.vue'
import WheelList from '../../components/forum/WheelList.vue'

const props = defineProps({
  posts: { type: Array, default: () => [] },
  tags: { type: Array, default: () => [] },
})

const searchTerm = ref('')
const sort = ref({ key: 'date', dir: 'desc' })

const postTime = (p) => new Date(p.created_at).getTime() || 0
const sortValue = {
  date: postTime,
  upvotes: (p) => p.upvotes ?? 0,
  comments: (p) => p.replies?.length ?? 0,
}

const lfgPosts = computed(() =>
  props.posts.filter((p) => p.tags?.some((t) => t.toLowerCase() === 'lfg')),
)

const results = computed(() => {
  const q = searchTerm.value.toLowerCase()
  const filtered = !q
    ? lfgPosts.value
    : lfgPosts.value.filter(
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
</script>

<template>
  <div class="vstack gap-3">
    <div class="forum-toolbar d-flex align-items-center gap-2 px-3">
      <ForumMenuButton />
      <div class="forum-filter-bar">
        <Forumsearch v-model="searchTerm" />
        <Forumsort v-model="sort" />
      </div>
    </div>

    <WheelList :items="results" v-slot="{ item }">
      <Postcard :post="item" />
    </WheelList>

    <p v-if="!results.length" class="text-body-secondary mx-3">
      {{ searchTerm ? 'No group posts match your search.' : 'No look-for-group posts yet.' }}
    </p>
  </div>
</template>
