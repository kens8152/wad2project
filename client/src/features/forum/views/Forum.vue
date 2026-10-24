<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Forumnav from '../components/forumnav.vue'
import Forumsearch from '../components/forumsearch.vue'
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

const results = computed (() =>{
    const q = searchTerm.value.toLowerCase()
    if (!q) {
        return postList.value
    }
    return postList.value.filter(p =>
        p.title.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.tags.some(t => t.includes(q))
    )
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
}

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
        
            <main class="d-flex p-3 justify-content-center flex-grow-1" style="min-width: 0">
                
                <div class="vstack gap-3">
                <template v-if="route.name === 'forum'">
                    <Forumsearch @search="searchTerm = $event" />
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

