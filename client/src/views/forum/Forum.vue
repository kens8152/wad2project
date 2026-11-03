<script setup>
import '@/assets/styles/forum.css'
import { ref, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import Forumnav from '../../components/forum/forumnav.vue'
import { useUserStore } from '@/stores/user'
import { fetchPosts, fetchTags, createPost, uploadPostImage } from '../../services/forum/forumapi.js'
import Addpost from '../../components/forum/addpost.vue'
import { provideTrendingTags } from '../../composables/forum/trendingTags.js'

const userStore = useUserStore()
const postList = ref([])
const tags = ref([])
const loading = ref(true)
const route = useRoute()
const TOOLBAR_ROUTES = ['forum', 'forum-lfg', 'forum-saved', 'forum-mypost']
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
    <div>
        <div class="d-flex flex-column flex-lg-row">
            <Forumnav @reset="resetCount++" />
            <main
                class="d-flex justify-content-center flex-grow-1 px-3"
                :class="TOOLBAR_ROUTES.includes(route.name) ? '' : 'pt-3'"
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
        <Addpost :tags="tags" @create="addPost" />
    </div>
</template>
