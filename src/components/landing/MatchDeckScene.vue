<script setup>
import { ref } from 'vue'
import { useLandingMotion, replayOnView, MEDIA } from '@/composables/landing/useLandingMotion'
import { SHOWCASE_ARTISTS } from '@/data/landing'

const root = ref(null)
const cards = SHOWCASE_ARTISTS.slice(0, 12)
const last = cards.length - 1

const steps = [
  { title: 'A fresh deck every day', text: 'Seven local artists you have not heard yet, picked for your taste.' },
  { title: 'Hear them first', text: 'Every card plays a 30-second preview, so you judge the music, not the hype.' },
  { title: 'Like, skip or save', text: 'Likes shape tomorrow’s deck. Saves wait for you in your profile.' },
]

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  const fan = (i) => {
    const fromTop = last - i
    return { x: fromTop * -7, y: fromTop * -5, rotation: (fromTop % 2 ? -1 : 1) * Math.min(fromTop * 2.2, 12) }
  }

  const build = ({ pinned, count }) => {
    const list = gsap.utils.toArray('.deck-card').slice(-count)
    const firstIndex = cards.length - count
    if (firstIndex > 0) gsap.set(gsap.utils.toArray('.deck-card').slice(0, firstIndex), { autoAlpha: 0 })

    const tl = gsap.timeline()
    replayOnView(ScrollTrigger, tl, { trigger: pinned ? root.value : root.value.querySelector('.deck-stage'), scroller })

    list.forEach((card, n) => {
      const i = firstIndex + n
      const side = n % 2 ? 1 : -1
      const end = fan(i)
      tl.fromTo(
        card,
        { x: side * (260 + (n % 3) * 120), y: -window.innerHeight * 1.1, rotation: side * (40 + n * 6), autoAlpha: 1 },
        {
          keyframes: [
            { x: side * (120 + (n % 4) * 30), y: -window.innerHeight * 0.35, rotation: side * -18, duration: 0.5, ease: 'power1.in' },
            { x: end.x, y: end.y, rotation: end.rotation, duration: 0.5, ease: 'back.out(1.4)' },
          ],
        },
        n * 0.16,
      )
    })

    const top = list[list.length - 1]
    const second = list[list.length - 2]
    const third = list[list.length - 3]

    if (pinned) tl.to('.deck-step-0', { opacity: 0, y: -16, duration: 0.25 }).fromTo('.deck-step-1', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.25 })
    tl.to(top.querySelectorAll('.deck-eq i'), { scaleY: 1, duration: 0.15, stagger: { each: 0.04, repeat: 5, yoyo: true } })
      .fromTo(top.querySelector('.deck-progress'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'none' }, '<')

    if (pinned) tl.to('.deck-step-1', { opacity: 0, y: -16, duration: 0.25 }).fromTo('.deck-step-2', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.25 })

    tl.to(top.querySelector('.stamp--like'), { opacity: 1, scale: 1, duration: 0.2 })
      .to(top, { x: 520, y: -40, rotation: 24, autoAlpha: 0, duration: 0.6, ease: 'power2.in' })
      .to(second, { rotation: 0, x: 0, y: 0, duration: 0.3 }, '<0.2')
      .to(second.querySelector('.stamp--skip'), { opacity: 1, scale: 1, duration: 0.2 })
      .to(second, { x: -520, y: -20, rotation: -22, autoAlpha: 0, duration: 0.6, ease: 'power2.in' })
      .to(third, { rotation: 0, x: 0, y: 0, duration: 0.3 }, '<0.2')
      .fromTo(third.querySelector('.deck-save'), { scale: 1 }, { scale: 1.35, duration: 0.15, yoyo: true, repeat: 1 })
      .to(third.querySelector('.deck-save'), { backgroundColor: '#7c4dff', color: '#fff', duration: 0.1 }, '<')
      .to(third.querySelector('.stamp--save'), { opacity: 1, scale: 1, duration: 0.2 }, '<')
      .fromTo('.deck-count', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.3 })
  }

  mm.add(MEDIA.desktop, () => build({ pinned: true, count: 12 }))
  mm.add(MEDIA.phone, () => build({ pinned: false, count: 6 }))
})
</script>

