<script setup>
import { useToast } from '@/composables/useToast'

const { message } = useToast()
</script>

<template>
  <Transition name="toast">
    <div v-if="message" class="riffle-toast" role="status" aria-live="polite">{{ message }}</div>
  </Transition>
</template>

<style scoped>
.riffle-toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  z-index: 2000;
  max-width: calc(100vw - 32px);
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: var(--riffle-navy);
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 10px 30px rgba(12, 30, 74, 0.3);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
