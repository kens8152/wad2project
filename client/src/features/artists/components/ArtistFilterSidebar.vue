<script setup>
import { toggleInList } from '../utils/artists'

const props = defineProps({
  searchText: { type: Object, required: true },   // ref<string>
  draftGenres: { type: Object, required: true },  // ref<string[]>
  draftVenues: { type: Object, required: true },  // ref<string[]>
  genreOptions: { type: Object, required: true }, // computed
  venueOptions: { type: Object, required: true }, // computed
  isDirty: { type: Object, required: true },      // computed
})

const emit = defineEmits(['apply', 'reset', 'clear-search', 'applied'])

function apply() {
  emit('apply')
  emit('applied')
}
</script>

<template>
  <aside class="filters riffle-card">
    <!-- Search -->
    <div class="filters__search">
      <i class="bi bi-search"></i>
      <input v-model="searchText.value" type="search" placeholder="Search artists" />
      <button v-if="searchText.value" type="button" class="filters__clear" @click="emit('clear-search')">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- Genre -->
    <section class="filters__group">
      <h2 class="filters__heading">Genre</h2>
      <label v-for="g in genreOptions.value" :key="g.name" class="filters__option">
        <input
          class="form-check-input"
          type="checkbox"
          :checked="draftGenres.value.includes(g.name)"
          @change="toggleInList(draftGenres.value, g.name)"
        />
        <span class="filters__chip" :style="{ background: g.color }"></span>
        <span class="filters__option-label">{{ g.name }}</span>
        <span class="filters__count">{{ g.count }}</span>
      </label>
    </section>

    <!-- Venue -->
    <section class="filters__group">
      <h2 class="filters__heading">Venue</h2>
      <label v-for="v in venueOptions.value" :key="v.name" class="filters__option">
        <input
          class="form-check-input"
          type="checkbox"
          :checked="draftVenues.value.includes(v.name)"
          @change="toggleInList(draftVenues.value, v.name)"
        />
        <span class="filters__option-label">{{ v.name }}</span>
        <span class="filters__count">{{ v.count }}</span>
      </label>
    </section>

    <!-- Buttons -->
    <div class="filters__footer">
      <button
        type="button"
        class="btn btn-riffle filters__apply"
        :class="{ 'is-dirty': isDirty.value }"
        @click="apply"
      >
        {{ isDirty.value ? 'Apply changes' : 'Apply filters' }}
      </button>
      <button type="button" class="filters__reset" @click="emit('reset')">Reset filters</button>
    </div>
  </aside>
</template>

<style scoped>
.filters {
  padding: 0.75rem 1rem;
}

.filters__search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.4rem 0.2rem 0.9rem;
  border-radius: 999px;
  background: #eef0f8;
  color: var(--riffle-muted);
}
.filters__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 1rem;
  color: var(--riffle-ink);
  padding: 0.35rem 0;
}
.filters__search input::placeholder {
  color: var(--riffle-muted);
}
.filters__search:focus-within {
  box-shadow: 0 0 0 2px var(--riffle-blue);
}
.filters__search input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}
.filters__clear {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 0.8rem;
}
.filters__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}

.filters__group {
  padding: 0.45rem 0 0.1rem;
}
.filters__group + .filters__group {
  border-top: 1px solid var(--riffle-border);
  margin-top: 0.2rem;
}
.filters__heading {
  margin: 0 0 0.3rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--riffle-muted);
}

.filters__option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.09rem 0;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--riffle-ink);
}
.filters__option .form-check-input {
  flex: none;
  margin: 0;
  width: 1.15rem;
  height: 1.15rem;
  cursor: pointer;
}
.filters__chip {
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
}
.filters__option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.filters__count {
  font-size: 0.82rem;
  color: var(--riffle-faint);
}

.filters__footer {
  position: sticky;
  bottom: -0.75rem;
  z-index: 5;
  margin: 0.5rem -1rem -0.75rem;
  padding: 0.5rem 1rem 0.45rem;
  background: #fff;
  border-top: 1px solid var(--riffle-border);
  border-radius: 0 0 var(--riffle-radius) var(--riffle-radius);
  box-shadow: 0 -8px 16px rgba(20, 35, 90, 0.05);
}
.filters__apply {
  width: 100%;
  padding: 0.55rem;
  font-size: 1rem;
}
/* when you changed a checkbox but did not press Apply yet */
.filters__apply.is-dirty {
  background: linear-gradient(135deg, #1b3fbf 0%, #2f7bff 60%, #22c1e8 100%);
}
.filters__reset {
  display: block;
  margin: 0.15rem auto 0;
  padding: 0.15rem 0.7rem;
  border: 0;
  background: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: #dc2626;
}
.filters__reset:hover {
  color: #b91c1c;
  text-decoration: underline;
}
</style>