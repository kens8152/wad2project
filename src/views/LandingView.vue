<script setup>
import LandingHero from '@/components/landing/LandingHero.vue'
import GenreMarquee from '@/components/landing/GenreMarquee.vue'
import DiscoverScene from '@/components/landing/DiscoverScene.vue'
import MatchDeckScene from '@/components/landing/MatchDeckScene.vue'
import EventsScene from '@/components/landing/EventsScene.vue'
import CommunityScene from '@/components/landing/CommunityScene.vue'
import StatsOdometer from '@/components/landing/StatsOdometer.vue'
import LandingEncore from '@/components/landing/LandingEncore.vue'
</script>

<template>
  <div class="landing riffle-page-bg">
    <LandingHero />
    <GenreMarquee />
    <DiscoverScene />
    <MatchDeckScene />
    <EventsScene />
    <CommunityScene />
    <StatsOdometer />
    <LandingEncore />
  </div>
</template>

<style>
/* Shared landing styles */
.landing {
  overflow-x: clip;
}
.landing .scene {
  position: relative;
  padding: 4rem 0;
}
.landing .scene-grid {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 3rem;
  align-items: center;
  width: 100%;
}
.landing .scene-grid--flip {
  grid-template-columns: 0.85fr 1.15fr;
}
.landing .scene-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0 0.9rem;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 12%, var(--riffle-surface));
  color: var(--c);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.landing .scene-title {
  margin: 0;
  font-size: clamp(2.2rem, 4.4vw, 3.6rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.035em;
  color: var(--riffle-ink);
}
.landing .scene-lede {
  max-width: 34rem;
  margin: 1.1rem 0 0;
  color: var(--riffle-muted);
  font-size: 1.1rem;
  line-height: 1.6;
}

.landing .landing-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 1rem;
  text-decoration: none;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, background 0.2s;
}
.landing .landing-btn--primary {
  border: 0;
  background: linear-gradient(120deg, #ff4d8d, #7c4dff);
  color: #fff;
  box-shadow: 0 12px 28px rgba(124, 77, 255, 0.35);
}
.landing .landing-btn--primary:hover {
  color: #fff;
  box-shadow: 0 16px 34px rgba(255, 77, 141, 0.4);
}
.landing .landing-btn--ghost {
  border: 1.5px solid var(--riffle-border);
  background: var(--riffle-surface);
  color: var(--riffle-ink);
}
.landing .landing-btn--ghost:hover {
  border-color: #7c4dff;
  color: var(--riffle-ink);
}
.landing .landing-btn--lg {
  padding: 1rem 1.9rem;
  font-size: 1.1rem;
}
.landing .landing-btn--pulse {
  animation: landing-pulse 2.4s ease-in-out infinite;
}
@keyframes landing-pulse {
  0%, 100% { box-shadow: 0 12px 28px rgba(124, 77, 255, 0.35), 0 0 0 0 rgba(255, 77, 141, 0.45); }
  50% { box-shadow: 0 12px 28px rgba(124, 77, 255, 0.35), 0 0 0 14px rgba(255, 77, 141, 0); }
}
.landing .landing-btn:focus-visible {
  outline: 3px solid #7c4dff;
  outline-offset: 3px;
}

@media (max-width: 991.98px) {
  .landing .scene-grid,
  .landing .scene-grid--flip {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .landing .landing-btn--pulse {
    animation: none;
  }
}
</style>
