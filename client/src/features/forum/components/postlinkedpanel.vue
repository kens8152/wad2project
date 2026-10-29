<script setup>
import { RouterLink, useRouter } from 'vue-router'
import LinkCard from './linkcard.vue'
import { detailRoute } from '../API/forumlinks.js'

defineProps({
  artists: { type: Array, default: () => [] },
  events: { type: Array, default: () => [] },
})

const router = useRouter()

function routeFor(item) {
  const to = detailRoute(item)
  return router.hasRoute(to.name) ? to : null
}
</script>

<template>
  <div class="vstack gap-4">
    <section v-if="artists.length">
      <h2 class="h6 text-body-secondary mb-2">Artists</h2>
      <div class="vstack gap-3">
        <component
          :is="routeFor(a) ? RouterLink : 'div'"
          v-for="a in artists"
          :key="a.id"
          :to="routeFor(a) ?? undefined"
          class="panel-link d-block text-reset text-decoration-none"
        >
          <LinkCard :item="a" />
        </component>
      </div>
    </section>

    <section v-if="events.length">
      <h2 class="h6 text-body-secondary mb-2">Events</h2>
      <div class="vstack gap-3">
        <component
          :is="routeFor(e) ? RouterLink : 'div'"
          v-for="e in events"
          :key="e.id"
          :to="routeFor(e) ?? undefined"
          class="panel-link d-block text-reset text-decoration-none"
        >
          <LinkCard :item="e" />
        </component>
      </div>
    </section>
  </div>
</template>

<style scoped>
a.panel-link {
  border-radius: 0.6rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
a.panel-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow-sm);
}

@media (prefers-reduced-motion: reduce) {
  a.panel-link {
    transition: none;
  }
}
</style>