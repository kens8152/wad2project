<script setup>
import EventsShell from '../../components/events/EventsShell.vue'
import EventListCard from '../../components/events/EventListCard.vue'
import SortDropdown from '../../components/events/SortDropdown.vue'
import { SORTS, useEventFilters } from '../../composables/events/useEventFilters'

const filters = useEventFilters()
</script>

<template>
  <EventsShell view="list">
    <template #actions>
      <SortDropdown v-model="filters.sort.value" :options="SORTS" />
    </template>

    <template #default="{ events }">
      <!-- Bootstrap columns: 1 on phones, 2 from sm, 3 from xl -->
      <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3">
        <div v-for="e in events" :key="e.id" class="col">
          <EventListCard :event="e" class="h-100" />
        </div>
      </div>
    </template>
  </EventsShell>
</template>
