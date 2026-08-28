<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Clock,
  Download,
  Mail,
  RotateCw,
  Search,
  Smartphone,
} from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { Recipient } from '@/data/mockData'
import { useRecipientSelection, type RecipientItem } from '@/composables/useRecipientSelection'
import { useOtpDigitInput } from '@/composables/useOtpDigitInput'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  step: 'otp' | 'result' | 'send' | 'sent'
  otpError: string
  otpComplete: boolean
  isOtpExpired: boolean
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
}>()

const otp = defineModel<string[]>('otp', { required: true })
const recipientSearch = defineModel<string>('recipientSearch', { default: '' })

const searchInputEl = ref<HTMLInputElement | null>(null)

const { otpRefs, onOtpInput, onOtpKeydown, focusFirst } = useOtpDigitInput(otp)

function focusSearch() {
  nextTick(() => searchInputEl.value?.focus())
}

defineExpose({ focusFirst, focusSearch })

// Selected items (self + registered recipients) pin to one checkmarked
// section at the top of the single scrollable surface — not chips — so
// there is exactly one scroll surface for the whole recipient list.
const { selectedItems, unselectedItems, recipientCount } = useRecipientSelection({
  recipients: () => props.recipients,
  selfSelected: () => props.selfSelected,
  email: () => props.email,
  selfLabel: () => t('timestamp.send.self'),
  search: recipientSearch,
})

function toggleItem(item: RecipientItem) {
  if (item.isSelf) emit('toggle-self')
  else emit('toggle-recipient', item.mail)
}

// Visual feedback must match the real outcome — a single "success" look
// can't stand in for "some failed" or "all failed" (CLAUDE.md: hata
// senaryosu prensipleri).
const outcome = computed<'success' | 'partial' | 'failure'>(() => {
  if (props.lastCompletedCount > 0 && props.errorCount === 0) return 'success'
  if (props.lastCompletedCount > 0 && props.errorCount > 0) return 'partial'
  return 'failure'
})

// Drives the OTP step's icon/card/box/status-row/button styling. Expiry
// takes priority over a wrong-code error, matching the same precedence the
// digit boxes' border already used.
const otpVisualState = computed<'neutral' | 'wrong' | 'expired'>(() => {
  if (props.isOtpExpired) return 'expired'
  if (props.otpError) return 'wrong'
  return 'neutral'
})

const otpCardCopy = computed(() => {
  switch (otpVisualState.value) {
    case 'wrong':
      return {
        icon: AlertCircle,
        iconClass: 'bg-destructive/12 text-destructive',
        title: t('timestamp.otp.wrongTitle'),
        description: t('timestamp.otp.wrongDescription'),
      }
    case 'expired':
      return {
        icon: RotateCw,
        iconClass: 'bg-warning/15 text-warning',
        title: t('timestamp.otp.expiredLabel'),
        description: t('timestamp.otp.expiredDescription'),
      }
    default:
      return {
        icon: Smartphone,
        iconClass: 'bg-primary/10 text-primary dark:text-foreground',
        title: t('timestamp.otp.heading'),
        description: t('timestamp.otp.description', { phone: props.phone }),
      }
  }
})

// The one primary CTA in the OTP step does double duty: it re-submits the
// entered digits normally, but once the code has expired it becomes the
// only way to request a new one (no separate "Tekrar gönder" link anymore —
// one CTA, not two competing affordances).
const primaryButtonState = computed(() => {
  if (props.submitting) {
    return { label: t('timestamp.otp.verifying'), disabled: true, action: 'verify' as const }
  }
  if (otpVisualState.value === 'expired') {
    return { label: t('timestamp.otp.sendNewCode'), disabled: false, action: 'resend-otp' as const }
  }
  return {
    label: otpVisualState.value === 'wrong' ? t('common.actions.retry') : t('timestamp.otp.verify'),
    disabled: !props.otpComplete,
    action: 'verify' as const,
  }
})

function triggerPrimaryAction() {
  if (primaryButtonState.value.action === 'resend-otp') emit('resend-otp')
  else emit('verify')
}
</script>

