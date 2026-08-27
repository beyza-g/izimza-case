<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { AlertCircle, AlertTriangle, Check, Download, Mail, Search } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { Recipient } from '@/data/mockData'

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

const otpRefs = ref<HTMLInputElement[]>([])
const searchInputEl = ref<HTMLInputElement | null>(null)

function onOtpInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '').slice(-1)
  otp.value[index] = value
  if (value && index < otp.value.length - 1) {
    otpRefs.value[index + 1]?.focus()
  }
}

function onOtpKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !otp.value[index] && index > 0) {
    otpRefs.value[index - 1]?.focus()
  }
}

function focusFirst() {
  nextTick(() => otpRefs.value[0]?.focus())
}

function focusSearch() {
  nextTick(() => searchInputEl.value?.focus())
}

defineExpose({ focusFirst, focusSearch })

// Selected items (self + registered recipients) pin to one checkmarked
// section at the top of the single scrollable surface — not chips — so
// there is exactly one scroll surface for the whole recipient list.
interface RecipientItem {
  key: string
  name: string
  mail: string
  isSelf: boolean
}

const selfItem = computed<RecipientItem>(() => ({
  key: '__self__',
  name: t('timestamp.send.self'),
  mail: props.email,
  isSelf: true,
}))

const selectedItems = computed<RecipientItem[]>(() => {
  const items: RecipientItem[] = []
  if (props.selfSelected) items.push(selfItem.value)
  items.push(
    ...props.recipients
      .filter((r) => r.selected)
      .map((r) => ({ key: r.mail, name: r.name, mail: r.mail, isSelf: false })),
  )
  return items
})

const unselectedItems = computed<RecipientItem[]>(() => {
  const items: RecipientItem[] = []
  if (!props.selfSelected) items.push(selfItem.value)
  items.push(
    ...props.recipients
      .filter((r) => !r.selected)
      .map((r) => ({ key: r.mail, name: r.name, mail: r.mail, isSelf: false })),
  )
  const q = recipientSearch.value.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (it) => it.name.toLowerCase().includes(q) || it.mail.toLowerCase().includes(q),
  )
})

const recipientCount = computed(
  () => props.recipients.filter((r) => r.selected).length + (props.selfSelected ? 1 : 0),
)

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
</script>

<template>
  <!-- OTP -->
  <template v-if="step === 'otp'">
    <div class="flex items-center justify-between">
      <span class="text-[15px] font-semibold">{{ t('timestamp.otp.title') }}</span>
      <span class="font-mono text-[10px] tracking-wide uppercase text-muted-foreground pr-8">{{
        t('timestamp.documentsCount', { count: processingCount })
      }}</span>
    </div>
    <div>
      <p class="text-[15px] font-semibold tracking-tight m-0 mb-1.5">
        {{ t('timestamp.otp.heading') }}
      </p>
      <p class="text-xs leading-relaxed text-muted-foreground m-0">
        {{ t('timestamp.otp.description', { phone }) }}
      </p>
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
        class="h-[54px] border-[1.5px] rounded-[11px] bg-card text-center font-mono text-xl font-medium"
        :class="otpError ? 'border-destructive' : 'border-input focus:border-primary'"
        @input="onOtpInput(i, $event)"
        @keydown="onOtpKeydown(i, $event)"
      />
    </div>
    <!-- The expired status label below is the single source of truth for
         "this code is expired" — a failed submit while expired still turns
         the digit boxes' border red (via otpError, unchanged), but doesn't
         also render a second, redundant text message saying the same thing
         a different way. otpError's text only ever shows for the *other*
         failure mode: a wrong-but-not-expired code. -->
    <p v-if="otpError && !isOtpExpired" class="text-xs text-destructive m-0 -mt-2">
      {{ otpError }}
    </p>
    <div class="flex items-center justify-between">
      <span
        class="font-mono text-xs flex items-center gap-1.5"
        :class="isOtpExpired ? 'text-destructive font-medium' : 'text-muted-foreground'"
      >
        <AlertCircle v-if="isOtpExpired" class="w-3.5 h-3.5 flex-none" />
        {{
          isOtpExpired
            ? t('timestamp.otp.expiredLabel')
            : t('timestamp.otp.remainingTime', { time: countdownLabel })
        }}
      </span>
      <!-- Same position regardless of state — expiry doesn't move this
           control anywhere, it just switches it from an inert label to a
           genuinely clickable, visually emphasized affordance. Warning-toned,
           not the main-CTA accent color: resending isn't the positive/primary
           action here, it's a recovery step after a lapsed code. -->
      <button
        type="button"
        class="text-xs font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
        :class="
          isOtpExpired
            ? 'text-warning bg-[color-mix(in_oklch,var(--warning)_15%,transparent)] px-3 py-1.5 hover:bg-[color-mix(in_oklch,var(--warning)_22%,transparent)]'
            : 'text-muted-foreground px-1 py-1.5'
        "
        :disabled="!isOtpExpired"
        @click="emit('resend-otp')"
      >
        {{ t('timestamp.otp.resend') }}
      </button>
    </div>
    <button
      type="button"
      class="w-full rounded-[11px] py-3.5 text-[15px] font-semibold transition-colors"
      :class="otpComplete ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'"
      :disabled="!otpComplete || submitting"
      @click="emit('verify')"
    >
      {{ submitting ? t('timestamp.otp.verifying') : t('timestamp.otp.verify') }}
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
          class="text-xs font-semibold text-primary"
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
        class="text-xs font-medium text-primary text-center cursor-pointer"
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
        <RouterLink :to="{ name: 'profile' }" class="text-primary font-medium hover:underline">
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
      class="text-xs font-medium text-primary hover:underline"
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
