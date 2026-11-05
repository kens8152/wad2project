import { ref, watch } from 'vue'

const STORAGE_KEY = 'riffle-theme'

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'light' // light mode is the default; dark mode is only used once the user switches to it
}

const theme = ref(readSaved())

watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value
    document.documentElement.dataset.bsTheme = value
  },
  { immediate: true },
)

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {}
  }
  return { theme, toggleTheme }
}