<template>
  <!-- OTP -->
  <template v-if="step === 'otp'">
    <div class="flex items-start gap-3">
      <span
        class="w-12 h-12 flex-none rounded-2xl flex items-center justify-center"
        :class="otpCardCopy.iconClass"
      >
        <component :is="otpCardCopy.icon" class="w-6 h-6" />
      </span>
      <div>
        <p class="text-[15px] font-semibold tracking-tight m-0 mb-1">
          {{ otpCardCopy.title }}
        </p>
        <p class="text-xs leading-relaxed text-muted-foreground m-0">
          {{ otpCardCopy.description }}
        </p>
      </div>
    </div>
    <div class="grid grid-cols-6 gap-2">
      <input
        v-for="(digit, i) in otp"
        :key="i"
        :ref="
          (el) => {
            if (el) otpRefs[i] = el as HTMLInputElement
          }
        "
        :value="digit"
        :aria-label="t('timestamp.otp.digitLabel', { n: i + 1 })"
        type="text"
        inputmode="numeric"
        maxlength="1"
        :disabled="isOtpExpired"
        class="h-[54px] border-[1.5px] rounded-[11px] text-center font-mono text-xl font-medium disabled:cursor-not-allowed"
        :class="{
          'border-destructive bg-destructive/8 text-destructive focus:ring-4 focus:ring-destructive/15':
            otpVisualState === 'wrong',
          'border-border bg-muted text-muted-foreground': otpVisualState === 'expired',
          'bg-card border-input focus:border-primary': otpVisualState === 'neutral',
        }"
        @input="onOtpInput(i, $event)"
        @keydown="onOtpKeydown(i, $event)"
      />
    </div>
    <div class="flex items-center gap-1.5 text-xs">
      <Clock class="w-3.5 h-3.5 flex-none text-muted-foreground" />
      <span class="font-mono text-muted-foreground">{{ t('timestamp.otp.validityLabel') }}</span>
      <span
        class="font-mono font-medium"
        :class="{
          'text-destructive': otpVisualState === 'wrong',
          'text-warning': otpVisualState === 'expired',
          'text-foreground': otpVisualState === 'neutral',
        }"
        >{{ otpVisualState === 'expired' ? t('timestamp.otp.expiredValue') : countdownLabel }}</span
      >
    </div>
    <button
      type="button"
      class="w-full rounded-[11px] py-3.5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed"
      :class="
        primaryButtonState.disabled
          ? 'bg-muted text-muted-foreground'
          : 'bg-accent text-accent-foreground'
      "
      :disabled="primaryButtonState.disabled"
      @click="triggerPrimaryAction"
    >
      {{ primaryButtonState.label }}
    </button>
    <span
      class="text-xs font-medium text-muted-foreground rounded-lg text-center py-1 cursor-pointer"
      @click="emit('cancel-otp')"
      >{{ t('common.actions.discard') }}</span
    >
  </template>

  <!-- Result / Sent -->
  <template v-else-if="step === 'result' || step === 'sent'">
    <div class="flex items-center justify-between">
      <span class="text-[15px] font-semibold">{{ t('timestamp.result.title') }}</span>
    </div>

    <!-- Full success -->
    <div
      v-if="outcome === 'success'"
      class="bg-success/8 border border-success/20 rounded-xl p-4 flex flex-col gap-3"
    >
      <div class="flex items-center gap-3">
        <span
          class="result-check w-[38px] h-[38px] flex-none rounded-full bg-success text-card flex items-center justify-center"
        >
          <Check class="w-4 h-4" />
        </span>
        <div>
          <p class="text-[15px] font-semibold tracking-tight m-0 mb-0.5">
            {{ t('timestamp.result.successTitle', { count: lastCompletedCount }) }}
          </p>
          <p class="text-xs text-muted-foreground m-0">
            {{ t('timestamp.result.creditsLeft', { count: remainingCredits }) }}
          </p>
        </div>
      </div>
      <div class="border-t border-success/20 pt-3 flex flex-col gap-1">
        <p class="font-mono text-[11px] text-muted-foreground m-0">25.08.2026 15:41:07 +03</p>
        <p class="font-mono text-[11px] text-muted-foreground m-0">SHA-256 · RFC 3161</p>
        <p v-if="archived" class="text-[11px] text-success font-medium m-0">
          {{ t('timestamp.result.archived') }}
        </p>
      </div>
    </div>

    <!-- Partial success: no single checkmark implying everything worked -->
    <div
      v-else-if="outcome === 'partial'"
      class="bg-warning/8 border border-warning/20 rounded-xl p-4 flex flex-col gap-3"
    >
      <div class="flex items-center gap-3">
        <span
          class="w-[38px] h-[38px] flex-none rounded-full bg-warning text-card flex items-center justify-center"
        >
          <AlertTriangle class="w-4 h-4" />
        </span>
        <div>
          <p class="text-[15px] font-semibold tracking-tight m-0 mb-0.5">
            {{
              t('timestamp.result.partialTitle', { done: lastCompletedCount, failed: errorCount })
            }}
          </p>
          <p class="text-xs text-muted-foreground m-0">
            {{ t('timestamp.result.creditsLeft', { count: remainingCredits }) }}
          </p>
        </div>
      </div>
      <div class="border-t border-warning/20 pt-3 flex flex-col gap-1">
        <p class="font-mono text-[11px] text-muted-foreground m-0">25.08.2026 15:41:07 +03</p>
        <p class="font-mono text-[11px] text-muted-foreground m-0">SHA-256 · RFC 3161</p>
        <p v-if="archived" class="text-[11px] text-success font-medium m-0">
          {{ t('timestamp.result.archived') }}
        </p>
      </div>
    </div>

    <!-- Total failure: no checkmark, no certificate details — nothing
         succeeded, so there is nothing to show a success card for. -->
    <div
      v-else
      class="bg-destructive/8 border border-destructive/20 rounded-xl p-4 flex items-center gap-3"
    >
      <span
        class="w-[38px] h-[38px] flex-none rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
      >
        <AlertTriangle class="w-4 h-4" />
      </span>
      <div>
        <p class="text-[15px] font-semibold tracking-tight m-0 mb-0.5">
          {{ t('timestamp.result.failureTitle') }}
        </p>
        <p class="text-xs text-muted-foreground m-0">
          {{ t('timestamp.result.errorCount', { count: errorCount }) }}
        </p>
      </div>
    </div>

    <template v-if="outcome !== 'failure'">
      <!-- Single retry surface: this is a bulk action only. Per-file retry
           lives exclusively on that file's own row in the queue
           (TimestampView.vue), never duplicated here. -->
      <div
        v-if="errorCount"
        class="bg-destructive/8 border border-destructive/20 rounded-xl p-3.5 flex items-center justify-between gap-3"
      >
        <p class="text-xs text-destructive m-0">
          {{ t('timestamp.result.errorCount', { count: errorCount }) }}
        </p>
        <button
          type="button"
          class="text-xs font-semibold text-primary dark:text-foreground"
          @click="emit('retry-all-errors')"
        >
          {{ t('timestamp.result.retryAll') }}
        </button>
      </div>

      <p v-if="step === 'sent'" class="text-[13px] text-success font-medium m-0">
        {{ t('timestamp.result.sentTo', { count: sentCount }) }}
      </p>

      <div class="flex flex-col gap-2.5">
        <button
          type="button"
          class="w-full bg-accent text-accent-foreground rounded-[11px] py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          @click="emit('download')"
        >
          <Download class="w-4 h-4" />
          {{
            outcome === 'partial'
              ? t('timestamp.result.downloadCount', { count: lastCompletedCount })
              : t('common.actions.download')
          }}
        </button>
        <button
          type="button"
          class="w-full border border-border rounded-[11px] py-3.5 text-sm font-medium flex items-center justify-center gap-2"
          @click="emit('open-send')"
        >
          <Mail class="w-4 h-4" /> {{ t('timestamp.send.title') }}
        </button>
      </div>
      <span
        class="text-xs font-medium text-primary dark:text-foreground text-center cursor-pointer"
        @click="emit('reset-flow')"
        >{{ t('timestamp.result.newDocument') }}</span
      >
    </template>

    <!-- Total failure: only a bulk retry and a full cancel — nothing to
         download or send yet, so those actions don't exist here at all. -->
    <div v-else class="flex flex-col gap-2.5">
      <button
        type="button"
        class="w-full bg-accent text-accent-foreground rounded-[11px] py-3.5 text-sm font-semibold"
        @click="emit('retry-all-errors')"
      >
        {{ t('common.actions.retry') }}
      </button>
      <button
        type="button"
        class="w-full border border-border rounded-[11px] py-3.5 text-sm font-medium"
        @click="emit('reset-flow')"
      >
        {{ t('common.actions.discard') }}
      </button>
    </div>
  </template>

  <!-- Send by email -->
  <template v-else-if="step === 'send'">
    <div class="flex items-center justify-between">
      <span class="text-[15px] font-semibold">{{ t('timestamp.send.title') }}</span>
    </div>

    <div class="relative">
      <Search class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        ref="searchInputEl"
        v-model="recipientSearch"
        type="text"
        :placeholder="t('timestamp.send.searchPlaceholder')"
        class="w-full border border-input rounded-[10px] pl-9 pr-3.5 py-2.5 text-[13px] focus:border-primary"
      />
    </div>

    <!-- Single scroll surface: selected items pin to the top as a checkmarked
         section, unselected/search-filtered items follow below. -->
    <div class="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto scrollbar-thin -mx-1 px-1">
      <template v-if="selectedItems.length">
        <button
          v-for="item in selectedItems"
          :key="item.key"
          type="button"
          class="flex items-center gap-2.5 rounded-[11px] p-3 border text-left transition-colors flex-none border-primary bg-primary/[0.04]"
          @click="toggleItem(item)"
        >
          <span
            class="w-[17px] h-[17px] flex-none rounded-[5px] border border-primary bg-primary text-primary-foreground flex items-center justify-center"
          >
            <Check class="w-2.5 h-2.5" />
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-medium m-0">{{ item.name }}</p>
            <p class="text-[11px] text-muted-foreground truncate m-0">{{ item.mail }}</p>
          </div>
        </button>
        <div class="border-b border-border my-0.5"></div>
      </template>

      <button
        v-for="item in unselectedItems"
        :key="item.key"
        type="button"
        class="flex items-center gap-2.5 rounded-[11px] p-3 border border-border bg-card text-left transition-colors flex-none"
        @click="toggleItem(item)"
      >
        <span class="w-[17px] h-[17px] flex-none rounded-[5px] border border-input"></span>
        <div class="flex-1 min-w-0">
          <p class="text-[13px] font-medium m-0">{{ item.name }}</p>
          <p class="text-[11px] text-muted-foreground truncate m-0">{{ item.mail }}</p>
        </div>
      </button>

      <p v-if="recipients.length === 0" class="text-xs text-muted-foreground text-center py-3 m-0">
        {{ t('timestamp.send.noRecipients') }}
        <RouterLink :to="{ name: 'profile' }" class="text-primary dark:text-foreground font-medium hover:underline">
          {{ t('timestamp.send.addFromSettings') }}
        </RouterLink>
      </p>
      <p
        v-else-if="unselectedItems.length === 0 && recipientSearch.trim()"
        class="text-xs text-muted-foreground text-center py-3 m-0"
      >
        {{ t('timestamp.send.noResults') }}
      </p>
    </div>

    <RouterLink
      v-if="recipients.length > 0"
      :to="{ name: 'profile' }"
      class="text-xs font-medium text-primary dark:text-foreground hover:underline"
    >
      {{ t('timestamp.send.addRecipient') }}
    </RouterLink>

    <button
      type="button"
      class="w-full bg-accent text-accent-foreground rounded-[11px] py-3.5 text-sm font-semibold disabled:opacity-60"
      :disabled="submitting || recipientCount === 0"
      @click="emit('send')"
    >
      {{
        submitting
          ? t('timestamp.send.submitting')
          : t('timestamp.send.submit', { count: recipientCount })
      }}
    </button>
    <span
      class="text-xs font-medium text-muted-foreground text-center cursor-pointer"
      @click="emit('back-from-send')"
      >{{ t('common.actions.back') }}</span
    >
  </template>
</template>

<style scoped>
.result-check {
  animation: result-check-pop 240ms ease-out;
}
@keyframes result-check-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
