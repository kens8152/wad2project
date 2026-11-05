import { ref } from 'vue'


const collapsed = ref(true)

const searchButtons = ref(0)

export function useForumNav() {
  const toggle = () => {
    collapsed.value = !collapsed.value
  }
  return { collapsed, searchButtons, toggle }
}
