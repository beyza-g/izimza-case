<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DocStatus } from '@/data/mockData'
import { statusLabels, statusClasses } from '@/data/mockData'

defineProps<{ status: DocStatus }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <span
    class="inline-flex items-center w-fit gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="statusClasses[status]"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
    {{ t(statusLabels[status]) }}
  </span>
</template>
