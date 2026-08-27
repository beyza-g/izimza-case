<script setup lang="ts">
import { ref } from 'vue'
import { Home, PenLine, Clock, Archive, FolderKanban } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { navItems } from '@/data/mockData'
import AppUserCard from './AppUserCard.vue'

const { t } = useI18n({ useScope: 'global' })

const icons: Record<string, typeof Home> = {
  home: Home,
  sign: PenLine,
  timestamp: Clock,
  archive: Archive,
  documents: FolderKanban,
}

const route = useRoute()
function isActive(routeName?: string) {
  return !!routeName && route.name === routeName
}

// Icon-rail (md, below lg) temporarily expands to show labels on hover —
// like VS Code/Slack's collapsed sidebar. Overlaid via absolute positioning
// (scoped to the md-only range with max-lg:) so it never pushes the layout;
// the <aside> below keeps reserving the rail's normal width regardless.
const expanded = ref(false)
</script>

<template>
  <aside class="hidden md:block md:relative md:w-[76px] lg:w-[248px] md:flex-none">
    <div
      class="h-full flex flex-col bg-primary text-primary-foreground transition-[width] duration-200 ease-out md:max-lg:absolute md:max-lg:inset-y-0 md:max-lg:left-0 md:max-lg:z-30 md:max-lg:overflow-hidden lg:w-[248px]"
      :class="expanded ? 'md:max-lg:w-[248px]' : 'md:max-lg:w-[76px]'"
      @mouseenter="expanded = true"
      @mouseleave="expanded = false"
    >
      <div
        class="h-[68px] flex-none flex items-center px-5 lg:justify-start"
        :class="expanded ? 'justify-start' : 'justify-center'"
      >
        <div
          v-if="!expanded"
          class="lg:hidden w-[26px] h-[26px] rounded-lg bg-white/12 flex items-center justify-center flex-none"
        >
          <div class="w-2.5 h-2.5 bg-accent rounded-sm rotate-45"></div>
        </div>
        <span
          class="text-2xl font-bold tracking-tighter"
          :class="expanded ? '' : 'hidden lg:inline'"
          >izimza</span
        >
      </div>

      <nav class="flex flex-col gap-1 px-3 lg:px-4">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.disabled ? '' : { name: item.routeName }"
          class="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm whitespace-nowrap"
          :class="[
            item.disabled
              ? 'opacity-45 pointer-events-none'
              : 'hover:bg-white/10 transition-colors',
            isActive(item.routeName) ? 'bg-white/15 font-semibold' : '',
            expanded ? 'justify-start' : 'justify-center',
            'lg:justify-start',
          ]"
        >
          <component :is="icons[item.key]" class="w-4 h-4 flex-none" />
          <span :class="expanded ? '' : 'hidden lg:inline'">{{ t(item.labelKey) }}</span>
        </RouterLink>
      </nav>

      <div class="mt-auto p-3 lg:p-4">
        <AppUserCard :expanded="expanded" />
      </div>
    </div>
  </aside>
</template>
