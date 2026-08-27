<script setup lang="ts">
import { AlertTriangle, CheckCircle2, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'

const { t } = useI18n({ useScope: 'global' })
const { toasts, dismissToast } = useToast()

function retry(toast: (typeof toasts)[number]) {
  toast.retry?.()
  dismissToast(toast.id)
}
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="fixed z-[100] top-20 md:top-4 inset-x-4 md:inset-x-auto md:right-4 flex flex-col gap-2 items-stretch md:items-end"
  >
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="w-full md:w-auto md:max-w-sm bg-toast text-toast-foreground border border-border rounded-xl shadow-2xl p-4 flex items-start gap-3"
    >
      <component
        :is="toast.tone === 'error' ? AlertTriangle : CheckCircle2"
        class="w-5 h-5 flex-none mt-0.5"
        :class="toast.tone === 'error' ? 'text-destructive' : 'text-success'"
      />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium m-0">{{ toast.message }}</p>
        <button
          v-if="toast.retry"
          type="button"
          class="text-xs font-semibold text-primary mt-1.5"
          @click="retry(toast)"
        >
          {{ t('common.actions.retry') }}
        </button>
      </div>
      <button
        type="button"
        class="flex-none text-muted-foreground"
        @click="dismissToast(toast.id)"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
