<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, provide } from 'vue'
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

// Sorting: newest first by default
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
    // Ties are broken by newest first
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

// Lets child pages (such as the post detail page) keep this list up to date
// after they edit or delete something, so the cards never show stale data.
provide('forumPosts', {
    // Merge changes into one post, e.g. patch(id, { title, content, tags })
    patch(id, changes) {
        postList.value = postList.value.map(p => (p.id === id ? { ...p, ...changes } : p))
    },
    // Remove a deleted post
    remove(id) {
        postList.value = postList.value.filter(p => p.id !== id)
    },
})

// The highest upvote count in the feed. Post cards use it to decide how hot their border is.
provide('maxUpvotes', computed(() => Math.max(0, ...postList.value.map((p) => p.upvotes ?? 0))))

// ----- Wheel curve effect (forum home page only) -----
// Cards in the middle of the screen are full size. The further a card is from the middle,
// the more it tilts back, shrinks and fades, as if it were on the rim of a wheel.
const WHEEL = {
    deadZone: 0.3,     // share of the half-height around the middle where cards stay flat and full size
    maxTilt: 40,       // degrees of tilt at the very top and bottom
    minScale: 0.78,    // size of a card at the very top and bottom
    minOpacity: 0.45,  // opacity of a card at the very top and bottom
    perspective: 1200, // higher = flatter, lower = more dramatic
    rampDistance: 150, // pixels of scrolling over which the effect fades in from nothing
}

const rootEl = ref(null)
const wheelList = ref(null)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let scrollTarget = window
let ticking = false

function applyWheel() {
    const list = wheelList.value
    if (!list) return
    const items = list.querySelectorAll('.wheel-item')

    if (reduceMotion.matches) {
        items.forEach((el) => {
            el.style.transform = ''
            el.style.opacity = ''
        })
        return
    }

    const area =
        scrollTarget === window
            ? { top: 0, height: window.innerHeight }
            : scrollTarget.getBoundingClientRect()
    const half = area.height / 2 || 1
    const middle = area.top + half

    // 0 at the very top of the page (everything looks normal), 1 once scrolled past rampDistance
    const scrolled = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop
    const strength = Math.max(0, Math.min(1, scrolled / WHEEL.rampDistance))

    items.forEach((el) => {
        const rect = el.getBoundingClientRect()
        // -1 at the top of the scroll area, 0 in the middle, 1 at the bottom
        const d = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - middle) / half))
        const t = Math.max(0, (Math.abs(d) - WHEEL.deadZone) / (1 - WHEEL.deadZone)) * strength
        const eased = t * t

        const tilt = -Math.sign(d) * t * WHEEL.maxTilt
        const scale = 1 - (1 - WHEEL.minScale) * eased
        const opacity = 1 - (1 - WHEEL.minOpacity) * eased

        el.style.transform = `perspective(${WHEEL.perspective}px) rotateX(${tilt}deg) scale(${scale})`
        el.style.opacity = String(opacity)
    })
}

function onScrollOrResize() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
        ticking = false
        applyWheel()
    })
}

watch([results, () => route.name], () => nextTick(applyWheel))

onMounted(() => {
    scrollTarget = rootEl.value?.closest('.app-main') ?? window
    scrollTarget.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    reduceMotion.addEventListener('change', onScrollOrResize)
})

onBeforeUnmount(() => {
    scrollTarget.removeEventListener('scroll', onScrollOrResize)
    window.removeEventListener('resize', onScrollOrResize)
    reduceMotion.removeEventListener('change', onScrollOrResize)
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
    <div ref="rootEl">
        <div class="d-flex flex-column flex-lg-row">
            <Forumnav @select="feed = $event" @reset="onReset" />
            <main
                class="d-flex justify-content-center flex-grow-1 px-3"
                :class="route.name === 'forum' ? '' : 'pt-3'"
                style="min-width: 0; padding-bottom: 6rem"
            >
                <div class="vstack gap-3">
                    <template v-if="route.name === 'forum'">
                        <!-- Search and sort side by side; this row is the sticky one -->
                        <div class="forum-toolbar d-flex align-items-center gap-2 px-3">
                            <Forumsearch @search="searchTerm = $event" />
                            <Forumsort v-model="sort" />
                        </div>

                        <div ref="wheelList" class="wheel-list vstack gap-3">
                            <div v-for="r in results" :key="r.id" class="wheel-item">
                                <Postcard :post="r" />
                            </div>
                        </div>
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


.wheel-list {
    overflow-x: clip;
}
.wheel-item {
    position: relative;
    transform-origin: center;
    will-change: transform, opacity;
}

.wheel-item:hover,
.wheel-item:focus-within {
    z-index: 5;
}
</style>