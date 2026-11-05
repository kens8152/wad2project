<script setup>
import { ref } from 'vue'
import { useLandingMotion, MEDIA } from '@/composables/landing/useLandingMotion'
import { GENRES, SHOWCASE_ARTISTS } from '@/data/landing'

const root = ref(null)
const genreRow = [...GENRES, ...GENRES]
const artistRow = SHOWCASE_ARTISTS

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const rows = gsap.utils.toArray('.marquee__track')
    const loops = rows.map((row, i) =>
      gsap.to(row, { xPercent: i % 2 ? 50 : -50, duration: i % 2 ? 38 : 30, ease: 'none', repeat: -1 }),
    )
    gsap.set(rows[1], { xPercent: -50 })

    const skew = gsap.quickTo(rows, 'skewX', { duration: 0.4, ease: 'power3.out' })
    ScrollTrigger.create({
      trigger: root.value,
      scroller,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate(self) {
        const v = gsap.utils.clamp(-12, 12, self.getVelocity() / -120)
        skew(v)
        loops.forEach((loop) => gsap.to(loop, { timeScale: 1 + Math.abs(v) / 3, duration: 0.3, overwrite: true }))
      },
      onLeave: () => skew(0),
    })
  })
})
</script>

<template>
  <section ref="root" class="marquee" aria-label="Genres and artists on Riffle">
    <div class="marquee__row">
      <div class="marquee__track">
        <template v-for="copy in 2" :key="'g' + copy">
          <span v-for="(g, gi) in genreRow" :key="copy + '-' + gi" class="marquee__genre" :style="{ '--c': g.color }">
            <i></i>{{ g.name }}
          </span>
        </template>
      </div>
    </div>
    <div class="marquee__row marquee__row--names" aria-hidden="true">
      <div class="marquee__track">
        <template v-for="copy in 2" :key="'a' + copy">
          <span v-for="a in artistRow" :key="copy + a.name" class="marquee__name">
            {{ a.name }} <b>✦</b>
          </span>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.marquee {
  position: relative;
  padding: 1.6rem 0;
  overflow: hidden;
  border-block: 1px solid var(--riffle-border);
  background: color-mix(in srgb, var(--riffle-surface) 70%, transparent);
}
.marquee__row {
  display: flex;
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.marquee__row + .marquee__row {
  margin-top: 0.9rem;
}
.marquee__track {
  display: flex;
  flex: none;
  gap: 0.9rem;
  padding-right: 0.9rem;
  white-space: nowrap;
  will-change: transform;
}
.marquee__genre {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  border: 1.5px solid color-mix(in srgb, var(--c) 45%, transparent);
  background: color-mix(in srgb, var(--c) 10%, var(--riffle-surface));
  color: var(--riffle-ink);
  font-weight: 800;
  font-size: 1rem;
}
.marquee__genre i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c);
}
.marquee__name {
  font-size: clamp(1.6rem, 3.4vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  color: transparent;
  -webkit-text-stroke: 1.2px color-mix(in srgb, var(--riffle-ink) 45%, transparent);
}
.marquee__name b {
  color: #ff4d8d;
  -webkit-text-stroke: 0;
  font-size: 0.6em;
  vertical-align: middle;
  margin-left: 0.5rem;
}
</style>
