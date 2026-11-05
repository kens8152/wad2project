<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import EqualizerWave from './EqualizerWave.vue'
import { useLandingMotion, loadGsap, MEDIA } from '@/composables/landing/useLandingMotion'
import { SHOWCASE_ARTISTS } from '@/data/landing'

const root = ref(null)
const stage = ref(null)

const lineOne = 'Find your next'.split('')
const lineTwo = 'favourite artist.'.split('')
const orbit = SHOWCASE_ARTISTS.slice(0, 6)
const label = SHOWCASE_ARTISTS[0]

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  mm.add(MEDIA.reduced, () => {
    gsap.set('.hero-char, .hero-fade, .orbit-card, .tonearm, .vinyl', { clearProps: 'all' })
  })

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
    intro
      .from('.hero-char', { yPercent: 110, rotate: 8, opacity: 0, duration: 0.9, stagger: 0.025 })
      .from('.hero-fade', { y: 24, opacity: 0, duration: 0.7, stagger: 0.1 }, '-=0.5')
      .from('.vinyl', { scale: 0.6, rotate: -120, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.2)
      .from('.tonearm', { rotate: -38, duration: 1, ease: 'back.out(1.6)' }, 0.9)
      .from('.orbit-card', { scale: 0, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'back.out(1.8)' }, 0.6)

    gsap.to('.vinyl__disc', { rotate: 360, duration: 6, ease: 'none', repeat: -1 })
    gsap.to('.orbit-ring', { rotate: 360, duration: 60, ease: 'none', repeat: -1 })
    gsap.to('.orbit-card__inner', { rotate: -360, duration: 60, ease: 'none', repeat: -1 })

    gsap.to('.hero-copy', {
      yPercent: -18,
      opacity: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: root.value, scroller, start: 'top top', end: 'bottom top', scrub: true },
    })
    gsap.to('.hero-stage', {
      yPercent: 12,
      scale: 0.92,
      ease: 'none',
      scrollTrigger: { trigger: root.value, scroller, start: 'top top', end: 'bottom top', scrub: true },
    })
  })
})

// mouse parallax and magnetic buttons
let tiltX = null
let tiltY = null
function onMove(e) {
  if (!stage.value || !tiltX) return
  const box = root.value.getBoundingClientRect()
  const x = (e.clientX - box.left) / box.width - 0.5
  const y = (e.clientY - box.top) / box.height - 0.5
  tiltX(x * 18)
  tiltY(y * -14)
}

