<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationsStore } from '@/stores/notifications'
import { useMessagesStore } from '@/stores/messages'
import { supabase } from '@/services/supabase'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const notifications = useNotificationsStore()
const messages = useMessagesStore()

const user = computed(() => userStore.user)
const logoutError = ref('')

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

// the account menu under your name
const accountOpen = ref(false)
const email = ref('')

// Messages and Notifications have their own icons in the navbar, so they are not repeated here
const accountLinks = [
  { label: 'Your profile', to: '/profile' },
  { label: 'Your web of artists', to: '/discover' },
  { label: 'Edit taste profile', to: '/onboarding' },
]

// Whenever the page changes, close the menus and the search box
watch(() => route.fullPath, () => {
  menuOpen.value = false
  searchOpen.value = false
  accountOpen.value = false
})

// the email shown at the top of the account menu comes from the signed-in session
async function loadEmail() {
  email.value = ''
  if (!userStore.isLoggedIn) return

  const { data } = await supabase.auth.getSession()
  email.value = data.session ? data.session.user.email : ''
}
onMounted(loadEmail)
watch(() => userStore.isLoggedIn, loadEmail)

// Global search jumps to the events list with the term pre-filled.
function submitSearch() {
  const q = searchTerm.value.trim()
  if (!q) return
  router.push({ name: 'events-list', query: { q } })
  searchTerm.value = ''
}

async function logoutUser() {
  logoutError.value = ''
  accountOpen.value = false

  try {
    await userStore.logout()
    await router.push('/login')
  } catch (error) {
    logoutError.value = 'Could not log out: ' + error.message
  }
}
</script>

<template>
  <header class="riffle-nav">
    <!-- Decorative waves behind the bar -->
    <svg class="riffle-nav__waves" viewBox="0 0 1600 80" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="nav-wave-a" x1="0" x2="1">
          <stop offset="0" stop-color="#fbd1e6" />
          <stop offset="0.5" stop-color="#d9d3fb" />
          <stop offset="1" stop-color="#cfe4fb" />
        </linearGradient>
        <linearGradient id="nav-wave-b" x1="0" x2="1">
          <stop offset="0" stop-color="#cfe9fb" />
          <stop offset="0.6" stop-color="#bff0dc" />
          <stop offset="1" stop-color="#fde4d3" />
        </linearGradient>
      </defs>
      <path d="M0 80 V40 C80 30 120 6 220 10 C320 14 360 54 460 50 C560 46 560 70 640 80 Z" fill="url(#nav-wave-a)" opacity="0.8" />
      <path d="M980 80 C1060 70 1100 20 1200 18 C1300 16 1330 52 1420 46 C1500 40 1560 22 1600 30 V80 Z" fill="url(#nav-wave-b)" opacity="0.85" />
    </svg>

    <div class="riffle-nav__inner container-xxl">
      <RouterLink :to="{ name: 'discover' }" class="riffle-nav__brand" aria-label="Riffle home">
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

        <template v-if="userStore.isLoggedIn">
          <RouterLink to="/messages" class="riffle-nav__icon-btn" :aria-label="messages.unreadCount ? 'Messages (' + messages.unreadCount + ' unread)' : 'Messages'">
            <i class="bi bi-chat-dots"></i>
            <span v-if="messages.unreadCount" class="riffle-nav__dot"></span>
          </RouterLink>
          <RouterLink to="/notifications" class="riffle-nav__icon-btn" :aria-label="notifications.unreadCount ? 'Notifications (' + notifications.unreadCount + ' unread)' : 'Notifications'">
            <i class="bi bi-bell"></i>
            <span v-if="notifications.unreadCount" class="riffle-nav__dot"></span>
          </RouterLink>

          <div class="riffle-nav__account">

            <button
              class="riffle-nav__user"
              type="button"
              aria-haspopup="menu"
              :aria-expanded="accountOpen"
              @click="accountOpen = !accountOpen"
              @keydown.esc="accountOpen = false"
            >
              <span class="riffle-nav__avatar">
                <template v-if="user.initials">{{ user.initials }}</template>
                <i v-else class="bi bi-person-fill"></i>
              </span>
              <span class="riffle-nav__name d-none d-md-inline">{{ user.name }}</span>
              <i class="bi bi-chevron-down riffle-nav__caret d-none d-md-inline" :class="{ 'is-open': accountOpen }"></i>
            </button>

            <div v-if="accountOpen" class="riffle-nav__menu" role="menu">
              <p v-if="email" class="riffle-nav__email">{{ email }}</p>
              <RouterLink v-for="item in accountLinks" :key="item.to" :to="item.to" class="riffle-nav__menu-item" role="menuitem">
                {{ item.label }}
              </RouterLink>
              <div class="riffle-nav__menu-divider"></div>
              <button type="button" class="riffle-nav__menu-item riffle-nav__menu-item--logout" role="menuitem" @click="logoutUser">
                Log out
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink to="/login" class="btn rounded-pill nav-login">Log in</RouterLink>
          <RouterLink to="/signup" class="btn rounded-pill nav-signup">Sign up <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i></RouterLink>
        </template>

        <span v-if="logoutError" role="alert">{{ logoutError }}</span>

        <button
          class="riffle-nav__burger d-xl-none"
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

  <!-- a see-through layer behind the account menu: click anywhere else to close it -->
  <div v-if="accountOpen" class="riffle-nav__backdrop" @click="accountOpen = false"></div>
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

