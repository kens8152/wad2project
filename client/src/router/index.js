import { createRouter, createWebHistory } from 'vue-router'

const Placeholder = () => import('@/views/PlaceholderView.vue')

const routes = [
  { path: '/', redirect: { name: 'events-map' } },

  // ---- Events (Aryan) ----------------------------------------------------
  {
    path: '/events',
    name: 'events-map',
    component: () => import('@/features/events/views/EventsMapView.vue'),
    meta: { title: 'Events', section: 'events' },
  },
  {
    path: '/events/list',
    name: 'events-list',
    component: () => import('@/features/events/views/EventsListView.vue'),
    meta: { title: 'Events', section: 'events' },
  },
  {
    path: '/events/:id',
    name: 'event-detail',
    component: () => import('@/features/events/views/EventDetailView.vue'),
    props: true,
    meta: { title: 'Event', section: 'events' },
  },

  // ---- Other sections: placeholders until they land ----------
  {
    path: '/discover',
    name: 'discover',
    component: () => import('@/features/artists/views/DiscoverView.vue'),
    meta: { title: 'Discover', section: 'discover', owner: 'Powell' },
  },
  {
    path: '/artists',
    name: 'artists',
    component: () => import('@/features/artists/views/ArtistView.vue'),
    meta: { title: 'Artists', section: 'artists', owner: 'Powell' },
  },
  {
    path: '/matchmaking',
    name: 'matchmaking',
    component: () => import('@/views/matchmaking/ArtistMatchmaking.vue'),
    meta: { title: 'Discover Artists', section: 'artists' },
  },
  {
    path: '/artists/:id',
    name: 'artist-detail',
    component: () => import('@/features/artists/views/Artistprofileview.vue'),
    meta: { title: 'Artist', section: 'artists', owner: 'Powell' },
  },
  {
    path: '/forum',
    name: 'forum',
    component: () => import('@/features/forum/views/Forum.vue'),
    meta: { title: 'Forum', section: 'forum', owner: 'Justin' },
    children: [
    { path: 'trend', name: 'forum-trend', component: () => import('@/features/forum/views/Forumtrend.vue') },
    { path: 'tags', name: 'forum-tags', component: () => import('@/features/forum/views/Forumtag.vue') },
    { path: 'lfg', name: 'forum-lfg', component: () => import('@/features/forum/views/Forumlfg.vue') },
    { path: 'saved', name: 'forum-saved', component: () => import('@/features/forum/views/Forumsaved.vue') },
    { path: 'mypost', name: 'forum-mypost', component: () => import('@/features/forum/views/Forummypost.vue') },
    { path: 'post/:id', name: 'post-detail', component: () => import('@/features/forum/views/Postdetail.vue') },
  ],
  },

  // Existing Spotify OAuth demo (kept intact, moved out of App.vue)
  {
    path: '/spotify-demo',
    name: 'spotify-demo',
    component: () => import('@/views/SpotifyDemo.vue'),
    meta: { title: 'Spotify demo', section: 'spotify' },
  },

  // Onboarding and profile (Kenson)
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: {title: 'Profile', section: 'profile', owner: 'Kenson'},
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: {title: 'Profile', section: 'profile', owner: 'Kenson'},
  },
  {
    path: '/profile/saved-artists',
    name: 'saved-artists',
    component: () => import('@/views/matchmaking/SavedArtistsView.vue'),
    meta: { title: 'Saved artists', section: 'profile' },
  },

  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/views/SignupView.vue'),
    meta: { title: 'Sign up', section: 'signup', owner: 'Kenson' },
  },
  
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Log in', section: 'login', owner: 'Kenson' },
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
