<script setup>
import { onMounted } from 'vue'
import { useEventsStore } from '@/stores/events'
import EventCard from '@/components/events/EventCard.vue'

const eventsStore = useEventsStore()

onMounted(() => {
  eventsStore.fetchEvents()
})
</script>

<template>
  <div class="container-xxl py-4">
    <h1 class="mb-1">Events</h1>
    <p class="text-secondary">{{ eventsStore.events.length }} events coming up near you</p>

    <div v-if="eventsStore.loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <p v-else-if="eventsStore.error" class="text-danger">{{ eventsStore.error }}</p>

    <div v-else class="row g-3">
      <div v-for="event in eventsStore.events" :key="event.id" class="col-12 col-md-6 col-xl-4">
        <EventCard :event="event" />
      </div>
    </div>
  </div>
</template>
