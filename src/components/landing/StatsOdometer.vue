<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from '@/services/supabase'
import { useLandingMotion } from '@/composables/landing/useLandingMotion'

const root = ref(null)
const artists = ref(178)
const gigs = ref(18)

const stats = computed(() => [
  { value: artists.value, label: 'local artists' },
  { value: gigs.value, label: 'gigs on the map' },
  { value: 6, label: 'genres, one island' },
])

const digits = (n) => String(n).split('').map(Number)

onMounted(async () => {
  try {
    const [a, e] = await Promise.all([
      supabase.from('artists').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }),
    ])
    if (a.count) artists.value = a.count
    if (e.count) gigs.value = e.count
  } catch {
    // keep the starting numbers
  }
})

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.odo-col', {
      y: 0,
      duration: 1.8,
      ease: 'power3.out',
      stagger: 0.07,
      scrollTrigger: { trigger: root.value, scroller, start: 'top 80%' },
    })
  })
})
</script>

<template>
  <section ref="root" class="stats-band" aria-label="Riffle in numbers">
    <div class="container-xxl stats-grid">
      <div v-for="s in stats" :key="s.label" class="odo">
        <span class="odo__number" :aria-label="String(s.value)">
          <span v-for="(d, i) in digits(s.value)" :key="s.label + i + d" class="odo__window" aria-hidden="true">
            <span class="odo-col" :style="{ '--d': d }">
              <span v-for="n in 20" :key="n">{{ (n - 1) % 10 }}</span>
            </span>
          </span>
        </span>
        <span class="odo__label">{{ s.label }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-band {
  padding: 4.5rem 0;
  border-block: 1px solid var(--riffle-border);
  background: color-mix(in srgb, var(--riffle-surface) 70%, transparent);
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  text-align: center;
}
.odo__number {
  display: inline-flex;
  font-size: clamp(3rem, 7vw, 5.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
}
.odo__window {
  display: inline-block;
  height: 1em;
  overflow: hidden;
}
.odo-col {
  display: flex;
  flex-direction: column;
  transform: translateY(calc(-1em * (10 + var(--d, 0))));
  background: linear-gradient(180deg, #ff4d8d, #7c4dff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.odo-col span {
  height: 1em;
}
.odo__label {
  display: block;
  margin-top: 0.5rem;
  color: var(--riffle-muted);
  font-weight: 700;
}
@media (max-width: 575.98px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
