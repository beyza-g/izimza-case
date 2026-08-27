<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, ShieldCheck } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { profileSubnav } from '@/data/mockData'
import { useAccount } from '@/queries/useAccount'
import { formatDate } from '@/lib/formatDate'

const { t } = useI18n({ useScope: 'global' })
const accountQuery = useAccount()

const nesValidity = computed(() => {
  const account = accountQuery.data.value
  return account
    ? t('profile.badges.nesValidity', { date: formatDate(account.nesValidUntil) })
    : ''
})
</script>

<template>
  <aside
    class="hidden lg:flex lg:w-[240px] lg:flex-none lg:flex-col gap-4 bg-card text-foreground border-r border-border p-5"
  >
    <div>
      <p class="text-lg font-semibold tracking-tight">{{ t('profile.mobileHeading') }}</p>
      <p class="text-xs text-muted-foreground m-0">{{ t('profile.mobileSubheading') }}</p>
    </div>

    <nav class="flex flex-col gap-1">
      <span
        v-for="item in profileSubnav"
        :key="item.key"
        class="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[13px]"
        :class="[
          item.key === 'security'
            ? 'bg-panel-active text-panel-active-foreground font-semibold'
            : 'text-muted-foreground font-medium',
          item.disabled ? 'opacity-50' : '',
        ]"
      >
        {{ t(item.labelKey) }}
        <span
          v-if="item.key === 'security'"
          class="w-1.5 h-1.5 rounded-sm bg-current flex-none"
        ></span>
        <ChevronRight v-else class="w-3.5 h-3.5 flex-none" />
      </span>
    </nav>

    <div
      class="relative group mt-auto border border-border rounded-xl p-3.5 flex items-center gap-2.5 cursor-help bg-card"
    >
      <span
        class="w-8 h-8 flex-none rounded-full border-[1.5px] border-success text-success flex items-center justify-center"
      >
        <ShieldCheck class="w-3.5 h-3.5" />
      </span>
      <div>
        <p class="text-xs font-medium m-0">{{ t('profile.badges.nesVerified') }}</p>
        <p class="text-[10px] text-muted-foreground m-0">{{ nesValidity }}</p>
      </div>
      <span
        class="pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-max max-w-[220px] whitespace-normal rounded-lg bg-foreground text-background text-[11px] font-normal leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center"
      >
        {{ t('profile.badges.nesTooltip') }}
      </span>
    </div>
  </aside>
</template>
