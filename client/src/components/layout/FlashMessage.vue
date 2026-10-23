<script setup>
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps({
  bgColor: {
    type: String,
    default: 'secondary',
  },
  // How long it stays (ms)
  duration: {
    type: Number,
    default: 2500,
  },
})

// Show / hide
const visible = ref(false)
let timer = null

function flash() {
  visible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (visible.value = false), props.duration)
}

onBeforeUnmount(() => clearTimeout(timer))

defineExpose({ flash })
</script>

<template>
  <Transition name="flash">
    <div
      v-if="visible"
      class="flash-message position-fixed start-50 translate-middle-x d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow fw-semibold small"
      :class="'text-bg-' + bgColor"
      role="status"
    >
      <slot></slot>
    </div>
  </Transition>
</template>

<style scoped>
/* Position */
.flash-message {
  top: 96px;
  z-index: 1050;
}

/* Fade in / out */
.flash-enter-active,
.flash-leave-active {
  transition: opacity 0.2s ease, translate 0.2s ease;
}
.flash-enter-from,
.flash-leave-to {
  opacity: 0;
  translate: 0px -10px;
}
</style>
