<script setup lang="ts"></script>

<template>
  <div class="skeleton-shimmer rounded-md bg-muted" />
</template>

<style scoped>
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
}
.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.35) 50%, transparent 100%);
  animation: skeleton-shimmer 1.6s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
