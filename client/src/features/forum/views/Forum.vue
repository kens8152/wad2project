<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Forumnav from '../components/forumnav.vue'
import Forumsearch from '../components/forumsearch.vue'
import Postcard from '../components/postcard.vue'
import { posts, tags} from '../data/mockdata.js'

const router = useRouter()
const post = ref(posts)
</script>

<template>
    <div style="--forum-search-height: 3.5rem">
    <Forumsearch />
        <div class="d-flex flex-column flex-lg-row">
            <Forumnav />

            <main class="d-flex p-3 justify-content-center flex-grow-1" style="min-width: 0">
                <div class="vstack gap-3">
                <Postcard v-for="p in posts" :key="p.id" :post="p" />
                </div>
            </main>
        </div>
    </div>
</template>

