<script setup>
// Two cards with a star. Animates when its parent with class "match-trigger" is hovered.
defineProps({
  // Front card fill, same as the button background so the back card hides behind it
  fill: {
    type: String,
    default: '#1d2b64',
  },
})
</script>

<template>
  <span class="match-cards" aria-hidden="true">
    <span class="match-card match-card--back"></span>
    <span class="match-card match-card--front" :style="{ backgroundColor: fill }">
      <i class="bi bi-star-fill"></i>
    </span>
  </span>
</template>

<style scoped>
/* Card icon */
.match-cards {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 22px;
  flex-shrink: 0;
  vertical-align: middle;
}
.match-card {
  position: absolute;
  top: 1px;
  width: 14px;
  height: 20px;
  border: 2px solid #fff;
  border-radius: 3px;
  color: #fff;
  transition: transform 0.35s ease;
}
.match-card--back {
  left: 0;
  opacity: 0.55;
  transform: rotate(-12deg);
}
.match-card--front {
  right: 0;
  display: grid;
  place-items: center;
  font-size: 7px;
  transform: rotate(8deg);
}
.match-trigger:hover .match-card--back {
  transform: rotate(-20deg);
}
.match-trigger:hover .match-card--front {
  transform: rotate(14deg);
}

/* Cards and star fade between white and pink */
.match-trigger:hover .match-card {
  animation: match-glow 1.6s ease-in-out infinite alternate;
}
@keyframes match-glow {
  from {
    border-color: #fff;
    color: #fff;
  }
  to {
    border-color: #ff8fc7;
    color: #ff8fc7;
  }
}

/* Wiggles every 1.5s */
.match-trigger:hover .match-cards {
  animation: match-wiggle 1.5s ease-in-out infinite;
}
@keyframes match-wiggle {
  0%,
  40%,
  100% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(-14deg);
  }
  20% {
    transform: rotate(12deg);
  }
  30% {
    transform: rotate(-6deg);
  }
}
</style>
