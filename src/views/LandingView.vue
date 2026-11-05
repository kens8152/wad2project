<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// the six genres, same colours as the web of dots
const genres = [
  { name: 'Indie Rock', color: 'var(--genre-indie-rock)' },
  { name: 'Pop', color: 'var(--genre-pop)' },
  { name: 'Mandopop', color: 'var(--genre-mandopop)' },
  { name: 'Electronic', color: 'var(--genre-electronic)' },
  { name: 'Hip-Hop', color: 'var(--genre-hip-hop)' },
  { name: 'Traditional', color: 'var(--genre-traditional)' },
]

// the four pillars of the app
const features = [
  {
    icon: 'bi-diagram-3',
    title: 'Discover',
    text: 'Explore a living web of artists where every dot is a musician and every line a shared audience. Find your taste profile and the acts near it.',
    color: 'var(--genre-hip-hop)',
    to: { name: 'discover' },
  },
  {
    icon: 'bi-calendar-event',
    title: 'Events',
    text: 'Browse live gigs across Singapore on an interactive map. Filter by genre, venue and date to find the next show worth leaving the house for.',
    color: 'var(--genre-pop)',
    to: { name: 'events-map' },
  },
  {
    icon: 'bi-person-badge',
    title: 'Artists',
    text: 'Deep-dive into artist profiles — bios, upcoming gigs, past shows and socials. Follow the acts you love and save them for later.',
    color: 'var(--genre-indie-rock)',
    to: { name: 'artists' },
  },
  {
    icon: 'bi-chat-square-text',
    title: 'Forum',
    text: 'Join the conversation. Swap recommendations, find people to go to shows with, and keep up with the local scene.',
    color: 'var(--genre-electronic)',
    to: { name: 'forum' },
  },
]

// a handful of decorative dots for the hero web
const heroDots = [
  { x: 12, y: 22, r: 7, c: 'var(--genre-indie-rock)' },
  { x: 28, y: 48, r: 11, c: 'var(--genre-electronic)' },
  { x: 20, y: 72, r: 6, c: 'var(--genre-traditional)' },
  { x: 46, y: 30, r: 9, c: 'var(--genre-mandopop)' },
  { x: 60, y: 60, r: 13, c: 'var(--genre-pop)' },
  { x: 78, y: 38, r: 8, c: 'var(--genre-hip-hop)' },
  { x: 88, y: 70, r: 6, c: 'var(--genre-hip-hop)' },
  { x: 70, y: 18, r: 7, c: 'var(--genre-mandopop)' },
  { x: 40, y: 82, r: 8, c: 'var(--genre-pop)' },
]
const heroLinks = [
  [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [3, 7], [4, 8], [5, 7],
]

function go(to) {
  router.push(to)
}
</script>

<template>
  <div class="landing">
    <!-- Hero -->
    <section class="hero">
      <div class="hero__copy">
        <h1 class="hero__title">
          Find your next<br />
          <span class="hero__accent">favourite artist.</span>
        </h1>
        <p class="hero__lede">
          Riffle maps the local music scene as a web of shared audiences. Discover artists,
          catch live gigs, and connect with people who listen like you.
        </p>
        <div class="hero__cta">
          <button class="btn-primary" @click="go({ name: 'discover' })">
            <i class="bi bi-diagram-3"></i> Start exploring
          </button>
          <button class="btn-ghost" @click="go({ name: 'events-map' })">
            <i class="bi bi-calendar-event"></i> See what's on
          </button>
        </div>

        <div class="hero__genres">
          <span
            v-for="g in genres"
            :key="g.name"
            class="genre-chip"
            :style="{ '--c': g.color }"
          >
            <i class="genre-chip__dot"></i>{{ g.name }}
          </span>
        </div>
      </div>

      <!-- decorative web of dots -->
      <div class="hero__web" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <line
            v-for="(l, i) in heroLinks"
            :key="'l' + i"
            :x1="heroDots[l[0]].x"
            :y1="heroDots[l[0]].y"
            :x2="heroDots[l[1]].x"
            :y2="heroDots[l[1]].y"
            class="web-line"
          />
          <circle
            v-for="(d, i) in heroDots"
            :key="'d' + i"
            :cx="d.x"
            :cy="d.y"
            :r="d.r"
            :fill="d.c"
            class="web-dot"
            :style="{ animationDelay: i * 0.15 + 's' }"
          />
        </svg>
      </div>
    </section>

    <!-- Features -->
    <section class="features">
      <h2 class="section-title">Everything in one place</h2>
      <p class="section-sub">Four ways to go deeper into the music you love.</p>

      <div class="feature-grid">
        <button
          v-for="f in features"
          :key="f.title"
          class="feature-card"
          :style="{ '--c': f.color }"
          @click="go(f.to)"
        >
          <span class="feature-card__icon"><i class="bi" :class="f.icon"></i></span>
          <h3 class="feature-card__title">{{ f.title }}</h3>
          <p class="feature-card__text">{{ f.text }}</p>
          <span class="feature-card__link">Open {{ f.title }} <i class="bi bi-arrow-right"></i></span>
        </button>
      </div>
    </section>

    <!-- Stats strip -->
    <section class="stats">
      <div class="stat">
        <strong>178</strong>
        <span>artists mapped</span>
      </div>
      <div class="stat">
        <strong>219</strong>
        <span>shared-audience links</span>
      </div>
      <div class="stat">
        <strong>6</strong>
        <span>genres across the island</span>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="closing">
      <h2 class="closing__title">Ready to dig in?</h2>
      <p class="closing__text">Jump into the web of dots and find the thread that leads to your sound.</p>
      <button class="btn-primary btn-primary--lg" @click="go({ name: 'discover' })">
        <i class="bi bi-diagram-3"></i> Explore the graph
      </button>
    </section>
  </div>
</template>

<style scoped>
.landing {
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

/* ---------- hero ---------- */
.hero {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 2.5rem;
  align-items: center;
  min-height: 70vh;
}
.hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: var(--riffle-surface-soft);
  color: var(--riffle-blue);
  font-size: 0.82rem;
  font-weight: 700;
}
.hero__title {
  margin: 1.1rem 0 0;
  font-size: clamp(2.6rem, 5vw, 4rem);
  line-height: 1.05;
  font-weight: 800;
  color: var(--riffle-ink);
}
.hero__accent {
  background: linear-gradient(120deg, var(--riffle-coral), var(--riffle-blue) 70%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero__lede {
  margin: 1.1rem 0 0;
  max-width: 34rem;
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--riffle-muted);
}
.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.6rem;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.4rem;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--riffle-blue), var(--riffle-coral-soft));
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 8px 22px color-mix(in srgb, var(--riffle-blue) 35%, transparent);
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--riffle-blue) 45%, transparent);
}
.btn-primary--lg {
  padding: 0.9rem 1.8rem;
  font-size: 1.1rem;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.4rem;
  border: 1.5px solid var(--riffle-border);
  border-radius: 12px;
  background: var(--riffle-surface);
  color: var(--riffle-ink);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}
