<script setup lang="ts">
import type { AlertDialogActionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { AlertDialogAction } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<
    AlertDialogActionProps & {
      class?: HTMLAttributes['class']
      variant?: 'default' | 'destructive'
    }
  >(),
  {
    variant: 'default',
  },
)

const delegatedProps = reactiveOmit(props, 'class', 'variant')
</script>

<template>
  <AlertDialogAction
    data-slot="alert-dialog-action"
    v-bind="delegatedProps"
    :class="
      cn(
        'flex-1 rounded-[11px] px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
        variant === 'destructive'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-accent text-accent-foreground',
        props.class,
      )
    "
  >
    <slot />
  </AlertDialogAction>
</template>
