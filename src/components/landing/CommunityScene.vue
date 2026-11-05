<script setup>
import { ref } from 'vue'
import { useLandingMotion } from '@/composables/landing/useLandingMotion'
import { CHATTER } from '@/data/landing'

const root = ref(null)

useLandingMotion(root, (gsap, ScrollTrigger, { mm, scroller }) => {
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: root.value, scroller, start: 'top 65%' } })
    tl.from('.bubble', { y: 60, scale: 0.85, autoAlpha: 0, duration: 0.6, stagger: 0.18, ease: 'back.out(1.6)' })
      .from('.bubble__mention', { backgroundColor: 'transparent', duration: 0.6 }, '-=0.3')
      .from('.bubble__votes b', { textContent: 0, duration: 1.2, snap: { textContent: 1 }, stagger: 0.1, ease: 'power2.out' }, '-=0.8')
    gsap.to('.bubble', { y: '-=8', duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.4, from: 'random' } })
  })
})
</script>

<template>
  <section ref="root" class="scene community" data-track="Community" aria-labelledby="community-title">
    <div class="container-xxl scene-grid">
      <div class="scene-copy">
        <p class="scene-eyebrow" style="--c: var(--genre-electronic)"><i class="bi bi-chat-square-text"></i> Track 5 · Forum</p>
        <h2 id="community-title" class="scene-title">Find your people<br />before the show.</h2>
        <p class="scene-lede">Swap recommendations, tag a friend, upvote the gig everyone should see, and find someone to go with.</p>
        <RouterLink :to="{ name: 'forum' }" class="landing-btn landing-btn--ghost mt-4">
          Join the conversation <i class="bi bi-arrow-right"></i>
        </RouterLink>
      </div>
      <div class="bubbles" aria-hidden="true">
        <div v-for="(c, i) in CHATTER" :key="c.who" class="bubble" :class="{ 'is-right': i % 2 }">
          <span class="bubble__who">{{ c.who }}</span>
          <p>
            <template v-if="c.mention">
              <span class="bubble__mention">{{ c.mention }}</span>{{ c.text.replace(c.mention, '') }}
            </template>
            <template v-else>{{ c.text }}</template>
          </p>
          <span class="bubble__votes"><i class="bi bi-arrow-up-circle-fill"></i> <b>{{ c.votes }}</b></span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.community {
  padding: 7rem 0;
}
.bubbles {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.bubble {
  position: relative;
  max-width: min(82%, 27rem);
  padding: 0.9rem 1.1rem 0.8rem;
  border-radius: 22px 22px 22px 6px;
  background: var(--riffle-surface);
  border: 1px solid var(--riffle-border);
  box-shadow: 0 14px 30px rgba(30, 30, 90, 0.1);
}
.bubble.is-right {
  align-self: flex-end;
  border-radius: 22px 22px 6px 22px;
  background: linear-gradient(135deg, #7c4dff, #ff4d8d);
  border-color: transparent;
  color: #fff;
}
.bubble__who {
  font-size: 0.75rem;
  font-weight: 800;
  opacity: 0.7;
}
.bubble p {
  margin: 0.15rem 0 0.4rem;
  font-weight: 600;
  color: inherit;
}
.bubble:not(.is-right) p {
  color: var(--riffle-ink);
}
.bubble__mention {
  padding: 0 0.3rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--genre-electronic) 25%, transparent);
  color: var(--genre-electronic);
  font-weight: 800;
}
.bubble__votes {
  font-size: 0.8rem;
  font-weight: 800;
  color: #16a34a;
}
.bubble.is-right .bubble__votes {
  color: #fff;
}
</style>
