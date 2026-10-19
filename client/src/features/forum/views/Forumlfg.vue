<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Forumnav from '../components/forumnav.vue'
import Forumsearch from '../components/forumsearch.vue'
import Postcard from '../components/postcard.vue'
import { posts, tags} from '../data/mockdata.js'


const lfgpost = computed (() => posts.filter(p => p.tags.includes('lfg')))
const searchTerm = ref('')

const results = computed (() =>{
    const q = searchTerm.value.toLowerCase()
    if (!q) {
        return lfgpost.value
    }
    return lfgpost.value.filter(p =>
        p.title.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.tags.some(t => t.includes(q))
    )
})



function onReset() {
    searchTerm.value = ''
}
</script>

<template>
    <div>
        <div class="d-flex flex-column flex-lg-row">
            <Forumnav @select="feed = $event" @reset="onReset" />
        
            <main class="d-flex p-3 justify-content-center flex-grow-1" style="min-width: 0">
                
                <div class="vstack gap-3">
                <Forumsearch @search="searchTerm = $event" />
                <Postcard v-for="r in results" :key="r.id" :post="r" />
                </div>
            </main>
        </div>
    </div>
</template>