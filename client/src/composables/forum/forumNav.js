import { ref } from 'vue'


const collapsed = ref(window.innerWidth < 992)

const searchButtons = ref(0)

export function useForumNav() {
  const toggle = () => {
    collapsed.value = !collapsed.value
  }
  return { collapsed, searchButtons, toggle }
}
