<script setup lang="ts">
import { ChevronRight, LogOut, ChevronDown, Sun, Moon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useAuthStore } from '@/stores/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Locale } from '@/i18n'

const emit = defineEmits<{ close: [] }>()

const { theme, toggleTheme } = useTheme()
const { t, locale } = useI18n({ useScope: 'global' })
const { fullName, initials, email } = useCurrentUser()
const authStore = useAuthStore()

const LOCALE_LABELS: Record<Locale, string> = { tr: 'Türkçe', en: 'English' }

function setLocale(value: Locale) {
  locale.value = value
}

function logout() {
  emit('close')
  authStore.logout()
}
</script>

<template>
  <div class="w-full bg-card border border-border rounded-2xl p-2 shadow-2xl text-foreground">
    <div class="flex items-center gap-3 px-3 pt-3 pb-3.5">
      <span
        class="w-9 h-9 flex-none rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[13px] font-semibold"
        >{{ initials }}</span
      >
      <div class="min-w-0">
        <p class="text-sm font-semibold m-0">{{ fullName }}</p>
        <p class="text-[11px] text-muted-foreground truncate m-0">{{ email }}</p>
      </div>
    </div>

    <RouterLink
      :to="{ name: 'profile' }"
      class="flex items-center justify-between px-3 py-2.5 rounded-[10px] bg-muted text-sm font-medium"
      @click="$emit('close')"
    >
      {{ t('common.profileSettings') }}
      <ChevronRight class="w-3.5 h-3.5 text-muted-foreground" />
    </RouterLink>

    <div class="h-px bg-border my-2 mx-1"></div>

    <div class="flex items-center justify-between px-3 py-2">
      <span class="text-xs text-muted-foreground">{{ t('common.appearance') }}</span>
      <button
        type="button"
        role="switch"
        :aria-checked="theme === 'dark'"
        :aria-label="t('common.toggleAppearance')"
        class="relative w-14 h-7 flex-none rounded-full bg-secondary p-1 flex items-center justify-between"
        @click="toggleTheme"
      >
        <Sun class="w-3 h-3 text-muted-foreground/50" />
        <Moon class="w-3 h-3 text-muted-foreground/50" />
        <span
          class="absolute top-1 left-1 w-5 h-5 rounded-full bg-card dark:bg-muted-foreground shadow flex items-center justify-center transition-transform duration-200"
          :class="theme === 'dark' ? 'translate-x-7' : 'translate-x-0'"
        >
          <Sun v-if="theme === 'light'" class="w-3 h-3 text-warning" />
          <Moon v-else class="w-3 h-3 text-primary dark:text-background" />
        </span>
      </button>
    </div>

    <div class="flex items-center justify-between px-3 py-2">
      <span class="text-xs text-muted-foreground">{{ t('common.language') }}</span>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="flex items-center gap-1.5 border border-input rounded-[9px] px-2.5 py-1.5"
          >
            <span class="text-xs font-medium">{{ LOCALE_LABELS[locale as Locale] }}</span>
            <ChevronDown class="w-2.5 h-2.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="setLocale('tr')">Türkçe</DropdownMenuItem>
          <DropdownMenuItem @click="setLocale('en')">English</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div class="h-px bg-border my-2 mx-1"></div>

    <button
      type="button"
      class="w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-destructive text-sm font-medium hover:bg-destructive/5"
      @click="logout"
    >
      <LogOut class="w-3.5 h-3.5" />
      {{ t('common.logout') }}
    </button>
  </div>
</template>