function magnet(e) {
  const btn = e.currentTarget
  const box = btn.getBoundingClientRect()
  const x = e.clientX - box.left - box.width / 2
  const y = e.clientY - box.top - box.height / 2
  btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`
}
function release(e) {
  e.currentTarget.style.transform = ''
}

onMounted(async () => {
  if (!window.matchMedia?.(MEDIA.desktop)?.matches) return
  const { gsap } = await loadGsap()
  if (!stage.value) return
  tiltX = gsap.quickTo(stage.value, 'rotationY', { duration: 0.8, ease: 'power3.out' })
  tiltY = gsap.quickTo(stage.value, 'rotationX', { duration: 0.8, ease: 'power3.out' })
})
onBeforeUnmount(() => {
  tiltX = null
  tiltY = null
})
</script>

<template>
  <section ref="root" class="hero" data-track="Intro" @mousemove="onMove">
    <div class="container-xxl hero-grid">
      <div class="hero-copy">
        <p class="hero-kicker hero-fade"><span class="live-dot"></span> Singapore's local music scene</p>
        <h1 class="hero-title" aria-label="Find your next favourite artist.">
          <span class="hero-line" aria-hidden="true">
            <span v-for="(c, i) in lineOne" :key="'a' + i" class="hero-char">{{ c === ' ' ? ' ' : c }}</span>
          </span>
          <span class="hero-line hero-line--accent" aria-hidden="true">
            <span v-for="(c, i) in lineTwo" :key="'b' + i" class="hero-char" :style="{ '--p': (i / (lineTwo.length - 1)) * 100 }">{{ c === ' ' ? ' ' : c }}</span>
          </span>
        </h1>
        <p class="hero-lede hero-fade">
          Riffle brings the island's artists, gigs and fans into one place. Explore a web of sounds, swipe through new
          acts every day and find the next show worth leaving the house for.
        </p>
        <div class="hero-cta hero-fade">
          <RouterLink :to="{ name: 'discover' }" class="landing-btn landing-btn--primary" @mousemove="magnet" @mouseleave="release">
            <i class="bi bi-diagram-3"></i> Start exploring
          </RouterLink>
          <RouterLink :to="{ name: 'matchmaking' }" class="landing-btn landing-btn--ghost" @mousemove="magnet" @mouseleave="release">
            <i class="bi bi-shuffle"></i> Match me with artists
          </RouterLink>
        </div>
        <p class="hero-scroll hero-fade"><i class="bi bi-arrow-down"></i> Scroll to drop the needle</p>
      </div>

      <div class="hero-stage" aria-hidden="true">
        <div ref="stage" class="hero-stage__tilt">
          <div class="orbit-ring">
            <div v-for="(a, i) in orbit" :key="a.name" class="orbit-card" :style="{ '--i': i, '--c': a.genre.color }">
              <div class="orbit-card__inner">
                <img :src="a.image" :alt="''" width="96" height="120" loading="eager" />
                <span>{{ a.name }}</span>
              </div>
            </div>
          </div>

          <div class="vinyl">
            <div class="vinyl__disc">
              <div class="vinyl__grooves"></div>
              <img class="vinyl__label" :src="label.image" alt="" width="120" height="120" />
              <span class="vinyl__hole"></span>
            </div>
          </div>
          <div class="tonearm"><span class="tonearm__head"></span></div>
        </div>
      </div>
    </div>

    <div class="hero-eq"><EqualizerWave :bars="72" :energy="0.55" /></div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 3rem 0 6rem;
}
.hero-grid {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 2rem;
  align-items: center;
}

/* copy */
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--riffle-border);
  border-radius: 999px;
  background: var(--riffle-surface);
  color: var(--riffle-muted);
  font-size: 0.85rem;
  font-weight: 700;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff4d8d;
  box-shadow: 0 0 0 0 rgba(255, 77, 141, 0.6);
  animation: live 1.6s infinite;
}
@keyframes live {
  70% { box-shadow: 0 0 0 10px rgba(255, 77, 141, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 77, 141, 0); }
}
.hero-title {
  margin: 0;
  font-size: clamp(2.8rem, 6.4vw, 5.6rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--riffle-ink);
}
.hero-line {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}
.hero-char {
  display: inline-block;
}
.hero-line--accent .hero-char {
  background: linear-gradient(100deg, #ff4d8d 0%, #7c4dff 60%, #4d7cff 100%);
  background-size: 1100% 100%;
  background-position: calc(var(--p, 0) * 1%) 0;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-lede {
  max-width: 34rem;
  margin: 1.4rem 0 0;
  color: var(--riffle-muted);
  font-size: 1.15rem;
  line-height: 1.6;
}
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 2rem;
}
.hero-scroll {
  margin: 2.2rem 0 0;
  color: var(--riffle-faint);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.hero-scroll i {
  display: inline-block;
  animation: bob 1.6s ease-in-out infinite;
}
@keyframes bob {
  50% { transform: translateY(5px); }
}

/* stage */
.hero-stage {
  position: relative;
  aspect-ratio: 1;
  width: min(100%, 560px);
  justify-self: center;
  perspective: 1000px;
}
.hero-stage__tilt {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.vinyl {
  position: absolute;
  inset: 18%;
  filter: drop-shadow(0 30px 50px rgba(40, 20, 90, 0.35));
}
.vinyl__disc {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, #2a2440 0 30%, #121019 31% 100%);
  display: grid;
  place-items: center;
}
.vinyl__grooves {
  position: absolute;
  inset: 4%;
  border-radius: 50%;
  background:
    repeating-radial-gradient(circle, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 5px),
    conic-gradient(from 30deg, transparent 0 40%, rgba(255, 255, 255, 0.12) 46%, transparent 52% 90%, rgba(255, 255, 255, 0.08) 95%, transparent);
}
.vinyl__label {
  position: relative;
  width: 36%;
  height: 36%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #ff4d8d;
}
.vinyl__hole {
  position: absolute;
  width: 3%;
  height: 3%;
  border-radius: 50%;
  background: var(--riffle-glow, #fff);
}
.tonearm {
  position: absolute;
  top: 6%;
  right: 6%;
  width: 6%;
  height: 46%;
  transform-origin: 50% 6%;
  transform: rotate(22deg);
}
.tonearm::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: radial-gradient(circle, #d9d4ea 30%, #8a83a8 31%);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}
.tonearm::after {
  content: '';
  position: absolute;
  top: 14px;
  left: 50%;
  width: 6px;
  height: calc(100% - 14px);
  border-radius: 6px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #b8b2cc, #eeeaf7, #a49dbd);
}
.tonearm__head {
  position: absolute;
  bottom: -6px;
  left: 50%;
  width: 22px;
  height: 30px;
  border-radius: 4px;
  transform: translateX(-50%) rotate(-12deg);
  background: linear-gradient(180deg, #7c4dff, #ff4d8d);
  z-index: 1;
}

/* orbiting cards */
.orbit-ring {
  position: absolute;
  inset: 0;
}
.orbit-card {
  --r: 270px;
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform: rotate(calc(var(--i) * 60deg)) translate(0, calc(var(--r) * -1)) rotate(calc(var(--i) * -60deg));
}
.orbit-card__inner {
  position: absolute;
  width: 92px;
  margin: -60px 0 0 -46px;
  padding: 5px 5px 7px;
  border-radius: 14px;
  background: var(--riffle-surface);
  box-shadow: 0 12px 26px rgba(30, 20, 70, 0.22), 0 0 0 2px color-mix(in srgb, var(--c) 70%, transparent);
  text-align: center;
  font-size: 0.66rem;
  font-weight: 800;
  color: var(--riffle-ink);
  white-space: nowrap;
}
.orbit-card__inner img {
  display: block;
  width: 100%;
  height: 92px;
  margin-bottom: 4px;
  border-radius: 10px;
  object-fit: cover;
}
.hero-eq {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 70px;
  opacity: 0.55;
  mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
}

@media (max-width: 1199.98px) {
  .orbit-card { --r: 220px; }
}
@media (max-width: 991.98px) {
  .hero-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-lede {
    margin-inline: auto;
  }
  .hero-cta {
    justify-content: center;
  }
  .hero-stage {
    order: -1;
    width: min(100%, 420px);
  }
  .orbit-card { --r: 175px; }
}
@media (max-width: 575.98px) {
  .hero {
    padding-top: 1.5rem;
  }
  .vinyl {
    inset: 26%;
  }
  .orbit-card { --r: 135px; }
  .orbit-card__inner {
    width: 68px;
    margin: -44px 0 0 -34px;
    font-size: 0.55rem;
  }
  .orbit-card__inner img {
    height: 64px;
  }
}
</style>
