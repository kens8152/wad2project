<script setup>
import { ref } from 'vue'
import { useLandingMotion, MEDIA } from '@/composables/landing/useLandingMotion'
import { GENRES } from '@/data/landing'

const root = ref(null)

// Web layout: six genre clusters around the centre (viewBox 0 0 600 600)
function seeded(n) {
  const x = Math.sin(n * 9301 + 49297) * 233280
  return x - Math.floor(x)
}
const clusterSpots = [
  [170, 170], [430, 150], [500, 360], [330, 470], [120, 400], [300, 300],
]
const dots = []
GENRES.forEach((g, gi) => {
  const [cx, cy] = clusterSpots[gi]
  for (let k = 0; k < 7; k++) {
    const angle = (k / 7) * Math.PI * 2 + gi
    const dist = k === 0 ? 0 : 38 + seeded(gi * 10 + k) * 34
    dots.push({
      id: `${gi}-${k}`,
      genre: g,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      r: k === 0 ? 13 : 5 + seeded(gi * 7 + k) * 6,
      sx: seeded(gi * 31 + k) * 600,
      sy: seeded(gi * 17 + k * 3) * 600,
    })
  }
})
const links = []
dots.forEach((d, i) => {
  const hub = dots[i - (i % 7)]
  if (d !== hub) links.push({ a: hub, b: d, strong: true })
})
for (let gi = 0; gi < GENRES.length; gi++) {
  const a = dots[gi * 7]
  const b = dots[((gi + 1) % GENRES.length) * 7 + 2]
  const c = dots[((gi + 3) % GENRES.length) * 7 + 4]
  links.push({ a, b, strong: false }, { a, b: c, strong: false })
}

const you = { x: 395, y: 245 }

const steps = [
  { title: 'Explore the web', text: 'Every dot is a local artist. Every line is an audience they share. Drag, zoom and wander.' },
  { title: 'Find your spot', text: 'Tell Riffle what you love and it drops you right where your taste lives on the map.' },
  { title: 'Follow who is near', text: 'The artists closest to you are the ones you will probably love next. Follow them in one tap.' },
]

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  const build = (pinned) => {
    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: pinned
        ? { trigger: root.value, scroller, start: 'top top', end: '+=220%', scrub: 0.8, pin: true }
        : { trigger: root.value, scroller, start: 'top 70%', end: 'bottom 60%', scrub: 0.8 },
    })
    tl.from('.web-dot', {
      attr: { cx: (i) => dots[i].sx, cy: (i) => dots[i].sy },
      opacity: 0.25,
      duration: 1.4,
      stagger: { each: 0.012, from: 'random' },
    })
      .fromTo('.web-link', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, stagger: 0.01 }, '-=0.4')
    if (pinned) tl.to('.disc-step-0', { opacity: 0, y: -20, duration: 0.3 }, '+=0.1').fromTo('.disc-step-1', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 })
    tl.fromTo('.you-pin', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', svgOrigin: `${you.x} ${you.y}` }, '<')
      .to('.web-world', { scale: 1.8, x: (300 - you.x) * 1.8, y: (300 - you.y) * 1.8, svgOrigin: '300 300', duration: 1.2 }, '+=0.2')
      .to('.web-dot', { opacity: (i) => (Math.hypot(dots[i].x - you.x, dots[i].y - you.y) < 120 ? 1 : 0.15), duration: 0.6 }, '<0.3')
    if (pinned) tl.to('.disc-step-1', { opacity: 0, y: -20, duration: 0.3 }, '-=0.3').fromTo('.disc-step-2', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 })
    tl.fromTo('.follow-chip', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' }, '<')
  }
  mm.add(MEDIA.desktop, () => build(true))
  mm.add(MEDIA.phone, () => build(false))

  gsap.to('.you-ring', { scale: 2.4, opacity: 0, duration: 1.6, repeat: -1, ease: 'power1.out', transformOrigin: '50% 50%' })
})
</script>

