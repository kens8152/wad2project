<script setup>
import { ref, computed} from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const emit = defineEmits(['select','reset'])

const feeds = [
  { key: 'explore', label: 'Explore', icon: 'bi-compass', to: '/forum' },
  { key: 'trend', label: 'Trend', icon: 'bi-fire' , to:'/forum/trend'},
  { key: 'tag', label: 'Tags', icon: 'bi-hash' , to: '/forum/tags'},
  { key: 'lfg', label: 'Look for group', icon: 'bi-people', to: '/forum/lfg' },
  { key: 'saved', label: 'Saved Post', icon: 'bi-bookmark', to: '/forum/saved'},
  { key: 'mypost', label: 'My Post', icon: 'bi-person' , to:'/forum/mypost'},
]

const activeKey = computed(() =>
  feeds.find(f => f.to === route.path)?.key ?? 'explore'
)

const collapsed = ref(window.innerWidth < 992)

function select(item) {
  
  emit('select', item.key)
  if (route.path === item.to) {
    emit('reset')
    window.scrollTo({top:0,behavior:'smooth'})
  } else {
    router.push(item.to)
  }
}
</script>

<template>
  <aside
    class="forumnav flex-shrink-0 border-end border-bottom bg-body px-2 py-2"
    :class="{ 'is-collapsed': collapsed }"
  >

    <button
      type="button"
      class="forumnav__item btn border-0 d-flex align-items-center w-100 text-start rounded-3"
      :class="{ 'justify-content-lg-center': collapsed }"
      :aria-expanded="!collapsed"
      aria-controls="forumnav-list"
      :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'"
      @click="collapsed = !collapsed"
    >
      <i class="bi bi-list fs-5" :class="{ 'me-3': !collapsed, 'me-lg-0': collapsed }"></i>
    </button>


    <ul
      id="forumnav-list"
      class="nav flex-column mt-1"
      :class="collapsed ? 'd-none d-lg-flex' : 'd-flex'"
      aria-label="Forum navigation"
    >
      <li v-for="item in feeds" :key="item.key" class="nav-item">
        <button
          type="button"
          class="forumnav__item nav-link d-flex align-items-center w-100 text-start rounded-3 link-body-emphasis"
          :class="[
            { 'is-active': activeKey === item.key },
            { 'justify-content-lg-center': collapsed },
          ]"
          :title="collapsed ? item.label : null"
          @click="select(item)"
        >
          <i class="bi fs-5" :class="[item.icon, collapsed ? 'me-3 me-lg-0' : 'me-3']"></i>
          <span :class="{ 'd-none': collapsed }">{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>

.forumnav {
  width: 70%;
  height: 100vh;
}

@media (max-width: 991.98px) {
  .forumnav.is-collapsed {
    width: auto;
    height: auto;
    align-self: flex-start;
    border: 0 !important;
  }
}


@media (min-width: 992px) {
  .forumnav {
    width: 270px;
    position: sticky;
    top: 0;
    height: calc(100vh - var(--navbar-height, 0px));
    overflow-y: auto;
    border-bottom: 0 !important;
    transition: width 0.25s ease;
  }
  .forumnav.is-collapsed {
    width: 72px;
  }
}


.forumnav__item:hover {
  background-color: var(--bs-secondary-bg);
}
.forumnav__item.is-active {
  background-color: var(--bs-secondary-bg);
  font-weight: 600;
}
.forumnav__item:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: -2px;
}


</style>