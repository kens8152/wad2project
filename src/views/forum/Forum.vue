<script setup>
import '@/assets/styles/forum.css'
import { ref, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import Forumnav from '../../components/forum/forumnav.vue'
import ForumMenuButton from '../../components/forum/forummenubutton.vue'
import { useUserStore } from '@/stores/user'
import { fetchPosts, fetchTags, createPost, uploadPostImage } from '../../services/forum/forumapi.js'
import Addpost from '../../components/forum/addpost.vue'
import { provideTrendingTags } from '../../composables/forum/trendingTags.js'

const userStore = useUserStore()
const postList = ref([])
const tags = ref([])
const loading = ref(true)
const route = useRoute()
async function addPost(p) {
    if (!userStore.user) return
    try {
        const { files = [], ...fields } = p
        const images = await Promise.all(files.map(uploadPostImage))
        const saved = await createPost({ ...fields, images, username: userStore.user.name })
        postList.value.unshift(saved)
    } catch (e) {
        console.error(e)
        if (p.files?.length) window.alert(`Could not upload your photos: ${e.message}`)
    }
}

const resetCount = ref(0)
provide('forumReset', resetCount)

provideTrendingTags(postList)

provide('forumPosts', {
    patch(id, changes) {
        postList.value = postList.value.map(p => (p.id === id ? { ...p, ...changes } : p))
    },
    remove(id) {
        postList.value = postList.value.filter(p => p.id !== id)
    },
})

onMounted(async () => {
    try {
        ;[postList.value, tags.value] = await Promise.all([fetchPosts(), fetchTags()])
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <div class="forum-page">
        <div class="d-flex flex-column flex-lg-row">
            <div class="forum-nav-slot" :class="{ 'is-post': route.name === 'post-detail' }">
                <Forumnav @reset="resetCount++" />
            </div>
            <div class="d-flex flex-column flex-grow-1" style="min-width: 0">
                <div class="forum-topbar" :class="{ 'is-post': route.name === 'post-detail' }">
                    <ForumMenuButton v-if="route.name !== 'post-detail'" />
                    <div id="forum-filter-slot" class="forum-topbar__slot"></div>
                </div>
                <main
                    class="d-flex justify-content-center flex-grow-1 px-3 pt-2"
                    style="min-width: 0; padding-bottom: 6rem"
                >
                    <div class="vstack gap-3">
                        <RouterView v-slot="{ Component }">
                            <component
                                :is="Component"
                                :posts="postList"
                                :tags="tags"
                            />
                        </RouterView>
                    </div>
                </main>
            </div>
        </div>
        <div class="forum-nav-slot" :class="{ 'is-post': route.name === 'post-detail' }">
            <Addpost :tags="tags" @create="addPost" />
        </div>
    </div>
</template>

<style scoped>
.forum-nav-slot {
    display: contents;
}
@media (max-width: 991.98px) {
    .forum-nav-slot.is-post {
        display: none;
    }
}
.forum-topbar {
    position: sticky;
    top: 0;
    z-index: 1020;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
}
.forum-topbar.is-post {
    position: static;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
}
.forum-topbar__slot {
    display: flex;
    align-items: center;
    flex-grow: 1;
    min-width: 0;
    min-height: 3.625rem;
}
.forum-topbar :deep(.forum-menu-btn) {
    padding: 0.375rem 0.75rem;
}
@media (min-width: 992px) {
    .forum-topbar {
        padding: 0.75rem 2rem 0.5rem;
    }
    .forum-topbar:has(.forum-topbar__slot:empty) {
        display: none;
    }
}
</style>
