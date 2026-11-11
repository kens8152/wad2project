<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useEventFilters } from '../../composables/events/useEventFilters'
import { toast } from '@/composables/useToast'

// The search box above the events (map and list). It types into the same filters as the sidebar.
const filters = useEventFilters()
const { draft } = filters
const searchInput = ref(null) // the <input>, so we can put the cursor back in it after clearing

// the "x" button: empty the search and keep the cursor in the box
function clearSearch() {
  filters.setQuery('')
  searchInput.value?.focus()
}

// ---- voice search (Web Speech API, where available) ------------------------------
// The Web Speech API is built into the browser (it turns speech into text). Chrome and Safari name it
// `webkitSpeechRecognition`, so we take whichever exists; if neither does, the button just shows a message.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const listening = ref(false) // true while the microphone is on (the button pulses)
let recognition = null

// the microphone button: starts listening, or stops if it is already listening
function toggleVoice() {
  if (!SpeechRecognition) {
    toast('Voice search is not supported in this browser')
    return
  }
  if (listening.value) {
    recognition?.stop()
    return
  }
  recognition = new SpeechRecognition()
  recognition.lang = 'en-SG' // Singapore English
  recognition.interimResults = false // only give the final text, not guesses while talking
  recognition.onresult = (e) => filters.setQuery(e.results[0][0].transcript) // what was heard goes into the search
  recognition.onerror = () => toast('Could not hear that, try again')
  recognition.onend = () => (listening.value = false) // fires when listening stops for any reason
  listening.value = true
  recognition.start()
}
onBeforeUnmount(() => recognition?.abort()) // leaving the page switches the microphone off
</script>

<template>
  <div class="events-search">
    <i class="bi bi-search" aria-hidden="true"></i>
    <!-- one-way binding (:value + @input) instead of v-model: the text goes through setQuery(),
         which waits 200 ms after the last key press before the list filters (debounce) -->
    <input
      ref="searchInput"
      :value="draft.q"
      type="search"
      placeholder="Search events, artists or venues"
      aria-label="Search events, artists or venues"
      @input="filters.setQuery($event.target.value)"
    />
    <button v-if="draft.q" type="button" class="events-search__clear" aria-label="Clear search" @click="clearSearch">
      <i class="bi bi-x-lg"></i>
    </button>
    <button
      type="button"
      class="events-search__mic"
      :class="{ 'is-listening': listening }"
      :aria-label="listening ? 'Stop voice search' : 'Search by voice'"
      :aria-pressed="listening"
      @click="toggleVoice"
    >
      <i class="bi bi-mic-fill"></i>
    </button>
  </div>
</template>

<style scoped>
.events-search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  padding: 0.2rem 0.4rem 0.2rem 1rem;
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  background: var(--riffle-surface);
  box-shadow: 0 4px 16px rgba(20, 35, 90, 0.07);
  color: var(--riffle-muted);
  transition: box-shadow 0.15s, border-color 0.15s;
}
.events-search:focus-within {
  border-color: var(--riffle-blue);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.events-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 1rem;
  color: var(--riffle-ink);
  padding: 0.5rem 0;
}
.events-search input::placeholder {
  color: var(--riffle-muted);
}
.events-search input::-webkit-search-cancel-button {
  -webkit-appearance: none; /* the browser's own cross is replaced by the button below */
  appearance: none;
  display: none;
}
.events-search__clear {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 0.8rem;
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.events-search__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}
.events-search__clear:active {
  transform: scale(0.92);
}
.events-search__mic {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
}
.events-search__mic:hover {
  background: #e0e4f3;
}
.events-search__mic.is-listening {
  background: var(--riffle-coral);
  color: #fff;
  animation: pulse 1.2s infinite;
}
@keyframes pulse {
  50% {
    box-shadow: 0 0 0 8px rgba(240, 72, 62, 0.15);
  }
}
</style>
