<script setup>
import { ref } from 'vue'
import { useLandingMotion, MEDIA } from '@/composables/landing/useLandingMotion'
import { TICKETS, VENUES } from '@/data/landing'

const root = ref(null)
const rail = ref(null)

// central Singapore -> map box (400 x 320)
const box = { south: 1.276, north: 1.312, west: 103.838, east: 103.876 }
const pins = VENUES.map((v) => ({
  ...v,
  x: ((v.lng - box.west) / (box.east - box.west)) * 400,
  y: ((box.north - v.lat) / (box.north - box.south)) * 320,
}))

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  mm.add(MEDIA.desktop, () => {
    const distance = () => rail.value.scrollWidth - rail.value.parentElement.clientWidth + 40
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root.value,
        scroller,
        start: 'top top',
        end: () => '+=' + (window.innerHeight * 1.2 + distance()),
        scrub: 0.8,
        pin: true,
        invalidateOnRefresh: true,
      },
    })
    tl.fromTo('.map-road', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05 })
      .from('.map-pin', { y: -160, autoAlpha: 0, duration: 0.4, stagger: 0.07, ease: 'bounce.out' }, '-=0.3')
      .fromTo('.map-ripple', { scale: 0.2, opacity: 0.8 }, { scale: 2.6, opacity: 0, duration: 0.5, stagger: 0.07, transformOrigin: '50% 50%' }, '<0.2')
      .from('.ticket', { y: 80, rotation: 6, autoAlpha: 0, duration: 0.4, stagger: 0.06 }, '-=0.2')
      .to(rail.value, { x: () => -distance(), duration: 2, ease: 'none' })
      .to('.ticket:last-child .ticket__stub', { x: 40, y: 30, rotation: 20, autoAlpha: 0, duration: 0.35 })
  })

  mm.add(MEDIA.phone, () => {
    gsap.from('.map-pin', {
      y: -120,
      autoAlpha: 0,
      duration: 0.7,
      stagger: 0.08,
      ease: 'bounce.out',
      scrollTrigger: { trigger: '.events-map', scroller, start: 'top 75%' },
    })
  })

  gsap.utils.toArray('.map-pin__glow').forEach((el, i) => {
    gsap.to(el, { scale: 1.8, opacity: 0, duration: 1.8, delay: i * 0.2, repeat: -1, ease: 'power1.out', transformOrigin: '50% 50%' })
  })
})
</script>

