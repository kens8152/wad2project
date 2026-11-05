<script setup>
import { ref } from 'vue'
import EqualizerWave from './EqualizerWave.vue'
import { useLandingMotion } from '@/composables/landing/useLandingMotion'
import { SHOWCASE_ARTISTS } from '@/data/landing'

const root = ref(null)
const words = ['Drop', 'the', 'needle.']
const label = SHOWCASE_ARTISTS[2]

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.encore-word', {
      yPercent: 120,
      rotate: 6,
      opacity: 0,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: { trigger: root.value, scroller, start: 'top 75%', end: 'top 30%', scrub: 0.6 },
    })
    gsap.from('.encore-vinyl', {
      scale: 0.4,
      rotate: -180,
      opacity: 0,
      ease: 'power2.out',
      scrollTrigger: { trigger: root.value, scroller, start: 'top 85%', end: 'top 35%', scrub: 0.6 },
    })
    gsap.to('.encore-vinyl__disc', { rotate: 360, duration: 4, ease: 'none', repeat: -1 })
  })
})
</script>

<template>
  <section ref="root" class="encore" data-track="Encore" aria-labelledby="encore-title">
    <div class="container-xxl encore-inner">
      <div class="encore-vinyl" aria-hidden="true">
        <div class="encore-vinyl__disc">
          <img :src="label.image" alt="" width="80" height="80" loading="lazy" />
        </div>
      </div>
      <h2 id="encore-title" class="encore-title">
        <span v-for="w in words" :key="w" class="encore-word">{{ w }}&nbsp;</span>
      </h2>
      <p class="encore-text">Your next favourite artist is already playing somewhere on the island. Go find them.</p>
      <div class="encore-cta">
        <RouterLink :to="{ name: 'discover' }" class="landing-btn landing-btn--primary landing-btn--lg landing-btn--pulse">
          <i class="bi bi-diagram-3"></i> Start exploring
        </RouterLink>
        <RouterLink :to="{ name: 'matchmaking' }" class="landing-btn landing-btn--ghost landing-btn--lg">
          <i class="bi bi-shuffle"></i> Match me with artists
        </RouterLink>
      </div>
    </div>
    <div class="encore-eq"><EqualizerWave :bars="96" :energy="0.95" /></div>
  </section>
</template>

<style scoped>
.encore {
  position: relative;
  padding: 7rem 0 9rem;
  overflow: hidden;
  text-align: center;
  background: radial-gradient(ellipse at 50% 100%, rgba(124, 77, 255, 0.18), transparent 60%);
}
.encore-inner {
  position: relative;
  z-index: 1;
}
.encore-vinyl {
  width: 150px;
  height: 150px;
  margin: 0 auto 1.5rem;
  filter: drop-shadow(0 20px 40px rgba(124, 77, 255, 0.35));
}
.encore-vinyl__disc {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background:
    repeating-radial-gradient(circle, rgba(255, 255, 255, 0.07) 0 1px, transparent 1px 5px),
    #121019;
}
.encore-vinyl__disc img {
  width: 38%;
  height: 38%;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #ff4d8d;
}
.encore-title {
  margin: 0;
  font-size: clamp(3rem, 9vw, 7.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.05em;
  color: var(--riffle-ink);
}
.encore-word {
  display: inline-block;
}
.encore-word:last-child {
  background: linear-gradient(100deg, #ff4d8d, #7c4dff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.encore-text {
  max-width: 34rem;
  margin: 1.4rem auto 0;
  color: var(--riffle-muted);
  font-size: 1.15rem;
}
.encore-cta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.8rem;
  margin-top: 2.2rem;
}
.encore-eq {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 120px;
  opacity: 0.5;
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}
</style>
