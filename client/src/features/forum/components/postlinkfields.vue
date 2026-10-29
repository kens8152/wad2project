<script setup>
import { ref, computed, onMounted } from 'vue'
import LinkPicker from './linkpicker.vue'
import { catalog, loadCatalog, getEvent, getArtist } from '../API/forumlinks.js'

const props = defineProps({
  modelValue: { type: Object, default: () => ({ events: [], artists: [] }) },
})
const emit = defineEmits(['update:modelValue'])

const pickerOpen = ref(false)
const startFilter = ref('all')

const artists = computed(() => props.modelValue.artists ?? [])
const events = computed(() => props.modelValue.events ?? [])

const missing = (word) => (catalog.loaded ? `Unknown ${word}` : 'Loading…')
const artistName = (id) => getArtist(id)?.title ?? missing('artist')
const eventName = (id) => getEvent(id)?.title ?? missing('event')

onMounted(loadCatalog)

function browse(filter) {
  startFilter.value = filter
  pickerOpen.value = true
}

function onConfirm(value) {
  emit('update:modelValue', { events: [...value.events], artists: [...value.artists] })
  pickerOpen.value = false
}

function removeArtist(id) {
  emit('update:modelValue', {
    events: [...events.value],
    artists: artists.value.filter((a) => a !== id),
  })
}

function removeEvent(id) {
  emit('update:modelValue', {
    events: events.value.filter((e) => e !== id),
    artists: [...artists.value],
  })
}
</script>

<template>
  <div>
    <p class="small text-body-secondary mb-1">Events &amp; artists</p>

    <div v-if="artists.length || events.length" class="d-flex flex-wrap gap-1 mb-2">
      <span
        v-for="id in artists"
        :key="'a-' + id"
        class="badge rounded-pill text-bg-light border d-inline-flex align-items-center gap-1 fw-normal"
      >
        <i class="bi bi-mic"></i>{{ artistName(id) }}
        <button type="button" class="btn-close ms-1" style="font-size: 0.55rem" @click="removeArtist(id)"></button>
      </span>

      <span
        v-for="id in events"
        :key="'e-' + id"
        class="badge rounded-pill text-bg-light border d-inline-flex align-items-center gap-1 fw-normal"
      >
        <i class="bi bi-calendar-event"></i>{{ eventName(id) }}
        <button type="button" class="btn-close ms-1" style="font-size: 0.55rem" @click="removeEvent(id)"></button>
      </span>
    </div>

    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" @click="browse('events')">
        <i class="bi bi-calendar-event me-1"></i>Browse events
      </button>
      <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" @click="browse('artists')">
        <i class="bi bi-mic me-1"></i>Browse artists
      </button>
    </div>

    <LinkPicker
      :open="pickerOpen"
      :start-filter="startFilter"
      :model-value="modelValue"
      @close="pickerOpen = false"
      @confirm="onConfirm"
    />
  </div>
</template>