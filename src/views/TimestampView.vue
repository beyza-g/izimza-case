<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave } from 'vue-router'
import { AlertTriangle, Plus, Timer, Trash2, UploadCloud, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import { otpLength, recipients as recipientSeed } from '@/data/mockData'
import db from '@mock-data/db.json'
import { simulateRequest, MockNetworkError } from '@/lib/mockApi'
import { downloadTextFile } from '@/lib/download'
import { maskPhone } from '@/lib/phone'
import {
  totalCost as computeTotalCost,
  insufficientBalance as computeInsufficientBalance,
  remainingAfter as computeRemainingAfter,
} from '@/lib/creditMath'
import { useToast } from '@/composables/useToast'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useAccount } from '@/queries/useAccount'
import { useProfile } from '@/queries/useProfile'
import { useTimestampQueueStore, type QueueFile } from '@/stores/timestampQueue'
import { useTimestampMutation } from '@/mutations/useTimestampMutation'
import { createDocument, deleteDocument, archiveDocument, type RawDocType } from '@/api/documents'
import TimestampCommitModal from '@/components/timestamp/TimestampCommitModal.vue'
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

function inferDocType(filename: string): RawDocType {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'docx' || ext === 'doc') return 'docx'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  if (ext === 'png') return 'png'
  return 'pdf'
}

// Stage 1 (file selection) stays inline and is driven by this same flow
// value — 'idle' vs anything else. Stage 2 (commit: OTP through send) is
// entirely owned by TimestampCommitModal, which is simply mounted whenever
// flow is one of the modal steps; there is no separate "panel step".
type Flow = 'idle' | 'summary' | 'otp' | 'otp-expired' | 'result' | 'send' | 'sent'

const { t } = useI18n({ useScope: 'global' })
const queryClient = useQueryClient()
const { pushToast } = useToast()
const accountQuery = useAccount()
const profileQuery = useProfile()
const maskedPhone = computed(() =>
  profileQuery.data.value ? maskPhone(profileQuery.data.value.phone) : '',
)
const { email: currentUserEmail } = useCurrentUser()
const timestampMutation = useTimestampMutation()

// Pre-commit files (selected but not yet OTP-verified) live only in this
// client-side store — nothing about them exists server-side until commitFile()
// actually creates the document at OTP-verification time. Kept in Pinia
// rather than a page-local ref so the "unsaved work" check below can be
// framed as ordinary client-only state, matching this project's own
// convention (Pinia for client-only state, TanStack Query for server state).
const queueStore = useTimestampQueueStore()
const { files: queue } = storeToRefs(queueStore)

const CREDIT_COST = 1
const remainingCredits = computed(() => accountQuery.data.value?.remainingCredits ?? 0)

const flow = ref<Flow>('idle')
const submitting = ref(false)
const archiveAfterCompletion = ref(true)
const lastArchived = ref(false)
const sentCount = ref(0)
// Live, not snapshotted — a manual "Tümünü tekrar dene" after a partial
// failure changes file statuses in place, and the result screen's outcome
// (success/partial/failure) needs to track that instead of going stale.
const completedCount = computed(() => queue.value.filter((f) => f.status === 'done').length)

const fileInput = ref<HTMLInputElement | null>(null)

const otp = ref<string[]>(Array(otpLength).fill(''))
const otpError = ref('')
const commitModalRef = ref<InstanceType<typeof TimestampCommitModal> | null>(null)
const countdown = ref(db.otp.expirySeconds)
let countdownTimer: number | null = null
let commitAbortController: AbortController | null = null

const recipients = ref(recipientSeed.map((r) => ({ ...r })))
const selfSelected = ref(false)
const recipientSearch = ref('')

