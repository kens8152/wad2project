<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Forumnav from '../components/forumnav.vue'
import Forumsearch from '../components/forumsearch.vue'
import Postcard from '../components/postcard.vue'
import { posts, tags} from '../data/mockdata.js'

const selectedTag = ref(null)

const topTags = computed (() =>{
    const counts = {}
    for (const p of posts) {
        for (const t of p.tags) {
            counts[t] = (counts[t] ?? 0) +1
        }
    }
    return Object.entries(counts).map(([name,count]) => ({name,count})).sort((a,b) => b.count-a.count).slice(0,5)
})

const topPosts = computed (() => {
    return [...posts].sort((a,b) => (b.upvotes ?? 0 ) - (a.upvotes??0)).slice(0,10)
})

function displayTagPost(name) {
    selectedTag.value = selectedTag.value === name? null : name
}

const shownPosts = computed(() => {
  if (!selectedTag.value) return topPosts.value
  return posts
    .filter(p => p.tags.includes(selectedTag.value))
    .sort((a, b) => (b.upvotes ?? 0) - (a.upvotes ?? 0))
})

function onReset() {
  selectedTag.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
    <div>
        <div class="d-flex flex-column flex-lg-row">
            <Forumnav @select="feed = $event" @reset="onReset" />
        
            <main class=" p-3  flex-grow-1" style="min-width: 0">
                <h5 class="mb-2">Trending tags</h5>
                <div class="d-flex flex-wrap column-gap-2 row-gap-1 align-items-start mb-4">
                    <span v-for="t in topTags" :key="t.name" class="badge fs-6" :class="selectedTag === t.name ? 'text-bg-success' : 'text-bg-primary'" role="button" @click="displayTagPost(t.name)">
                    #{{ t.name }}
                    <span class="opacity-75 ms-1">{{ t.count }}</span>
                    </span>
                </div>


                <h5 class="mb-2">
                {{ selectedTag ? `Posts tagged #${selectedTag}` : 'Trending posts' }}
                </h5>
                <div class="vstack gap-3">
                <Postcard v-for="r in shownPosts" :key="r.id" :post="r" />
                </div>
            </main>
        </div>
    </div>
</template>