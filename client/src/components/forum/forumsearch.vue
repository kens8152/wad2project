<script setup>
const term = defineModel({ type: String, default: '' })

defineProps({
  placeholder: { type: String, default: 'Search the forum…' },
})
</script>

<template>
  <div class="forum-search d-flex align-items-center flex-grow-1">
    <div class="forum-search__box">
      <i class="bi bi-search"></i>
      <input v-model="term" type="search" :placeholder="placeholder" :aria-label="placeholder" />
      <button v-if="term" type="button" class="forum-search__clear" aria-label="Clear search" @click="term = ''">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.forum-search {
  min-width: 0;
  height: var(--forum-search-height, 3.5rem);
}

.forum-search__box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  min-height: 2.5rem;
  padding: 0.2rem 0.4rem 0.2rem 0.9rem;
  border: 1px solid var(--forum-line, var(--riffle-border));
  border-radius: 10px;
  background: var(--riffle-surface);
  color: var(--riffle-muted);
}

.forum-search__box input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 1rem;
  color: var(--riffle-ink);
  padding: 0.2rem 0;
}

.forum-search__box input::placeholder {
  color: var(--riffle-muted);
}

.forum-search__box:focus-within {
  box-shadow: 0 0 0 2px var(--riffle-blue);
}

.forum-search__box input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
  display: none;
}

.forum-search__clear {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--riffle-muted);
  font-size: 0.8rem;
}

.forum-search__clear:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
