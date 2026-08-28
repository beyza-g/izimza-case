<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
    <Loader2 class="w-6 h-6 text-primary dark:text-foreground animate-spin" />
    <p class="text-sm text-muted-foreground">{{ $t('common.loggingIn') }}</p>
  </div>
</template>
