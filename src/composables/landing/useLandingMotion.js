import { onBeforeUnmount, onMounted } from 'vue'

// Landing page motion: GSAP + ScrollTrigger, loaded only on this page.
// The app scrolls inside .app-main (see App.vue), so every ScrollTrigger uses it as its scroller.

let loading = null

export function loadGsap() {
  if (!loading) {
    loading = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([core, st]) => {
      const gsap = core.gsap || core.default
      const ScrollTrigger = st.ScrollTrigger || st.default
      gsap.registerPlugin(ScrollTrigger)
      return { gsap, ScrollTrigger }
    })
  }
  return loading
}

export const MEDIA = {
  desktop: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  phone: '(max-width: 767.98px) and (prefers-reduced-motion: no-preference)',
  reduced: '(prefers-reduced-motion: reduce)',
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.(MEDIA.reduced).matches
}

// Scene setup: build(gsap, ScrollTrigger, { mm, scroller }) runs once the scene is mounted.
// Everything it creates is undone when the scene unmounts.
export function useLandingMotion(rootRef, build) {
  let mm = null
  let alive = true

  onMounted(async () => {
    const { gsap, ScrollTrigger } = await loadGsap()
    if (!alive || !rootRef.value) return
    const scroller = document.querySelector('.app-main') || undefined
    mm = gsap.matchMedia(rootRef.value)
    build(gsap, ScrollTrigger, { mm, scroller, root: rootRef.value })
    requestAnimationFrame(() => ScrollTrigger.refresh())
  })

  onBeforeUnmount(() => {
    alive = false
    if (mm) mm.revert()
  })
}
