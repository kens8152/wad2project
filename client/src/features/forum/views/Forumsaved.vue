<script setup>
import { ref, computed } from 'vue'
import Forumsearch from '../components/forumsearch.vue'
import Postcard from '../components/postcard.vue'
import { useSavedPosts } from '../composables/savedpost.js'

const props = defineProps({
  posts: { type: Array, default: () => [] },
})

const { isSaved } = useSavedPosts()
const searchTerm = ref('')


const savedPosts = computed(() => {
  const q = searchTerm.value.toLowerCase()
  return props.posts.filter(
    (p) =>
      isSaved(p.id) &&
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

    <Postcard v-for="p in savedPosts" :key="p.id" :post="p" />

    <p v-if="!savedPosts.length" class="text-body-secondary">
      {{ searchTerm ? 'No saved posts match your search.' : "You haven't saved any posts yet." }}
    </p>
  </div>
</template>