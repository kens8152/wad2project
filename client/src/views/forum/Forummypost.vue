<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import ForumMenuButton from '../../components/forum/forummenubutton.vue'
import Forumsearch from '../../components/forum/forumsearch.vue'
import Forumsort from '../../components/forum/forumsort.vue'
import Postcard from '../../components/forum/postcard.vue'
import WheelList from '../../components/forum/WheelList.vue'

const props = defineProps({
  posts: { type: Array, default: () => [] },
})

const userStore = useUserStore()
const searchTerm = ref('')
const sort = ref({ key: 'date', dir: 'desc' })

const postTime = (p) => new Date(p.created_at).getTime() || 0
const sortValue = {
  date: postTime,
  upvotes: (p) => p.upvotes ?? 0,
  comments: (p) => p.replies?.length ?? 0,
}

const myPosts = computed(() => {
  const q = searchTerm.value.toLowerCase()
  const filtered = props.posts.filter(
    (p) =>
      p.user_id === userStore.user?.id &&
      (!q ||
        p.title.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))),
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
      <Forumsearch v-model="searchTerm" />
      <Forumsort v-model="sort" />
    </div>

    <p v-if="!userStore.user" class="text-body-secondary mx-3">Sign in to see your posts.</p>

    <template v-else>
      <WheelList :items="myPosts" v-slot="{ item }">
        <Postcard :post="item" />
      </WheelList>

      <p v-if="!myPosts.length" class="text-body-secondary mx-3">
        {{ searchTerm ? 'No posts match your search.' : "You haven't posted anything yet." }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.forum-toolbar {
  position: sticky;
  top: 0;
  z-index: 1020;
  height: var(--forum-search-height, 3.5rem);
  background: var(--bs-body-bg);
}
</style>