<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { OperationType } from '@/data/mockData'
import { operationTypeLabels, operationTypeClasses } from '@/data/mockData'

defineProps<{ operationType: OperationType }>()
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <span
    class="inline-flex items-center w-fit gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    :class="operationTypeClasses[operationType]"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
    {{ t(operationTypeLabels[operationType]) }}
  </span>
</template>
