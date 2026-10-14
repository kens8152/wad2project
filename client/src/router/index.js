import { createRouter, createWebHistory } from 'vue-router'

const Placeholder = () => import('@/views/PlaceholderView.vue')

const routes = [
  { path: '/', redirect: { name: 'events-map' } },

  // ---- Events (Aryan) ----------------------------------------------------
  {
    path: '/events',
    name: 'events-map',
    component: () => import('@/views/EventsListView.vue'),
    meta: { title: 'Events', section: 'events' },
  },
  {
    path: '/events/list',
    name: 'events-list',
    component: Placeholder,
    meta: { title: 'Events', section: 'events' },
  },
  {
    path: '/events/:id',
    name: 'event-detail',
    component: Placeholder,
    meta: { title: 'Event', section: 'events' },
  },

  // ---- Other sections: placeholders until they land ----------
  {
    path: '/discover',
    name: 'discover',
    component: Placeholder,
    meta: { title: 'Discover', section: 'discover', owner: 'Powell' },
  },
  {
    path: '/artists',
    name: 'artists',
    component: Placeholder,
    meta: { title: 'Artists', section: 'artists', owner: 'Powell' },
  },
  {
    path: '/artists/:slug',
    name: 'artist-detail',
    component: Placeholder,
    meta: { title: 'Artist', section: 'artists', owner: 'Powell' },
  },
  {
    path: '/forum',
    name: 'forum',
    component: Placeholder,
    meta: { title: 'Forum', section: 'forum', owner: 'Justin' },
  },

  // Existing Spotify OAuth demo (kept intact, moved out of App.vue)
  {
    path: '/spotify-demo',
    name: 'spotify-demo',
    component: () => import('@/views/SpotifyDemo.vue'),
    meta: { title: 'Spotify demo', section: 'spotify' },
  },

  { path: '/:pathMatch(.*)*', redirect: { name: 'events-map' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})

// The Spotify demo registers `http://127.0.0.1:5173/` as its redirect URI, so
// the OAuth callback (?code=… / ?error=…) lands on `/`. Forward it to the demo
// page, which handles the token exchange on mount.
router.beforeEach((to) => {
  if (to.path === '/' && (to.query.code || to.query.error)) {
    return { name: 'spotify-demo', query: to.query }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Riffle` : 'Riffle'
})

export default router
