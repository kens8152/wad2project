<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import Forumnav from '../components/forumnav.vue'
import Forumsearch from '../components/forumsearch.vue'
import Forumsort from '../components/forumsort.vue'
import Postcard from '../components/postcard.vue'
import { useUserStore } from '@/stores/user'
import { fetchPosts, fetchTags, createPost } from '../API/forumapi.js'
import Addpost from '../components/addpost.vue'

const userStore = useUserStore()
const postList = ref([])
const tags = ref([])
const loading = ref(true)
const route = useRoute()
const searchTerm = ref('')
const feed = ref('explore')


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
        ? postList.value
        : postList.value.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.content?.toLowerCase().includes(q) ||
            p.username?.toLowerCase().includes(q) ||
            p.tags?.some(t => t.toLowerCase().includes(q))
        )

    const get = sortValue[sort.value.key] ?? postTime
    const direction = sort.value.dir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => (get(a) - get(b)) * direction || postTime(b) - postTime(a))
})

async function addPost(p) {
     if (!userStore.user) return 
     try {
       const saved = await createPost({ ...p, username: userStore.user.name })
       postList.value.unshift(saved)
     } catch (e) {
       console.error(e)
     }
}

function onReset() {
    searchTerm.value = ''
    sort.value = { ...DEFAULT_SORT }
}


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
            <Forumnav @select="feed = $event" @reset="onReset" />
        
            <main
                class="d-flex justify-content-center flex-grow-1 px-3"
                :class="route.name === 'forum' ? '' : 'pt-3'"
                style="min-width: 0; padding-bottom: 6rem"
            >
                
                <div class="vstack gap-3">
                <template v-if="route.name === 'forum'">
                    <div class="forum-toolbar d-flex align-items-center gap-2 px-3">
                        <Forumsearch @search="searchTerm = $event" />
                        <Forumsort v-model="sort" />
                    </div>
                    <Postcard v-for="r in results" :key="r.id" :post="r" />
                </template>

                <RouterView v-else v-slot="{ Component }">
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

<style scoped>
.forum-toolbar {
    position: sticky;
    top: 0;
    z-index: 1020;
    height: var(--forum-search-height, 3.5rem);
    background: var(--bs-body-bg);
}
</style>