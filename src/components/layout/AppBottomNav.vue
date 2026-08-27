<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Home, PenLine, Clock, Archive } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { bottomNavItems } from '@/data/mockData'
import { useCurrentUser } from '@/composables/useCurrentUser'
import AppUserPopover from './AppUserPopover.vue'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()
const { initials } = useCurrentUser()

const icons: Record<string, typeof Home> = {
  home: Home,
  sign: PenLine,
  timestamp: Clock,
  archive: Archive,
}

// The desktop sidebar's own avatar trigger opens AppUserPopover
// (language/theme/logout) — mobile had no equivalent, since this tab used
// to just be a RouterLink straight to /profile. It now opens the same
// popover content instead; "Profil & Ayarlar" inside it is still the only
// way to actually navigate to /profile, same as on desktop.
const accountSheetOpen = ref(false)

function isActive(routeName?: string) {
  return !!routeName && route.name === routeName
}
</script>

<template>
  <nav
    class="md:hidden fixed inset-x-0 bottom-0 z-10 bg-card border-t border-border grid grid-cols-5 pt-2.5 pb-5 px-1.5"
  >
    <template v-for="item in bottomNavItems" :key="item.key">
      <button
        v-if="item.key === 'account'"
        type="button"
        class="flex flex-col items-center gap-1.5 mx-1 py-1.5 rounded-xl transition-colors active:scale-95 active:opacity-70"
        :class="
          isActive(item.routeName)
            ? 'bg-panel-active text-panel-active-foreground font-semibold'
            : 'text-muted-foreground'
        "
        :aria-current="isActive(item.routeName) ? 'page' : undefined"
        @click="accountSheetOpen = true"
      >
        <span
          class="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-semibold"
          >{{ initials }}</span
        >
        <span class="text-[10px] font-medium">{{ t(item.labelKey) }}</span>
      </button>

      <RouterLink
        v-else
        :to="item.disabled ? '' : { name: item.routeName }"
        class="flex flex-col items-center gap-1.5 mx-1 py-1.5 rounded-xl transition-colors active:scale-95 active:opacity-70"
        :class="[
          item.disabled
            ? 'opacity-40 pointer-events-none text-muted-foreground'
            : isActive(item.routeName)
              ? 'bg-panel-active text-panel-active-foreground font-semibold'
              : 'text-muted-foreground',
        ]"
      >
        <component :is="icons[item.key]" class="w-5 h-5" />
        <span class="text-[10px] font-medium">{{ t(item.labelKey) }}</span>
      </RouterLink>
    </template>
  </nav>

  <!-- Same bottom-sheet container pattern as TimestampCommitModal's mobile
       step (Teleport + backdrop + rounded-t-2xl sheet), reusing
       AppUserPopover's content as-is rather than duplicating it. -->
  <Teleport to="body">
    <div v-if="accountSheetOpen" class="md:hidden fixed inset-0 z-40">
      <div class="absolute inset-0 bg-black/50" @click="accountSheetOpen = false"></div>
      <div
        role="dialog"
        aria-modal="true"
        class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        @keydown.esc="accountSheetOpen = false"
      >
        <AppUserPopover @close="accountSheetOpen = false" />
      </div>
    </div>
  </Teleport>
</template>
