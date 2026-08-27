<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { DialogTitle, VisuallyHidden } from 'reka-ui'
import { X } from 'lucide-vue-next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import CommitModalContent from './CommitModalContent.vue'
import type { Recipient } from '@/data/mockData'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  open: boolean
  step: 'otp' | 'otp-expired' | 'result' | 'send' | 'sent'
  otpError: string
  otpComplete: boolean
  submitting: boolean
  countdown: number
  countdownLabel: string
  processingCount: number
  lastCompletedCount: number
  remainingCredits: number
  errorCount: number
  archived: boolean
  sentCount: number
  recipients: Recipient[]
  selfSelected: boolean
  phone: string
  email: string
}>()

const emit = defineEmits<{
  verify: []
  'resend-otp': []
  'cancel-otp': []
  'retry-all-errors': []
  'open-send': []
  'reset-flow': []
  'toggle-recipient': [mail: string]
  'toggle-self': []
  send: []
  'back-from-send': []
  download: []
  dismiss: []
}>()

const otp = defineModel<string[]>('otp', { required: true })
const recipientSearch = defineModel<string>('recipientSearch', { default: '' })

const contentRef = ref<InstanceType<typeof CommitModalContent> | null>(null)

function focusFirst() {
  contentRef.value?.focusFirst()
}
function focusSearch() {
  contentRef.value?.focusSearch()
}
defineExpose({ focusFirst, focusSearch })

// Only true mobile keeps the bottom sheet — tablet joins desktop with the
// centered dialog now (same primitive, same content, container only).
const isSheet = useMediaQuery('(max-width: 767px)')

const dialogTitle = computed(() => {
  switch (props.step) {
    case 'otp':
    case 'otp-expired':
      return t('timestamp.otp.title')
    case 'result':
    case 'sent':
      return t('timestamp.result.title')
    case 'send':
      return t('timestamp.send.title')
    default:
      return t('timestamp.title')
  }
})

function onDialogOpenChange(value: boolean) {
  if (!value) emit('dismiss')
}
</script>

<template>
  <!-- Mobile: bottom sheet, Teleport + backdrop -->
  <Teleport v-if="isSheet" to="body">
    <div v-if="open" class="fixed inset-0 z-40">
      <div class="absolute inset-0 bg-black/50" @click="emit('dismiss')"></div>
      <div
        role="dialog"
        aria-modal="true"
        class="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-6 flex flex-col gap-4 shadow-2xl"
        @keydown.esc="emit('dismiss')"
      >
        <div class="flex justify-end">
          <button
            type="button"
            class="w-8 h-8 -mt-2 -mr-2 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
            :aria-label="t('common.actions.close')"
            @click="emit('dismiss')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <CommitModalContent
          ref="contentRef"
          v-model:otp="otp"
          v-model:recipient-search="recipientSearch"
          :step="step"
          :otp-error="otpError"
          :otp-complete="otpComplete"
          :submitting="submitting"
          :countdown="countdown"
          :countdown-label="countdownLabel"
          :processing-count="processingCount"
          :last-completed-count="lastCompletedCount"
          :remaining-credits="remainingCredits"
          :error-count="errorCount"
          :archived="archived"
          :sent-count="sentCount"
          :recipients="recipients"
          :self-selected="selfSelected"
          :phone="phone"
          :email="email"
          @verify="emit('verify')"
          @resend-otp="emit('resend-otp')"
          @cancel-otp="emit('cancel-otp')"
          @retry-all-errors="emit('retry-all-errors')"
          @open-send="emit('open-send')"
          @reset-flow="emit('reset-flow')"
          @toggle-recipient="emit('toggle-recipient', $event)"
          @toggle-self="emit('toggle-self')"
          @send="emit('send')"
          @back-from-send="emit('back-from-send')"
          @download="emit('download')"
        />
      </div>
    </div>
  </Teleport>

  <!-- Tablet/desktop: centered dialog, same primitive already used for
       destructive confirmations (AlertDialog) elsewhere in this app. -->
  <Dialog v-else :open="open" @update:open="onDialogOpenChange">
    <DialogContent class="max-w-[440px] flex flex-col gap-4">
      <DialogTitle as-child>
        <VisuallyHidden>{{ dialogTitle }}</VisuallyHidden>
      </DialogTitle>
      <button
        type="button"
        class="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
        :aria-label="t('common.actions.close')"
        @click="emit('dismiss')"
      >
        <X class="w-4 h-4" />
      </button>
      <CommitModalContent
        ref="contentRef"
        v-model:otp="otp"
        v-model:recipient-search="recipientSearch"
        :step="step"
        :otp-error="otpError"
        :otp-complete="otpComplete"
        :submitting="submitting"
        :countdown="countdown"
        :countdown-label="countdownLabel"
        :processing-count="processingCount"
        :last-completed-count="lastCompletedCount"
        :remaining-credits="remainingCredits"
        :error-count="errorCount"
        :archived="archived"
        :sent-count="sentCount"
        :recipients="recipients"
        :self-selected="selfSelected"
        :phone="phone"
        :email="email"
        @verify="emit('verify')"
        @resend-otp="emit('resend-otp')"
        @cancel-otp="emit('cancel-otp')"
        @retry-all-errors="emit('retry-all-errors')"
        @open-send="emit('open-send')"
        @reset-flow="emit('reset-flow')"
        @toggle-recipient="emit('toggle-recipient', $event)"
        @toggle-self="emit('toggle-self')"
        @send="emit('send')"
        @back-from-send="emit('back-from-send')"
        @download="emit('download')"
      />
    </DialogContent>
  </Dialog>
</template>
