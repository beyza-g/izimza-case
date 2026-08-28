<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    cancelLabel: string
    destructive?: boolean
    confirmDisabled?: boolean
    cancelDisabled?: boolean
  }>(),
  {
    destructive: false,
    confirmDisabled: false,
    cancelDisabled: false,
  },
)

// Deliberately thin: this only forwards open state and the two button
// clicks. It does NOT try to own or sequence what happens on confirm/cancel
// — AlertDialogAction/Cancel auto-close via reka-ui's own DialogClose as
// part of their own click handling, independent of whatever @confirm/@cancel
// does. Each caller keeps deciding for itself (a race-safe delete guard, a
// synchronous clear, a Promise-based leave-confirmation) — this component
// has no opinion on any of that, only on not repeating the same markup.
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
  cancel: []
}>()
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="cancelDisabled" @click="emit('cancel')">
          {{ cancelLabel }}
        </AlertDialogCancel>
        <AlertDialogAction
          :variant="destructive ? 'destructive' : 'default'"
          :disabled="confirmDisabled"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