const queuedFiles = computed(() => queue.value.filter((f) => f.status === 'queued'))
const errorFiles = computed(() => queue.value.filter((f) => f.status === 'error'))
const totalCost = computed(() => computeTotalCost(queuedFiles.value.length, CREDIT_COST))
const insufficientBalance = computed(() =>
  computeInsufficientBalance(queuedFiles.value.length, totalCost.value, remainingCredits.value),
)
const remainingAfter = computed(() =>
  computeRemainingAfter(remainingCredits.value, totalCost.value),
)
const otpComplete = computed(() => otp.value.every((digit) => digit !== ''))
const countdownLabel = computed(() => {
  const m = Math.floor(countdown.value / 60)
  const s = countdown.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// Stage 2: every step from OTP through send/sent lives in the commit modal.
// There is no separate "upload locked" flag any more — once one of these is
// true the modal's own backdrop is structurally what blocks the dropzone/
// queue underneath, not a disabled attribute this file has to maintain.
const isModalStep = computed(
  () =>
    flow.value === 'otp' ||
    flow.value === 'otp-expired' ||
    flow.value === 'result' ||
    flow.value === 'send' ||
    flow.value === 'sent',
)

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function pickFile() {
  fileInput.value?.click()
}

let nextLocalId = 1

// Purely local: picking a file no longer touches the server at all — nothing
// is created until commitFile() actually verifies the OTP and commits it, so
// there's no server-side "bekliyor" document for a merely-selected file to
// leave behind (the ghost-document bug this replaces).
function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const duplicateNames: string[] = []

  for (const file of files) {
    const size = formatBytes(file.size)
    if (queue.value.some((f) => f.name === file.name && f.size === size)) {
      duplicateNames.push(file.name)
      continue
    }

    queue.value.push({
      id: nextLocalId++,
      name: file.name,
      size,
      file,
      status: 'queued',
    })
    if (flow.value === 'idle' || flow.value === 'result' || flow.value === 'sent') {
      flow.value = 'summary'
    }
  }
  if (duplicateNames.length === 1) {
    pushToast(t('timestamp.toasts.duplicateOne', { name: duplicateNames[0] }))
  } else if (duplicateNames.length > 1) {
    pushToast(t('timestamp.toasts.duplicateMany', { count: duplicateNames.length }))
  }
}

function removeFile(id: number) {
  const file = queue.value.find((f) => f.id === id)
  if (file && file.status === 'queued') {
    queue.value = queue.value.filter((f) => f.id !== id)
    if (queuedFiles.value.length === 0 && flow.value === 'summary') resetFlow()
  }
}

// A file whose createDocument() succeeded but whose timestamp mutation then
// failed left a real, incomplete pending document server-side — since
// these callers are abandoning it (not retrying), delete it so the server
// never keeps a document with no corresponding local queue entry.
function cleanupOrphanedErrors(files: QueueFile[]) {
  files
    .filter((f) => f.status === 'error' && f.documentId !== undefined)
    .forEach((f) => {
      deleteDocument(f.documentId!, { skipErrorToast: true }).catch(() => {})
    })
}

const clearAllDialogOpen = ref(false)

// Reachable only while flow is 'summary'/'idle' (the modal owns every step
// from OTP onward), where every queue entry is guaranteed still 'queued' —
// i.e. purely local, nothing to delete server-side. Synchronous now that
// there's no network call to wait on.
function confirmClearAll() {
  queue.value = []
  resetFlow()
  pushToast(t('timestamp.toasts.cleared'), { tone: 'success' })
  clearAllDialogOpen.value = false
}

function startCountdown() {
  stopCountdown()
  countdown.value = db.otp.expirySeconds
  countdownTimer = window.setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopCountdown()
      flow.value = 'otp-expired'
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer !== null) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

onBeforeUnmount(() => {
  stopCountdown()
  commitAbortController?.abort()
})

async function requestOtp() {
  if (queuedFiles.value.length === 0 || insufficientBalance.value || submitting.value) return
  submitting.value = true
  try {
    await simulateRequest(true, { delay: 400 })
    queue.value.forEach((f) => {
      if (f.status === 'queued') f.status = 'processing'
    })
    otp.value = Array(otpLength).fill('')
    otpError.value = ''
    startCountdown()
    flow.value = 'otp'
    nextTick(() => commitModalRef.value?.focusFirst())
  } catch (error) {
    if (error instanceof MockNetworkError) pushToast(error.message, { retry: requestOtp })
  } finally {
    submitting.value = false
  }
}

function resendOtp() {
  otp.value = Array(otpLength).fill('')
  otpError.value = ''
  startCountdown()
  flow.value = 'otp'
  nextTick(() => commitModalRef.value?.focusFirst())
}

// The single reset/dismiss path shared by "Yeni belge damgala", "Vazgeç",
// a file card's ×, and the modal's own backdrop-click/Escape/close button —
// each just mutates the queue first (revert in-flight files, or remove one),
// then calls this to recompute the one true next state. If the commit
// already succeeded (files are done/error, none left "queued"), this
// naturally lands on 'idle' — closing the modal and clearing the batch. If
// it's still mid-OTP (files are "processing"), this naturally reverts them
// to "queued" and lands back on 'summary' — a cancel, not a data loss.
function resetFlow() {
  stopCountdown()
  queue.value.forEach((f) => {
    if (f.status === 'processing') f.status = 'queued'
  })
  cleanupOrphanedErrors(queue.value.filter((f) => f.status === 'error'))
  queue.value = queue.value.filter((f) => f.status === 'queued')
  otp.value = Array(otpLength).fill('')
  otpError.value = ''
  archiveAfterCompletion.value = true
  lastArchived.value = false
  sentCount.value = 0
  recipients.value.forEach((r) => (r.selected = false))
  selfSelected.value = false
  recipientSearch.value = ''
  flow.value = queue.value.length ? 'summary' : 'idle'
}

async function commitFile(file: QueueFile, signal?: AbortSignal) {
  file.status = 'processing'
  file.error = undefined
  try {
    // The server document is created here, at commit time — not when the
    // file was selected. A retry after a partial failure (create succeeded,
    // the mutation didn't) reuses the documentId already on the file instead
    // of creating a second document for the same retry.
    let documentId = file.documentId
    if (documentId === undefined) {
      const created = await createDocument(
        {
          name: file.name,
          type: inferDocType(file.name),
          sizeMb: Math.round((file.file.size / (1024 * 1024)) * 10) / 10 || 0.1,
          uploadedAt: new Date().toISOString(),
          status: 'pending',
        },
        { signal },
      )
      documentId = created.id
      file.documentId = documentId
    }
    await timestampMutation.mutateAsync({ documentId, creditCost: CREDIT_COST, signal })
    file.status = 'done'
  } catch {
    // A deliberate cancellation isn't a failure — leave the file mid-flight,
    // the component is unmounting anyway. Otherwise: the http interceptor's
    // error taxonomy already surfaced a toast, and the mutation's onError
    // already rolled the account/documents cache back.
    if (signal?.aborted) return
    file.status = 'error'
    file.error = t('timestamp.fileError')
  }
}

async function retryFile(id: number) {
  const file = queue.value.find((f) => f.id === id)
  if (!file) return
  await commitFile(file)
}

async function retryAllErrors() {
  // Sequential, not Promise.all/forEach: each file's mutation must fully
  // settle (onMutate → write → onSettled) before the next one's onMutate
  // reads the account cache, otherwise two in-flight retries can both read
  // the same pre-decrement balance and clobber each other's optimistic update.
  const files = [...errorFiles.value]
  for (const file of files) {
    await commitFile(file)
  }
}

async function verify() {
  if (!otpComplete.value || submitting.value) return

  if (otp.value.join('') !== db.otp.correctCode) {
    otpError.value = t('timestamp.otp.wrongCode')
    otp.value = Array(otpLength).fill('')
    nextTick(() => commitModalRef.value?.focusFirst())
    return
  }

  otpError.value = ''
  submitting.value = true
  stopCountdown()
  commitAbortController = new AbortController()
  const { signal } = commitAbortController
  try {
    const targets = queue.value.filter((f) => f.status === 'processing')
    let succeeded = 0
    for (const file of targets) {
      if (signal.aborted) break
      await commitFile(file, signal)
      if (file.status === 'done') succeeded++
    }

    // Archiving is a separate, independent write from the timestamp credit
    // deduction above — the checkbox never affects whether credits are spent.
    if (archiveAfterCompletion.value && succeeded > 0) {
      const doneIds = targets.filter((f) => f.status === 'done').map((f) => f.documentId!)
      await Promise.all(doneIds.map((id) => archiveDocument(id).catch(() => {})))
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      lastArchived.value = true
    } else {
      lastArchived.value = false
    }

    flow.value = 'result'
    if (errorFiles.value.length) {
      pushToast(t('timestamp.toasts.errorCount', { count: errorFiles.value.length }), {
        retry: retryAllErrors,
      })
    }
  } finally {
    submitting.value = false
  }
}

function openSend() {
  // Every open starts from a clean selection — otherwise closing and
  // reopening this panel (sent or not) leaves the previous pick checked.
  recipients.value.forEach((r) => (r.selected = false))
  selfSelected.value = false
  recipientSearch.value = ''
  flow.value = 'send'
  // Only worth stealing focus once there's enough of a list to search through.
  if (recipients.value.length >= 3) {
    nextTick(() => commitModalRef.value?.focusSearch())
  }
}

function downloadResults() {
  const doneFiles = queue.value.filter((f) => f.status === 'done')
  for (const file of doneFiles) {
    const content = [
      'İzİmza — Zaman Damgalama Sertifikası',
      '',
      `Belge: ${file.name}`,
      `Boyut: ${file.size}`,
      'Zaman: 25.08.2026 15:41:07 +03',
      'Özet algoritması: SHA-256',
      'Standart: RFC 3161',
      lastArchived.value ? 'Arşiv durumu: Arşivlendi' : 'Arşiv durumu: Arşivlenmedi',
      '',
    ].join('\n')
    downloadTextFile(`${file.name}.damga.txt`, content)
  }
}

function backFromSend() {
  flow.value = sentCount.value > 0 ? 'sent' : 'result'
}

function toggleRecipient(mail: string) {
  const recipient = recipients.value.find((r) => r.mail === mail)
  if (recipient) recipient.selected = !recipient.selected
}

function toggleSelf() {
  selfSelected.value = !selfSelected.value
}

const recipientCount = computed(
  () => recipients.value.filter((r) => r.selected).length + (selfSelected.value ? 1 : 0),
)

async function sendToRecipients() {
  if (submitting.value || recipientCount.value === 0) return
  submitting.value = true
  try {
    await simulateRequest(true, { delay: 400 })
    sentCount.value = recipientCount.value
    pushToast(t('timestamp.toasts.sent'), { tone: 'success' })
    // No auto-reset and no auto-navigation: the modal stays on 'sent' and the
    // user stays on this page until they explicitly start a new batch.
    flow.value = 'sent'
  } catch (error) {
    if (error instanceof MockNetworkError) pushToast(error.message, { retry: sendToRecipients })
  } finally {
    submitting.value = false
  }
}

const mobileBarAction = computed(() => {
  if (flow.value !== 'summary') return null
  return {
    label: submitting.value ? t('timestamp.panel.submitting') : t('timestamp.panel.submit'),
    disabled: submitting.value || queuedFiles.value.length === 0 || insufficientBalance.value,
    onClick: requestOtp,
  }
})

// Anything not yet 'done' represents work that only exists in this local
// store — leaving without committing genuinely loses it, unlike the old
// upload-on-select design where it was already safe server-side.
const hasUnsavedFiles = computed(() => queue.value.some((f) => f.status !== 'done'))

const leaveConfirmOpen = ref(false)
let resolveLeaveConfirm: ((value: boolean) => void) | null = null

// AlertDialogAction/AlertDialogCancel are built on reka-ui's DialogClose,
// which closes the dialog itself (emitting update:open(false)) as part of
// its own click handling, alongside whichever @click we attach — the two
// aren't guaranteed to run in a particular order. Rather than resolving
// the navigation promise directly from each button's @click (which could
// race that auto-close and have the wrong one win), each button only
// records its decision here; the single watcher below is the one place
// that actually resolves, firing exactly once whenever leaveConfirmOpen
// transitions to false for any reason — explicit click, Escape, or
// backdrop click (the last two leave pendingLeaveDecision unset, which
// defaults to "cancel", the safe choice for an unexplained dismissal).
const pendingLeaveDecision = ref<'confirm' | 'cancel' | null>(null)

onBeforeRouteLeave(() => {
  if (!hasUnsavedFiles.value) return true
  pendingLeaveDecision.value = null
  return new Promise<boolean>((resolve) => {
    resolveLeaveConfirm = resolve
    leaveConfirmOpen.value = true
  })
})

watch(leaveConfirmOpen, (open) => {
  if (open || !resolveLeaveConfirm) return
  const decision = pendingLeaveDecision.value ?? 'cancel'
  pendingLeaveDecision.value = null
  if (decision === 'confirm') {
    cleanupOrphanedErrors(queue.value)
    queue.value = []
    // Discards everything, unlike resetFlow()'s own (narrower) cleanup —
    // calling it afterward just lets its existing logic recompute the one
    // true next state (idle, since the queue is now empty) and reset the
    // OTP/countdown/recipient state, without duplicating that logic here.
    resetFlow()
  }
  resolveLeaveConfirm(decision === 'confirm')
  resolveLeaveConfirm = null
})

function confirmLeave() {
  pendingLeaveDecision.value = 'confirm'
}

function cancelLeave() {
  pendingLeaveDecision.value = 'cancel'
}

// beforeunload can't render a custom dialog (browsers force their own
// generic prompt regardless of returnValue text) — this only covers what
// onBeforeRouteLeave can't: an actual tab close or hard refresh.
function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (hasUnsavedFiles.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<template>
  <div class="flex flex-col gap-6 pb-24 md:pb-0">
    <div class="flex items-end justify-between gap-5">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight m-0 mb-1.5">{{ t('timestamp.title') }}</h1>
        <p class="text-sm text-muted-foreground m-0">
          {{ t('timestamp.subtitle') }}
        </p>
      </div>
    </div>

    <!-- STAGE 1: file selection — always inline, unaffected by stage 2. -->
    <div
      class="grid grid-cols-1 lg:grid-cols-[1fr_372px] gap-6"
      :class="flow === 'idle' ? 'items-stretch' : 'items-start'"
    >
      <!-- min-w-0: a bare 1fr grid track still respects its content's
           intrinsic minimum width by default — without this, a long
           nowrap filename below forces this track wider than 1fr and
           squeezes the right column instead of being clipped. -->
      <div class="min-w-0 flex flex-col gap-3.5">
        <div
          v-if="queue.length === 0"
          class="border-[1.5px] border-dashed border-primary/30 rounded-2xl bg-card flex flex-col items-center justify-center gap-4 text-center p-10 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_24px_-12px_rgba(0,0,0,0.25)] transition-shadow duration-150"
          @click="pickFile"
        >
          <UploadCloud class="w-9 h-9 text-primary" />
          <div>
            <p class="font-semibold text-lg m-0 mb-1.5">{{ t('timestamp.dropzone.title') }}</p>
            <p class="text-[13px] text-muted-foreground m-0 max-w-[38ch]">
              {{ t('timestamp.dropzone.description') }}
            </p>
          </div>
          <button
            type="button"
            class="bg-accent text-accent-foreground rounded-[10px] px-5 py-3 text-sm font-semibold"
          >
            {{ t('common.actions.chooseFile') }}
          </button>
        </div>

        <div v-else class="bg-card border border-border rounded-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-border">
            <span class="text-[15px] font-semibold">{{ t('timestamp.queue.title') }}</span>
            <span
              v-if="isModalStep"
              class="text-xs font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full"
            >
              {{ t('timestamp.queue.processing') }}
            </span>
            <div v-else class="flex items-center gap-3">
              <span class="text-xs text-muted-foreground">{{
                t('timestamp.documentsCount', { count: queue.length })
              }}</span>
              <button
                type="button"
                class="flex items-center gap-1 text-xs font-medium text-destructive"
                @click="clearAllDialogOpen = true"
              >
                <Trash2 class="w-3 h-3" /> {{ t('timestamp.queue.clearAll') }}
              </button>
            </div>
          </div>

          <div class="max-h-[420px] lg:max-h-[490px] overflow-y-auto scrollbar-thin">
            <div
              v-for="file in queue"
              :key="file.id"
              class="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-b-0"
            >
              <span
                class="w-10 h-10 flex-none rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-mono text-[10px] font-medium"
                >PDF</span
              >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium m-0 truncate" :title="file.name">{{ file.name }}</p>
                <p class="text-xs text-muted-foreground m-0">
                  {{ file.size }}
                  <span v-if="file.status === 'error'" class="text-destructive">{{
                    t('timestamp.queue.failedSuffix')
                  }}</span>
                </p>
              </div>

              <!-- Single retry surface: this file's own row is the only place
                   its retry action lives (the modal's error banner is a bulk
                   "Tümünü tekrar dene" action, never a per-file duplicate). -->
              <span
                class="text-xs font-medium px-2.5 py-1 rounded-full flex-none"
                :class="{
                  'bg-muted text-muted-foreground': file.status === 'queued',
                  'bg-warning/15 text-warning': file.status === 'processing',
                  'bg-success/10 text-success': file.status === 'done',
                  'bg-destructive/10 text-destructive': file.status === 'error',
                }"
              >
                {{ t(`timestamp.queue.status.${file.status}`) }}
              </span>

              <button
                v-if="file.status === 'error'"
                type="button"
                class="text-xs font-semibold text-primary flex-none"
                @click="retryFile(file.id)"
              >
                {{ t('common.actions.retry') }}
              </button>
              <button
                v-else-if="file.status === 'queued'"
                type="button"
                class="w-7 h-7 flex-none rounded-lg border border-border text-muted-foreground flex items-center justify-center"
                @click="removeFile(file.id)"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            class="flex items-center gap-2.5 px-5 py-4 text-sm font-medium w-full text-left text-primary"
            @click="pickFile"
          >
            <Plus class="w-4 h-4" /> {{ t('timestamp.queue.addMore') }}
          </button>
        </div>

        <input
          ref="fileInput"
          type="file"
          multiple
          class="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png"
          @change="onFilesChosen"
        />
      </div>

      <!-- Summary/idle panel — still inline. Everything from OTP onward
           (otp/otp-expired/result/send/sent) lives in TimestampCommitModal
           instead, mounted once below regardless of breakpoint. -->
      <div
        class="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 shadow-[0_20px_40px_-26px_rgba(0,0,0,0.3)]"
      >
        <template v-if="flow === 'idle'">
          <div class="flex items-center justify-between">
            <span class="text-[15px] font-semibold">{{ t('timestamp.panel.title') }}</span>
            <span class="font-mono text-[10px] tracking-wide uppercase text-muted-foreground">{{
              t('timestamp.panel.idleBadge')
            }}</span>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center gap-3.5 text-center py-6">
            <Timer class="w-6 h-6 text-muted-foreground" />
            <p class="text-[13px] leading-relaxed text-muted-foreground max-w-[26ch] m-0">
              {{ t('timestamp.panel.idleDescription') }}
            </p>
          </div>
          <div class="border-t border-border pt-3.5 flex items-center justify-between">
            <span class="text-xs text-muted-foreground">{{ t('timestamp.panel.balance') }}</span>
            <span class="text-[13px] font-semibold">{{
              t('timestamp.panel.credits', { count: remainingCredits })
            }}</span>
          </div>
        </template>

        <!-- Once the modal owns the operation, this panel stops rendering its
             own "N kontör düşülecek" preview — that math is keyed off queued
             files, which the modal's own opening already emptied out, so it
             would show a stale/meaningless "0 kontör" next to the real,
             live balance. Show only the one live number everywhere agree on. -->
        <template v-else-if="isModalStep">
          <div class="flex items-center justify-between">
            <span class="text-[15px] font-semibold">{{ t('timestamp.panel.title') }}</span>
            <span class="font-mono text-[10px] tracking-wide uppercase text-warning">{{
              t('timestamp.panel.processingBadge')
            }}</span>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center gap-3.5 text-center py-6">
            <Timer class="w-6 h-6 text-muted-foreground" />
            <p class="text-[13px] leading-relaxed text-muted-foreground max-w-[26ch] m-0">
              {{ t('timestamp.panel.processingDescription') }}
            </p>
          </div>
          <div class="border-t border-border pt-3.5 flex items-center justify-between">
            <span class="text-xs text-muted-foreground">{{ t('timestamp.panel.balance') }}</span>
            <span class="text-[13px] font-semibold">{{
              t('timestamp.panel.credits', { count: remainingCredits })
            }}</span>
          </div>
        </template>

        <template v-else>
          <div class="flex items-center justify-between">
            <span class="text-[15px] font-semibold">{{ t('timestamp.panel.summary') }}</span>
            <span class="font-mono text-[10px] tracking-wide uppercase text-muted-foreground">{{
              t('timestamp.documentsCount', { count: queuedFiles.length })
            }}</span>
          </div>

          <div
            v-if="insufficientBalance"
            class="bg-destructive/8 border border-destructive/20 rounded-xl p-4 flex flex-col gap-2"
          >
            <div class="flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-destructive flex-none" />
              <p class="text-[13px] font-semibold text-destructive m-0">
                {{ t('timestamp.panel.insufficientTitle') }}
              </p>
            </div>
            <p class="text-xs text-muted-foreground m-0">
              {{
                t('timestamp.panel.insufficientDescription', {
                  queued: queuedFiles.length,
                  cost: totalCost,
                  remaining: remainingCredits,
                })
              }}
            </p>
            <RouterLink
              :to="{ name: 'profile' }"
              class="text-xs font-semibold text-primary self-start hover:underline"
            >
              {{ t('timestamp.panel.upgrade') }}
            </RouterLink>
          </div>

          <div v-else class="bg-muted rounded-xl p-4 flex flex-col gap-3">
            <p class="text-[13px] leading-relaxed m-0">
              {{ t('timestamp.panel.deductNotice', { cost: totalCost }) }}
            </p>
            <div class="grid grid-cols-[1fr_auto_1fr] gap-2.5 items-center text-center">
              <div>
                <p
                  class="font-mono text-[10px] tracking-wide uppercase text-muted-foreground m-0 mb-0.5"
                >
                  {{ t('timestamp.panel.current') }}
                </p>
                <p class="text-2xl font-semibold tracking-tight m-0">{{ remainingCredits }}</p>
              </div>
              <span class="text-sm font-medium text-destructive">−{{ totalCost }}</span>
              <div>
                <p
                  class="font-mono text-[10px] tracking-wide uppercase text-muted-foreground m-0 mb-0.5"
                >
                  {{ t('timestamp.panel.remaining') }}
                </p>
                <p class="text-2xl font-semibold tracking-tight text-primary m-0">
                  {{ remainingAfter }}
                </p>
              </div>
            </div>
          </div>

          <label class="flex items-center gap-2.5 text-[13px] cursor-pointer select-none">
            <input
              v-model="archiveAfterCompletion"
              type="checkbox"
              class="w-4 h-4 rounded border-input accent-accent"
            />
            {{ t('timestamp.panel.archiveCheckbox') }}
          </label>

          <button
            type="button"
            class="hidden md:block w-full rounded-[11px] py-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed"
            :class="
              queuedFiles.length && !insufficientBalance
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground'
            "
            :disabled="submitting || queuedFiles.length === 0 || insufficientBalance"
            @click="requestOtp"
          >
            {{ submitting ? t('timestamp.panel.submitting') : t('timestamp.panel.submit') }}
          </button>
          <p class="hidden md:block text-xs leading-relaxed text-muted-foreground text-center m-0">
            {{ t('timestamp.panel.helperText') }}
          </p>
        </template>
      </div>
    </div>

    <!-- Mobile: slim sticky action bar — never covers the queue/add-file area -->
    <div
      v-if="mobileBarAction"
      class="md:hidden fixed inset-x-0 bottom-20 z-20 bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-3"
    >
      <div class="min-w-0">
        <p class="text-xs text-muted-foreground m-0 truncate">
          {{
            t('timestamp.mobileBar.summary', {
              count: queuedFiles.length,
              rest: insufficientBalance
                ? t('timestamp.mobileBar.insufficient')
                : t('timestamp.panel.credits', { count: totalCost }),
            })
          }}
        </p>
      </div>
      <button
        type="button"
        class="flex-none rounded-[10px] px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        :class="
          mobileBarAction.disabled
            ? 'bg-muted text-muted-foreground'
            : 'bg-accent text-accent-foreground'
        "
        :disabled="mobileBarAction.disabled"
        @click="mobileBarAction.onClick"
      >
        {{ mobileBarAction.label }}
      </button>
    </div>

    <!-- STAGE 2: OTP → archiving → result → recipient selection. One
         component, mounted at all breakpoints; it decides bottom-sheet vs
         centered dialog internally. Its backdrop is what structurally keeps
         stage 1 non-interactive while this is open — no separate lock flag. -->
    <TimestampCommitModal
      ref="commitModalRef"
      :open="isModalStep"
      v-model:otp="otp"
      v-model:recipient-search="recipientSearch"
      :step="flow as 'otp' | 'otp-expired' | 'result' | 'send' | 'sent'"
      :otp-error="otpError"
      :otp-complete="otpComplete"
      :submitting="submitting"
      :countdown="countdown"
      :countdown-label="countdownLabel"
      :processing-count="queue.filter((f) => f.status === 'processing').length"
      :last-completed-count="completedCount"
      :remaining-credits="remainingCredits"
      :error-count="errorFiles.length"
      :archived="lastArchived"
      :sent-count="sentCount"
      :recipients="recipients"
      :self-selected="selfSelected"
      :phone="maskedPhone"
      :email="currentUserEmail"
      @verify="verify"
      @resend-otp="resendOtp"
      @cancel-otp="resetFlow"
      @retry-all-errors="retryAllErrors"
      @open-send="openSend"
      @reset-flow="resetFlow"
      @toggle-recipient="toggleRecipient"
      @toggle-self="toggleSelf"
      @send="sendToRecipients"
      @back-from-send="backFromSend"
      @download="downloadResults"
      @dismiss="resetFlow"
    />

    <AlertDialog v-model:open="clearAllDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('timestamp.clearDialog.title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('timestamp.clearDialog.description', { count: queue.length }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{{ t('common.actions.discard') }}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="confirmClearAll">
            {{ t('timestamp.clearDialog.confirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- v-model:open syncs leaveConfirmOpen to false however the dialog
         closes (button click, Escape, backdrop) — the watch() on it is the
         single place that actually resolves the pending navigation promise,
         so it always resolves exactly once regardless of which of those
         triggered the close. -->
    <AlertDialog v-model:open="leaveConfirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('timestamp.leaveDialog.title') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('timestamp.leaveDialog.description') }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="cancelLeave">{{
            t('timestamp.leaveDialog.stay')
          }}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="confirmLeave">
            {{ t('timestamp.leaveDialog.leave') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
