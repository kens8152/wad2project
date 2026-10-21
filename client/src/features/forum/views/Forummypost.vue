<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import Forumsearch from '../components/forumsearch.vue'
import Postcard from '../components/postcard.vue'

const props = defineProps({
  posts: { type: Array, default: () => [] },
})

const userStore = useUserStore()
const searchTerm = ref('')


const myPosts = computed(() => {
  const q = searchTerm.value.toLowerCase()
  return props.posts.filter(
    (p) =>
      p.user_id === userStore.user?.id &&
      (!q ||
        p.title.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q))),
  )
})
</script>

<template>
  <div class="vstack gap-3">
    <Forumsearch @search="searchTerm = $event" />

    <p v-if="searchTerm" class="text-body-secondary mb-0">
      Results for "{{ searchTerm }}"
      <button type="button" class="btn btn-link btn-sm p-0 ms-2" @click="searchTerm = ''">
        Clear
      </button>
    </p>

    <p v-if="!userStore.user" class="text-body-secondary">Sign in to see your posts.</p>

    <template v-else>
      <Postcard v-for="p in myPosts" :key="p.id" :post="p" />

      <p v-if="!myPosts.length" class="text-body-secondary">
        {{ searchTerm ? 'No posts match your search.' : "You haven't posted anything yet." }}
      </p>
    </template>
  </div>
</template>