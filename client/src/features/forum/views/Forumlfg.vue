<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Forumnav from '../components/forumnav.vue'
import Forumsearch from '../components/forumsearch.vue'
import Postcard from '../components/postcard.vue'


const props = defineProps({
     posts: { type: Array, default: () => [] },
     tags: { type: Array, default: () => [] },
})

const searchTerm = ref('')

const lfgpost = computed (() => props.posts.filter(p => p.tags.includes('lfg')))

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
        
            <main class="d-flex p-3 justify-content-center flex-grow-1" style="min-width: 0">
                
                <div class="vstack gap-3">
                <Forumsearch @search="searchTerm = $event" />
                <Postcard v-for="r in results" :key="r.id" :post="r" />
                </div>
            </main>
        </div>
    </div>
</template>