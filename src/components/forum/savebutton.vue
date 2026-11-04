<script setup>
import { ref } from 'vue'

const props = defineProps({
  saved: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

const icon = ref(null)
const animating = ref(false)

const reduceMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function onClick() {
  const saving = !props.saved
  animating.value = true
  emit('toggle')

  if (saving && !reduceMotion() && typeof icon.value?.animate === 'function') {
    icon.value.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 700, easing: 'ease-out' },
    )
  }
}
</script>

<template>
  <button
    type="button"
    class="save-btn btn btn-sm btn-link p-0"
    :class="[saved ? 'is-saved' : 'text-body-secondary', { animating }]"
    :aria-pressed="saved"
    :aria-label="saved ? 'Unsave post' : 'Save post'"
    @click="onClick"
  >
    <span ref="icon" class="icon fs-5">
      <i class="bi bi-bookmark"></i>
      <i class="bi bi-bookmark-fill fill" aria-hidden="true"></i>
    </span>
  </button>
</template>

<style scoped>
.icon {
  position: relative;
  display: inline-block;
  line-height: 1;
}
.is-saved {
  --bs-btn-color: #7c4dff;
  --bs-btn-hover-color: #7c4dff;
  --bs-btn-active-color: #7c4dff;
}
.fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #ff4d8d 0%, #7c4dff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  clip-path: inset(0 0 100% 0);
}
.is-saved .fill {
  clip-path: inset(0 0 0 0);
}

.animating .fill {
  transition: clip-path 0.25s ease-in;
}
.animating.is-saved .fill {
  transition: clip-path 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .animating .fill,
  .animating.is-saved .fill {
    transition: none;
  }
}
</style>
