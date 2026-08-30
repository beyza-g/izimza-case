<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppSettingsNav from '@/components/layout/AppSettingsNav.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import AppBottomNav from '@/components/layout/AppBottomNav.vue'
import ToastHost from '@/components/ui/ToastHost.vue'

const route = useRoute()
</script>

<template>
  <div class="h-screen flex bg-background text-foreground overflow-hidden">
    <AppSidebar />
    <AppSettingsNav v-if="route.meta.secondaryNav === 'settings'" />

    <div class="flex-1 flex flex-col min-w-0 min-h-0 pb-16 md:pb-0">
      <AppTopbar />
      <main class="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8">
        <router-view />
      </main>
    </div>

    <AppBottomNav />
    <ToastHost />
  </div>
</template>