.btn-ghost:hover {
  transform: translateY(-2px);
  border-color: var(--riffle-blue);
}
.hero__genres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.8rem;
}
.genre-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  background: color-mix(in srgb, var(--c) 10%, var(--riffle-surface));
  color: var(--riffle-ink);
  font-size: 0.8rem;
  font-weight: 600;
}
.genre-chip__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--c);
}

/* ---------- hero web graphic ---------- */
.hero__web {
  position: relative;
  aspect-ratio: 1;
  max-width: 460px;
  margin: 0 auto;
  width: 100%;
}
.hero__web svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.web-line {
  stroke: var(--riffle-border);
  stroke-width: 0.6;
}
.web-dot {
  transform-origin: center;
  animation: dot-in 0.5s ease backwards;
}
@keyframes dot-in {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.web-tag {
  position: absolute;
  left: 50%;
  bottom: 6%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  background: var(--riffle-surface);
  border: 1px solid var(--riffle-border);
  box-shadow: var(--riffle-shadow-sm);
  color: var(--riffle-ink);
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}
.web-tag .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--genre-mandopop);
}

/* ---------- features ---------- */
.features {
  margin-top: 4.5rem;
  text-align: center;
}
.section-title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 800;
  color: var(--riffle-ink);
}
.section-sub {
  margin: 0.5rem 0 0;
  color: var(--riffle-muted);
  font-size: 1.05rem;
}
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.1rem;
  margin-top: 2rem;
  text-align: left;
}
.feature-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border: 1px solid var(--riffle-border);
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface);
  box-shadow: var(--riffle-shadow-sm);
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}
.feature-card:hover {
  transform: translateY(-5px);
  border-color: color-mix(in srgb, var(--c) 60%, transparent);
  box-shadow: 0 14px 30px color-mix(in srgb, var(--c) 22%, transparent);
}
.feature-card__icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--c) 16%, var(--riffle-surface));
  color: var(--c);
  font-size: 1.4rem;
  margin-bottom: 1rem;
}
.feature-card__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--riffle-ink);
}
.feature-card__text {
  margin: 0.5rem 0 1rem;
  color: var(--riffle-muted);
  font-size: 0.92rem;
  line-height: 1.55;
  flex: 1;
}
.feature-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--c);
  font-weight: 700;
  font-size: 0.9rem;
}

/* ---------- stats ---------- */
.stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-top: 4rem;
}
.stat {
  flex: 1 1 200px;
  max-width: 280px;
  padding: 1.6rem 1rem;
  border-radius: var(--riffle-radius);
  background: var(--riffle-surface-soft);
  text-align: center;
}
.stat strong {
  display: block;
  font-size: 2.4rem;
  font-weight: 800;
  background: linear-gradient(120deg, var(--riffle-coral), var(--riffle-blue) 70%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}
.stat span {
  display: block;
  margin-top: 0.4rem;
  color: var(--riffle-muted);
  font-size: 0.9rem;
  font-weight: 600;
}

/* ---------- closing ---------- */
.closing {
  margin-top: 4.5rem;
  padding: 3rem 1.5rem;
  border-radius: 24px;
  background: var(--riffle-surface-soft);
  text-align: center;
}
.closing__title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  font-weight: 800;
  color: var(--riffle-ink);
}
.closing__text {
  margin: 0.6rem 0 1.6rem;
  color: var(--riffle-muted);
  font-size: 1.05rem;
}

/* ---------- responsive ---------- */
@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    min-height: auto;
    text-align: center;
  }
  .hero__lede {
    margin-left: auto;
    margin-right: auto;
  }
  .hero__cta,
  .hero__genres {
    justify-content: center;
  }
  .hero__web {
    order: -1;
    max-width: 320px;
  }
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .web-dot { animation: none; }
}
</style>
