<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'

defineProps<{
  label?: string
  value?: string
  unit?: string
  note?: string
  loading?: boolean
}>()
</script>

<template>
  <div
    class="bg-card border border-border rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_30px_-20px_rgba(0,0,0,0.22)] h-full flex flex-col"
  >
    <template v-if="loading">
      <div class="flex flex-col gap-3">
        <SkeletonBlock class="h-3 w-20" />
        <SkeletonBlock class="h-9 w-24" />
        <SkeletonBlock class="h-3 w-28" />
      </div>
    </template>
    <template v-else>
      <div class="flex-1 flex flex-col justify-between gap-3">
        <div class="flex flex-col gap-3">
          <span class="text-xs tracking-wide text-muted-foreground">{{ label }}</span>
          <div class="flex items-baseline gap-1.5">
            <span class="text-[38px] font-semibold tracking-tight leading-none">{{ value }}</span>
            <span v-if="unit" class="text-[13px] text-muted-foreground">{{ unit }}</span>
          </div>
        </div>
        <span v-if="note" class="text-xs text-muted-foreground">{{ note }}</span>
        <slot v-else />
      </div>
    </template>
  </div>
</template>
