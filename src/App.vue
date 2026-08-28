<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div
    v-if="authStore.isLoading"
    class="min-h-screen flex items-center justify-center bg-background"
  >
    <Loader2 class="w-6 h-6 text-primary dark:text-foreground animate-spin" />
  </div>
  <router-view v-else />
</template>
