<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Forumnav from '../../components/forum/forumnav.vue'
import ForumMenuButton from '../../components/forum/forummenubutton.vue'
import Forumsearch from '../../components/forum/forumsearch.vue'
import Postcard from '../../components/forum/postcard.vue'
import { tagStyle } from '../../composables/forum/tagColor.js'
import { useTrendingTags } from '../../composables/forum/trendingTags.js'


const props = defineProps({
     posts: { type: Array, default: () => [] },
     tags: { type: Array, default: () => [] },
})

const selectedTags = ref([])
const adding = ref(false)
const feed = ref('explore')
const searchTerm = ref('')
const isTrending = useTrendingTags()
const route = useRoute()
const router = useRouter()

const lowerSearch = computed(() => searchTerm.value.trim().toLowerCase())

const toggleDisplay = computed(() =>{
    return selectedTags.value.length === 0 || adding.value
})

const tagsFilter = computed(() => props.tags.filter(t => !selectedTags.value.includes(t.name) && t.name.toLowerCase().includes(lowerSearch.value)))

const postFilter = computed(() =>
  props.posts.filter(p => selectedTags.value.every(t => p.tags?.some(pt => pt.toLowerCase() === t.toLowerCase()))).filter(p => {
      if (!lowerSearch.value) return true
      return (
        p.title?.toLowerCase().includes(lowerSearch.value) ||
        p.content?.toLowerCase().includes(lowerSearch.value)
      )
    })
)

function addTag(name) {
    selectedTags.value.push(name);
    adding.value = false
}

function removeTag(name) {
  selectedTags.value = selectedTags.value.filter(t => t !== name)
}

function onReset() {
  selectedTags.value = []
  adding.value = false
  searchTerm.value = ''
}

watch(toggleDisplay, () => {
  searchTerm.value = ''
})


const sameTags = (a, b) => a.length === b.length && a.every((t, i) => t === b[i])

watch(
  () => route.query.tag,
  (q) => {
    const fromUrl = [].concat(q ?? [])
    if (!sameTags(fromUrl, selectedTags.value)) {
      selectedTags.value = fromUrl
      adding.value = false
    }
  },
  { immediate: true },
)

watch(
  selectedTags,
  (tags) => {
    if (sameTags([].concat(route.query.tag ?? []), tags)) return
    router.replace({ query: { ...route.query, tag: tags.length ? tags : undefined } })
  },
  { deep: true },
)
</script>

<template>
    <div>
        <div class="d-flex flex-column flex-lg-row">
            <div class="d-flex flex-column flex-grow-1" style="min-width: 0">
                <div v-if="selectedTags.length>0" class="d-flex flex-wrap align-items-center gap-2 px-3 pt-3">
                        <span v-for="s in selectedTags" :key="s" class="badge forum-tag fs-6 d-inline-flex align-items-center gap-2" :style="tagStyle(s)">
                            #{{ s }}
                            <i v-if="isTrending(s)" class="bi bi-fire forum-fire" title="Trending tag"></i>
                            <button type="button" class="btn-close" style="font-size: 0.6rem" @click="removeTag(s)"></button>
                        </span>
                        <button class="btn btn-sm btn-outline-primary" @click="adding = true">
                            +
                        </button>
                </div>
                <div class="d-flex align-items-center gap-2 px-3 px-lg-0">
                    <ForumMenuButton />
                    <div class="forum-filter-bar">
                        <Forumsearch v-model="searchTerm" />
                    </div>
                </div>
                <main  class="p-3 flex-grow-1" style="min-width: 0">
                    <div v-if="toggleDisplay" class="d-flex flex-wrap column-gap-3 row-gap-4 align-items-start pb-2">
                        <button
                            v-for="t in tagsFilter"
                            :key="t.name"
                            type="button"
                            class="tag-bubble"
                            :style="tagStyle(t.name)"
                            @click="addTag(t.name)"
                        >
                            <span class="tag-bubble__hash">#</span>{{ t.name }}
                            <i v-if="isTrending(t.name)" class="bi bi-fire forum-fire" title="Trending tag"></i>
                        </button>
                    </div>
                    <div v-else  class="vstack gap-3">
                    <Postcard  v-for="r in postFilter" :key="r.id" :post="r" />
                    </div>
                </main>
            </div>
        </div>
    </div>  
</template>

<style scoped>
.tag-bubble {
    --bubble-light: color-mix(in srgb, var(--tag) 22%, var(--riffle-surface));
    --bubble-dark: color-mix(in srgb, var(--tag) 34%, var(--riffle-surface));
    --bubble-line: color-mix(in srgb, var(--tag) 65%, var(--riffle-ink));
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 0.7rem 1.1rem;
    border: 2px solid var(--bubble-line);
    border-radius: 14px;
    background: linear-gradient(90deg, var(--bubble-light) 55%, var(--bubble-dark) 55%);
    color: var(--bubble-line);
    font-weight: 700;
    line-height: 1.2;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tag-bubble::after {
    content: '';
    position: absolute;
    left: 58%;
    bottom: -9px;
    width: 14px;
    height: 14px;
    background: var(--bubble-dark);
    border-right: 2px solid var(--bubble-line);
    border-bottom: 2px solid var(--bubble-line);
    border-bottom-right-radius: 3px;
    transform: rotate(45deg);
}
.tag-bubble__hash {
    margin-right: 0.15rem;
    font-size: 1.15em;
    font-weight: 800;
}
.tag-bubble:hover,
.tag-bubble:focus-visible {
    transform: translateY(-2px) rotate(-2deg);
    box-shadow: 0 6px 14px color-mix(in srgb, var(--tag) 25%, transparent);
}
.tag-bubble:active {
    transform: translateY(0) scale(0.97);
}
</style>
