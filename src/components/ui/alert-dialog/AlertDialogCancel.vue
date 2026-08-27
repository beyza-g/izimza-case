<script setup lang="ts">
import type { AlertDialogCancelProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { AlertDialogCancel } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<AlertDialogCancelProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <AlertDialogCancel
    data-slot="alert-dialog-cancel"
    v-bind="delegatedProps"
    :class="
      cn(
        'flex-1 rounded-[11px] border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors',
        props.class,
      )
    "
  >
    <slot />
  </AlertDialogCancel>
</template>