.riffle-nav__waves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
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
  -webkit-background-clip: text;  /* cuts that background to the shape of the text (here, the icon glyph) */
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
.riffle-nav__icon-btn {
  position: relative;
  text-decoration: none;
}
/* the small red dot for unread messages and notifications */
.riffle-nav__dot {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #e0245e;
  box-shadow: 0 0 0 2px #fff;
}

/* account menu */
.riffle-nav__account {
  position: relative;
  margin-right: -0.5rem; /* a little closer to the right edge */
}
.riffle-nav__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1020; /* under the navbar (1030), over the page */
}
.riffle-nav__caret {
  font-size: 0.75rem;
  color: var(--riffle-muted);
  transition: transform 0.2s;
}
.riffle-nav__caret.is-open {
  transform: rotate(180deg);
}
.riffle-nav__menu {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 1040;
  width: 190px;
  padding: 0.35rem 0;
  border: 1px solid var(--riffle-border);
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(20, 35, 90, 0.16);
  transform-origin: top right;
  animation: menu-pop 0.16s ease;
}
@keyframes menu-pop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.riffle-nav__email {
  margin: 0;
  padding: 0.25rem 0.9rem 0.4rem;
  overflow: hidden;
  color: var(--riffle-faint);
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.riffle-nav__menu-item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.9rem;
  border: 0;
  background: transparent;
  color: var(--riffle-ink);
  font-size: 0.92rem;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  transition: background 0.12s;
}
.riffle-nav__menu-item:hover {
  background: #f1f3fb;
}
.riffle-nav__menu-divider {
  height: 1px;
  margin: 0.4rem 0;
  background: var(--riffle-border);
}
/* Log out: red and underlined */
.riffle-nav__menu-item--logout {
  color: #d62839;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.riffle-nav__menu-item--logout:hover {
  background: #fff1f2;
}

.riffle-nav__search {
  width: 150px;
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

@media (max-width: 1199.98px) {
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
    width: 120px;
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

.nav-login,
.nav-signup {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
}

.nav-login {
  border: 1px solid #cbd2e5;
  background-color: rgba(255, 255, 255, 0.8);
  color: #14234b;
}

.nav-login:hover,
.nav-login:active {
  border-color: #7054dc;
  background-color: #eee9ff;
  color: #513ba0;
}

.nav-signup {
  margin-left: 8px;
  border: 1px solid #14234b;
  background-color: #14234b;
  color: white;
  box-shadow: 0 4px 12px rgba(20, 35, 75, 0.12);
}

.nav-signup:hover,
.nav-signup:active {
  border-color: #304779;
  background-color: #304779;
  color: white;
}

.nav-login:focus-visible,
.nav-signup:focus-visible {
  outline: 3px solid #7054dc;
  outline-offset: 3px;
}

@media (max-width: 575.98px) {
  .nav-login,
  .nav-signup {
    padding: 8px 14px;
    font-size: 12px;
  }
}
</style>
