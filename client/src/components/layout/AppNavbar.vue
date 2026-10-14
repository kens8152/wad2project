<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const user = userStore.user

const links = [
  { label: 'Discover', to: { name: 'discover' }, section: 'discover' },
  { label: 'Events', to: { name: 'events-map' }, section: 'events' },
  { label: 'Artists', to: { name: 'artists' }, section: 'artists' },
  { label: 'Forum', to: { name: 'forum' }, section: 'forum' },
  { label: 'Spotify Demo', to: { name: 'spotify-demo' }, section: 'spotify' },
]

const activeSection = computed(() => route.meta.section)

const menuOpen = ref(false)
const searchOpen = ref(false)
const searchTerm = ref('')

watch(() => route.fullPath, () => {
  menuOpen.value = false
  searchOpen.value = false
})

// Global search jumps to the events list with the term pre-filled.
function submitSearch() {
  const q = searchTerm.value.trim()
  if (!q) return
  router.push({ name: 'events-list', query: { q } })
  searchTerm.value = ''
}
</script>

<template>
  <header class="riffle-nav">
    <div class="riffle-nav__inner container-xxl">
      <RouterLink :to="{ name: 'events-map' }" class="riffle-nav__brand" aria-label="Riffle home">
        <i class="bi bi-music-note-beamed riffle-nav__logo"></i>
        <span>Riffle</span>
      </RouterLink>

      <nav class="riffle-nav__links" :class="{ 'is-open': menuOpen }" aria-label="Main">
        <RouterLink
          v-for="link in links"
          :key="link.section"
          :to="link.to"
          class="riffle-nav__link"
          :class="{ 'is-active': activeSection === link.section }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="riffle-nav__right">
        <form v-if="searchOpen" class="riffle-nav__search" role="search" @submit.prevent="submitSearch">
          <input
            v-model="searchTerm"
            type="search"
            class="form-control form-control-sm"
            placeholder="Search events…"
            aria-label="Search events"
            autofocus
          />
        </form>
        <button class="riffle-nav__icon-btn" type="button" aria-label="Search" @click="searchOpen = !searchOpen">
          <i class="bi bi-search"></i>
        </button>

        <button class="riffle-nav__user" type="button" :aria-label="`Signed in as ${user.name}`">
          <span class="riffle-nav__avatar">{{ user.initials }}</span>
          <span class="riffle-nav__name d-none d-md-inline">{{ user.name }}</span>
        </button>

        <button
          class="riffle-nav__burger d-lg-none"
          type="button"
          :aria-expanded="menuOpen"
          aria-label="Toggle navigation"
          @click="menuOpen = !menuOpen"
        >
          <i class="bi" :class="menuOpen ? 'bi-x-lg' : 'bi-list'"></i>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.riffle-nav {
  position: sticky;
  top: 0;
  z-index: 1030;
  height: var(--navbar-height);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--riffle-border);
  overflow: visible;
}

.riffle-nav__inner {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.riffle-nav__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--riffle-ink);
  text-decoration: none;
}

.riffle-nav__logo {
  font-size: 1.9rem;
  background: linear-gradient(135deg, #ff4d8d 0%, #7c4dff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.riffle-nav__links {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2.25rem;
}

.riffle-nav__link {
  position: relative;
  padding: 0.5rem 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--riffle-muted);
  text-decoration: none;
  transition: color 0.15s;
}
.riffle-nav__link:hover {
  color: var(--riffle-ink);
}
.riffle-nav__link.is-active {
  color: var(--riffle-ink);
  font-weight: 700;
}
.riffle-nav__link.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--riffle-coral), var(--riffle-coral-soft));
}

.riffle-nav__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.riffle-nav__icon-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  color: var(--riffle-ink);
  font-size: 1.15rem;
}
.riffle-nav__icon-btn:hover {
  background: #eef1fb;
}

.riffle-nav__search {
  width: 220px;
}

.riffle-nav__user {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 0;
  background: transparent;
  padding: 0;
  font-weight: 700;
  color: var(--riffle-ink);
}

.riffle-nav__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #ffc9dc;
  color: #1b1b3a;
  font-weight: 800;
}

.riffle-nav__burger {
  border: 0;
  background: transparent;
  font-size: 1.6rem;
  color: var(--riffle-ink);
}

@media (max-width: 991.98px) {
  .riffle-nav__right {
    gap: 0.25rem;
  }
  .riffle-nav__links {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    transform: none;
    flex-direction: column;
    gap: 0;
    padding: 0.5rem 1.25rem 1rem;
    background: #fff;
    border-bottom: 1px solid var(--riffle-border);
    box-shadow: var(--riffle-shadow);
    display: none;
  }
  .riffle-nav__links.is-open {
    display: flex;
  }
  .riffle-nav__link {
    padding: 0.8rem 0;
  }
  .riffle-nav__link.is-active::after {
    bottom: 4px;
    right: auto;
    width: 32px;
  }
  .riffle-nav__search {
    width: 140px;
  }
}

@media (max-width: 575.98px) {
  .riffle-nav__inner {
    gap: 0.5rem;
  }
  .riffle-nav__brand {
    font-size: 1.5rem;
  }
  .riffle-nav__search {
    width: 100px;
    min-width: 0;
  }
  .riffle-nav__icon-btn,
  .riffle-nav__avatar {
    width: 36px;
    height: 36px;
  }
}
</style>
