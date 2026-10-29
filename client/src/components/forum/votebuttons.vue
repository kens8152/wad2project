<script setup>
defineProps({
  up: { type: Number, default: 0 },
  down: { type: Number, default: 0 },
  current: { type: String, default: null },
})

defineEmits(['vote'])
</script>

<template>
  <button
    type="button"
    class="btn btn-sm btn-link p-0 text-decoration-none position-relative z-2"
    :class="current === 'up' ? 'text-success fw-semibold' : 'text-body-secondary'"
    @click="$emit('vote', 'up')"
  >
    <i
      class="bi me-1 text-success"
      :class="current === 'up' ? 'bi-arrow-up-circle-fill' : 'bi-arrow-up-circle'"
    ></i>{{ up }}
  </button>
  <button
    type="button"
    class="btn btn-sm btn-link p-0 text-decoration-none position-relative z-2"
    :class="current === 'down' ? 'text-danger fw-semibold' : 'text-body-secondary'"
    @click="$emit('vote', 'down')"
  >
    <i
      class="bi me-1 text-danger"
      :class="current === 'down' ? 'bi-arrow-down-circle-fill' : 'bi-arrow-down-circle'"
    ></i>{{ down }}
  </button>
</template>