<script setup>
import EventsShell from '../../components/events/EventsShell.vue'
import EventListCard from '../../components/events/EventListCard.vue'
import SortDropdown from '../../components/events/SortDropdown.vue'
import { SORTS, useEventFilters } from '../../composables/events/useEventFilters'

// This page only draws the results. The shell does the filters, search, loading and "no events" states.
const filters = useEventFilters()
</script>

<template>
  <EventsShell view="list">
    <!-- fills the shell's `actions` slot; v-model keeps the dropdown and filters.sort in step -->
    <template #actions>
      <SortDropdown v-model="filters.sort.value" :options="SORTS" />
    </template>

    <!-- fills the shell's default slot: `{ events }` is the filtered, sorted list the shell passes in -->
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
