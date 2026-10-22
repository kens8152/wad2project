<script setup>
// Shown instead of a page when the user isn't logged in
defineProps({
  message: {
    type: String,
    default: 'to manage your preferences.',
  },
})
</script>

<template>
  <p class="text-center p-4">Please <RouterLink to="/login">log in</RouterLink> {{ message }}</p>
</template>