<template>
  <section ref="root" class="scene deck" data-track="Matchmaking" aria-labelledby="deck-title">
    <div class="container-xxl scene-grid scene-grid--flip">
      <div class="scene-copy">
        <p class="scene-eyebrow" style="--c: #ff4d8d"><i class="bi bi-shuffle"></i> Track 3 · Matchmaking</p>
        <h2 id="deck-title" class="scene-title">Swipe your way<br />to a new favourite.</h2>
        <div class="deck-steps">
          <div v-for="(s, i) in steps" :key="s.title" class="deck-step" :class="'deck-step-' + i">
            <span class="deck-step__num">0{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.text }}</p>
          </div>
        </div>
        <RouterLink :to="{ name: 'matchmaking' }" class="landing-btn landing-btn--primary mt-4">
          Deal me in <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </div>

      <div class="deck-stage" aria-hidden="true">
        <div class="deck-glow"></div>
        <article v-for="a in cards" :key="a.name" class="deck-card" :style="{ '--c': a.genre.color }">
          <img :src="a.image" alt="" width="300" height="300" loading="lazy" />
          <span class="deck-save"><i class="bi bi-bookmark-fill"></i></span>
          <span class="stamp stamp--like">LIKE</span>
          <span class="stamp stamp--skip">SKIP</span>
          <span class="stamp stamp--save">SAVED</span>
          <div class="deck-info">
            <strong>{{ a.name }}</strong>
            <span class="deck-genre">{{ a.genre.name }}</span>
            <div class="deck-song">
              <span class="deck-play"><i class="bi bi-play-fill"></i></span>
              <span class="deck-eq"><i></i><i></i><i></i><i></i><i></i></span>
              <span class="deck-bar"><span class="deck-progress"></span></span>
              <small>0:30</small>
            </div>
          </div>
        </article>
        <p class="deck-count"><b>7</b> new artists, every single day</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.deck {
  min-height: calc(100vh - var(--navbar-height));
  display: flex;
  align-items: center;
  overflow: hidden;
}
.deck-steps {
  position: relative;
  min-height: 9.5rem;
  margin-top: 1.6rem;
}
.deck-step {
  position: absolute;
  inset: 0;
}
.deck-step-1,
.deck-step-2 {
  opacity: 0;
}
.deck-step__num {
  font-size: 0.8rem;
  font-weight: 800;
  color: #ff4d8d;
  letter-spacing: 0.1em;
}
.deck-step h3 {
  margin: 0.2rem 0 0.4rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--riffle-ink);
}
.deck-step p {
  margin: 0;
  max-width: 28rem;
  color: var(--riffle-muted);
  font-size: 1.05rem;
  line-height: 1.6;
}

/* stage */
.deck-stage {
  position: relative;
  height: min(78vh, 620px);
  display: grid;
  place-items: center;
}
.deck-glow {
  position: absolute;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 141, 0.28), rgba(124, 77, 255, 0.18) 45%, transparent 70%);
  filter: blur(10px);
}
.deck-card {
  position: absolute;
  width: min(300px, 72vw);
  aspect-ratio: 3 / 4.3;
  border-radius: 22px;
  overflow: hidden;
  background: #111;
  box-shadow: 0 24px 50px rgba(20, 10, 50, 0.35), 0 0 0 2px color-mix(in srgb, var(--c) 60%, transparent);
  will-change: transform;
}
.deck-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.deck-info {
  position: absolute;
  inset: auto 0 0 0;
  padding: 0.9rem 1rem 1rem;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.55) 25%, rgba(0, 0, 0, 0.78));
  color: #fff;
}
.deck-info strong {
  display: block;
  font-size: 1.35rem;
  font-weight: 800;
}
.deck-genre {
  display: inline-block;
  margin-top: 0.3rem;
  padding: 0.1rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  font-size: 0.72rem;
}
.deck-song {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.7rem;
  padding: 0.4rem 0.6rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.75rem;
}
.deck-play {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  color: #111;
}
.deck-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
}
.deck-eq i {
  width: 3px;
  height: 100%;
  border-radius: 2px;
  background: #fff;
  transform: scaleY(0.3);
  transform-origin: bottom;
}
.deck-bar {
  flex: 1;
  height: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}
.deck-progress {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ff4d8d, #7c4dff);
  transform: scaleX(0);
  transform-origin: left;
}
.deck-save {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fff;
  color: #7c4dff;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}
.stamp {
  position: absolute;
  top: 26px;
  padding: 0.2rem 0.8rem;
  border: 4px solid currentColor;
  border-radius: 10px;
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  opacity: 0;
  transform: scale(1.6);
}
.stamp--like {
  right: 18px;
  color: #22c55e;
  rotate: 14deg;
}
.stamp--skip {
  right: 18px;
  color: #ef4444;
  rotate: -12deg;
}
.stamp--save {
  right: 18px;
  color: #7c4dff;
  rotate: 10deg;
  background: rgba(255, 255, 255, 0.85);
}
.deck-count {
  position: absolute;
  bottom: -0.5rem;
  margin: 0;
  color: var(--riffle-muted);
  font-weight: 700;
  opacity: 0;
}
.deck-count b {
  font-size: 1.6rem;
  background: linear-gradient(90deg, #ff4d8d, #7c4dff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
@media (prefers-reduced-motion: reduce) {
  .deck-step-1,
  .deck-step-2,
  .deck-count {
    opacity: 1;
  }
  .deck-steps {
    min-height: 0;
  }
  .deck-step {
    position: static;
    margin-bottom: 1rem;
  }
}
@media (max-width: 767.98px) {
  .deck-steps {
    min-height: 0;
  }
  .deck-step {
    position: static;
    margin-bottom: 1rem;
    opacity: 1;
  }
  .deck-stage {
    height: 520px;
    overflow: hidden;
    margin-inline: -1rem;
  }
  .deck-card {
    width: min(300px, 62vw);
    margin-left: 3rem;
  }
}
</style>
