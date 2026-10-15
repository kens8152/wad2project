import { ref } from 'vue'

// Tiny app-wide toast. Render <ToastHost /> once (App.vue), call toast('…') anywhere.
const message = ref('')
let timer = null

export function toast(text, ms = 2600) {
  message.value = text
  clearTimeout(timer)
  timer = setTimeout(() => (message.value = ''), ms)
}

export function useToast() {
  return { message, toast }
}
