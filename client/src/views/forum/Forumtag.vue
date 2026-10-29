<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Forumnav from '../../components/forum/forumnav.vue'
import Forumsearch from '../../components/forum/forumsearch.vue'
import Postcard from '../../components/forum/postcard.vue'


const props = defineProps({
     posts: { type: Array, default: () => [] },
     tags: { type: Array, default: () => [] },
})

const selectedTags = ref([])
const adding = ref(false)
const feed = ref('explore')
const searchTerm = ref('')

const lowerSearch = computed(() => searchTerm.value.trim().toLowerCase())

const toggleDisplay = computed(() =>{
    return selectedTags.value.length === 0 || adding.value
})

const tagsFilter = computed(() => props.tags.filter(t => !selectedTags.value.includes(t.name) && t.name.toLowerCase().includes(lowerSearch.value)))

const postFilter = computed(() =>
  props.posts.filter(p => selectedTags.value.every(t => p.tags.includes(t))).filter(p => {
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
</script>

<template>
    <div>
        <div class="d-flex flex-column flex-lg-row">
            <div class="d-flex flex-column flex-grow-1" style="min-width: 0">
                <div v-if="selectedTags.length>0" class="d-flex flex-wrap align-items-center gap-2 px-3 pt-3">
                        <span v-for="s in selectedTags" :key="s" class="badge text-bg-primary fs-6 d-inline-flex align-items-center gap-2">
                            #{{ s }}
                            <button type="button" class="btn-close btn-close-white" style="font-size: 0.6rem" @click="removeTag(s)"></button>
                        </span>
                        <button class="btn btn-sm btn-outline-primary" @click="adding = true">
                            +
                        </button>
                </div>
                <Forumsearch :active="searchTerm" @search="searchTerm = $event" />
                <main  class="p-3 flex-grow-1" style="min-width: 0">
                    <div v-if="toggleDisplay" class="d-flex flex-wrap column-gap-2 row-gap-1 align-items-start" >
                        <div class="card" v-for="t in tagsFilter" @click="addTag(t.name)">
                            <div class="card-body">
                                <p class="mb-0">#{{ t.name }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else  class="vstack gap-3">
                    <Postcard  v-for="r in postFilter" :key="r.id" :post="r" />
                    </div>
                </main>
            </div>
        </div>
    </div>  
</template>