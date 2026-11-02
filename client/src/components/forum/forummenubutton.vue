<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useForumNav } from '../../composables/forum/forumNav.js'

const { searchButtons, toggle } = useForumNav()

onMounted(() => searchButtons.value++)
onBeforeUnmount(() => searchButtons.value--)
</script>

<template>
  <button
    type="button"
    class="forum-menu-btn btn border-0 rounded-3 d-lg-none flex-shrink-0"
    aria-label="Open forum menu"
    @click="toggle"
  >
    <i class="bi bi-list fs-5"></i>
  </button>
</template>

<style scoped>
.forum-menu-btn {
  padding: 0.35rem 0.5rem;
}
.forum-menu-btn:hover {
  background-color: var(--bs-secondary-bg);
}
</style>