<template>
  <section ref="root" class="scene discover" data-track="Discover" aria-labelledby="discover-title">
    <div class="container-xxl scene-grid">
      <div class="scene-copy">
        <p class="scene-eyebrow" style="--c: var(--genre-hip-hop)"><i class="bi bi-diagram-3"></i> Track 2 · Discover</p>
        <h2 id="discover-title" class="scene-title">A web of sounds,<br />built from shared fans.</h2>
        <div class="disc-steps">
          <div v-for="(s, i) in steps" :key="s.title" class="disc-step" :class="'disc-step-' + i">
            <span class="disc-step__num">0{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </div>
        </div>
        <RouterLink :to="{ name: 'discover' }" class="landing-btn landing-btn--primary mt-4">
          Open the web <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </div>

      <div class="web-frame" aria-hidden="true">
        <svg viewBox="0 0 600 600" class="web-svg">
          <g class="web-world">
            <line
              v-for="(l, i) in links"
              :key="'l' + i"
              class="web-link"
              :class="{ 'is-faint': !l.strong }"
              pathLength="1"
              :x1="l.a.x"
              :y1="l.a.y"
              :x2="l.b.x"
              :y2="l.b.y"
            />
            <circle v-for="d in dots" :key="d.id" class="web-dot" :cx="d.x" :cy="d.y" :r="d.r" :fill="d.genre.color" />
            <g class="you-pin" :transform="`translate(${you.x} ${you.y})`">
              <circle class="you-ring" r="14" />
              <circle class="you-core" r="9" />
              <text y="-20" text-anchor="middle">You</text>
            </g>
          </g>
        </svg>
        <div class="follow-chips">
          <span class="follow-chip"><i class="bi bi-plus-lg"></i> Follow Cloudy Yan</span>
          <span class="follow-chip"><i class="bi bi-plus-lg"></i> Follow ai.yna</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.discover {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
}
.disc-steps {
  position: relative;
  min-height: 9.5rem;
  margin-top: 1.6rem;
}
.disc-step {
  position: absolute;
  inset: 0;
}
.disc-step-1,
.disc-step-2 {
  opacity: 0;
}
.disc-step__num {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--genre-hip-hop);
  letter-spacing: 0.1em;
}
.disc-step h3 {
  margin: 0.2rem 0 0.4rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--riffle-ink);
}
.disc-step p {
  margin: 0;
  max-width: 28rem;
  color: var(--riffle-muted);
  font-size: 1.05rem;
  line-height: 1.6;
}
.web-frame {
  position: relative;
  aspect-ratio: 1;
  width: min(100%, 600px);
  justify-self: center;
  border-radius: 32px;
  background:
    radial-gradient(circle at 60% 40%, color-mix(in srgb, var(--genre-mandopop) 12%, transparent), transparent 55%),
    var(--riffle-surface);
  border: 1px solid var(--riffle-border);
  box-shadow: 0 30px 60px rgba(40, 30, 90, 0.12);
  overflow: hidden;
}
.web-svg {
  width: 100%;
  height: 100%;
}
.web-link {
  stroke: color-mix(in srgb, var(--riffle-ink) 30%, transparent);
  stroke-width: 1.4;
  stroke-dasharray: 1;
}
.web-link.is-faint {
  stroke-width: 0.8;
  opacity: 0.5;
}
.web-dot {
  stroke: var(--riffle-surface);
  stroke-width: 2;
}
.you-core {
  fill: var(--riffle-ink);
  stroke: #fff;
  stroke-width: 3;
}
.you-ring {
  fill: none;
  stroke: #ff4d8d;
  stroke-width: 3;
}
.you-pin text {
  fill: var(--riffle-ink);
  font-size: 15px;
  font-weight: 800;
}
.follow-chips {
  position: absolute;
  left: 50%;
  bottom: 7%;
  display: flex;
  gap: 0.5rem;
  transform: translateX(-50%);
}
.follow-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  background: #7c4dff;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(124, 77, 255, 0.35);
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .disc-step-1,
  .disc-step-2,
  .follow-chip {
    opacity: 1;
  }
  .disc-steps {
    min-height: 0;
  }
  .disc-step {
    position: static;
    margin-bottom: 1rem;
  }
}
@media (max-width: 767.98px) {
  .disc-steps {
    min-height: 0;
  }
  .disc-step {
    position: static;
    margin-bottom: 1rem;
    opacity: 1;
  }
}
</style>
