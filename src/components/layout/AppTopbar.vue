<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <header
    class="hidden md:flex h-[68px] flex-none border-b border-border bg-card items-center px-6 lg:px-8"
  >
    <span class="font-mono text-xs text-muted-foreground">{{
      route.meta.titleKey ? t(route.meta.titleKey) : ''
    }}</span>
  </header>

  <header
    class="md:hidden flex-none bg-primary text-primary-foreground px-4 py-3.5 flex items-center gap-3"
  >
    <span class="text-lg font-bold tracking-tighter">izimza</span>
    <span class="text-white/40">·</span>
    <span class="text-base font-medium tracking-tight">{{
      route.meta.titleKey ? t(route.meta.titleKey) : ''
    }}</span>
  </header>
</template>
