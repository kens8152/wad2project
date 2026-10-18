<script setup>
defineProps({
  post: { type: Object, required: true },
})
</script>

<template>
  <article class="card w-100">
    <div class="card-body">
      <p class="card-subtitle small text-body-secondary mb-1">
        <i class="bi bi-person-circle me-1"></i>{{ post.username }}
      </p>

      <h5 class="card-title">{{ post.title }}</h5>

      <p v-if="post.content" class="card-text">{{ post.content }}</p>

      <div class="d-flex flex-wrap gap-1 mb-3">
        <span v-for="tag in post.tags" :key="tag" class="badge rounded-pill text-bg-light border">
          #{{ tag }}
        </span>
      </div>

      <div class="d-flex align-items-center gap-3 text-body-secondary small">
        <span><i class="bi bi-arrow-up-circle me-1 text-success"></i>{{ post.upvotes }}</span>
        <span><i class="bi bi-arrow-down-circle me-1 text-danger"></i>{{ post.downvotes }}</span>
        <span><i class="bi bi-chat me-1"></i>{{ post.replies?.length ?? 0 }}</span>
      </div>
    </div>
  </article>
</template>