<template>
  <section ref="root" class="scene events" data-track="Events" aria-labelledby="events-title">
    <div class="container-xxl">
      <div class="events-head">
        <p class="scene-eyebrow" style="--c: var(--genre-pop)"><i class="bi bi-geo-alt"></i> Track 4 · Events</p>
        <h2 id="events-title" class="scene-title">Tonight, somewhere<br />in Singapore.</h2>
        <p class="scene-lede">Every gig on one map, filtered by genre, date and how far you are willing to travel.</p>
        <RouterLink :to="{ name: 'events-map' }" class="landing-btn landing-btn--primary mt-3">
          See what's on <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </div>

      <div class="events-body">
        <div class="events-map" aria-hidden="true">
          <svg viewBox="0 0 400 320">
            <path class="map-river" d="M-10 250 C60 230 110 260 170 236 C230 212 260 250 300 268 C340 286 380 270 420 280" />
            <path class="map-road" pathLength="1" d="M20 40 C120 80 200 60 280 120 C330 160 360 200 390 210" />
            <path class="map-road" pathLength="1" d="M60 300 C100 220 160 170 230 120 C280 85 320 50 380 20" />
            <path class="map-road" pathLength="1" d="M10 170 C90 150 170 160 240 190 C300 215 350 210 400 180" />
            <path class="map-road" pathLength="1" d="M180 0 C190 80 200 160 190 320" />
            <g v-for="p in pins" :key="p.id" class="map-pin" :transform="`translate(${p.x} ${p.y})`">
              <circle class="map-ripple" r="10" />
              <circle class="map-pin__glow" r="9" />
              <path class="map-pin__shape" d="M0 0 C-8 -10 -10 -14 -10 -19 A10 10 0 1 1 10 -19 C10 -14 8 -10 0 0 Z" />
              <circle class="map-pin__dot" cy="-19" r="3.6" />
            </g>
          </svg>
          <span class="map-label">Central Singapore · {{ pins.length }} venues</span>
        </div>

        <div class="ticket-window">
          <div ref="rail" class="ticket-rail">
            <article v-for="t in TICKETS" :key="t.artist" class="ticket" :style="{ '--c': t.genre.color }">
              <div class="ticket__main">
                <span class="ticket__genre">{{ t.genre.name }}</span>
                <strong>{{ t.artist }}</strong>
                <span class="ticket__venue"><i class="bi bi-geo-alt-fill"></i> {{ t.venue }}</span>
                <span class="ticket__time">{{ t.time }}</span>
              </div>
              <div class="ticket__stub">
                <span>{{ t.day }}</span>
                <b>{{ t.date }}</b>
                <span>{{ t.month }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.events {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 3rem 0;
}
.events-head {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: space-between;
  align-items: end;
  column-gap: 2rem;
}
.events-head .scene-eyebrow,
.events-head .scene-title {
  grid-column: 1;
}
.events-head .scene-eyebrow {
  justify-self: start;
}
.events-head .scene-lede {
  grid-column: 1;
}
.events-head .landing-btn {
  grid-column: 2;
  grid-row: 3 / 5;
  align-self: end;
  justify-self: end;
}
.events-body {
  display: grid;
  grid-template-columns: minmax(280px, 0.7fr) 1.3fr;
  gap: 2rem;
  align-items: center;
  margin-top: 1.5rem;
}
.events-map {
  max-height: 46vh;
  aspect-ratio: 400 / 320;
}

/* map */
.events-map {
  position: relative;
  border-radius: 28px;
  border: 1px solid var(--riffle-border);
  background:
    radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--genre-pop) 10%, transparent), transparent 60%),
    var(--riffle-surface);
  box-shadow: 0 24px 50px rgba(30, 30, 90, 0.12);
  overflow: hidden;
}
.events-map svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.map-river {
  fill: none;
  stroke: color-mix(in srgb, var(--genre-pop) 35%, transparent);
  stroke-width: 14;
  stroke-linecap: round;
}
.map-road {
  fill: none;
  stroke: color-mix(in srgb, var(--riffle-ink) 14%, transparent);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 1;
}
.map-pin__shape {
  fill: #7c4dff;
  stroke: #fff;
  stroke-width: 2;
}
.map-pin:nth-child(3n) .map-pin__shape {
  fill: #ff4d8d;
}
.map-pin__dot {
  fill: #fff;
}
.map-pin__glow {
  fill: rgba(124, 77, 255, 0.35);
}
.map-ripple {
  fill: none;
  stroke: #7c4dff;
  stroke-width: 2;
  opacity: 0;
}
.map-label {
  position: absolute;
  left: 14px;
  bottom: 12px;
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: var(--riffle-surface);
  border: 1px solid var(--riffle-border);
  color: var(--riffle-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

/* tickets */
.ticket-window {
  overflow: hidden;
  padding: 1.5rem 0;
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
}
.ticket-rail {
  display: flex;
  gap: 1.2rem;
  width: max-content;
  padding-inline: 1.5rem;
  will-change: transform;
}
.ticket {
  display: flex;
  width: 300px;
  border-radius: 18px;
  background: var(--riffle-surface);
  box-shadow: 0 16px 34px rgba(30, 30, 90, 0.14), inset 0 0 0 1px var(--riffle-border);
  overflow: visible;
}
.ticket__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 1.1rem 1.2rem;
  border-left: 6px solid var(--c);
  border-radius: 18px 0 0 18px;
}
.ticket__genre {
  align-self: flex-start;
  padding: 0.1rem 0.6rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 14%, var(--riffle-surface));
  color: var(--c);
  font-size: 0.7rem;
  font-weight: 800;
}
.ticket__main strong {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--riffle-ink);
}
.ticket__venue,
.ticket__time {
  color: var(--riffle-muted);
  font-size: 0.85rem;
}
.ticket__stub {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 78px;
  border-left: 2px dashed var(--riffle-border);
  border-radius: 0 18px 18px 0;
  background: linear-gradient(160deg, #ff4d8d, #7c4dff);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.ticket__stub b {
  font-size: 1.8rem;
  line-height: 1.1;
}
.ticket__stub::before,
.ticket__stub::after {
  content: '';
  position: absolute;
  left: -9px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--riffle-glow, #fff);
}
.ticket__stub::before {
  top: -8px;
}
.ticket__stub::after {
  bottom: -8px;
}

@media (max-width: 767.98px) {
  .events-head {
    grid-template-columns: 1fr;
  }
  .events-head .landing-btn {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
  }
  .events-body {
    grid-template-columns: 1fr;
  }
  .events-map {
    max-height: none;
  }
  .ticket-window {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    mask-image: none;
  }
  .ticket {
    scroll-snap-align: start;
    width: 270px;
  }
}
</style>
