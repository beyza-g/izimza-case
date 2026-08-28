<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Download, Eye, Mail, MoreVertical, Trash2, UploadCloud } from 'lucide-vue-next'
import { useQueryClient } from '@tanstack/vue-query'
import StatCard from '@/components/ui/StatCard.vue'
import OperationTypeBadge from '@/components/ui/OperationTypeBadge.vue'
import SkeletonBlock from '@/components/ui/SkeletonBlock.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useAccount } from '@/queries/useAccount'
import { useDocuments } from '@/queries/useDocuments'
import { deleteDocument, sendMail, type Document } from '@/api/documents'
import { downloadTextFile } from '@/lib/download'
import { buildArchiveReceipt } from '@/lib/receipt'
import { computeArchiveStats } from '@/lib/archiveStats'
import { formatDate } from '@/lib/formatDate'
import { useToast } from '@/composables/useToast'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useDropzone, hasAcceptedExtension } from '@/composables/useDropzone'
import { pendingUploadFiles } from '@/composables/usePendingUpload'
import DocumentCertificatePanel from '@/components/dashboard/DocumentCertificatePanel.vue'

// Single source of truth for table grid widths (header, skeleton, rows) to prevent layout drift.
// Fixed 140px operation column prevents badge clipping during sidebar expansion at md→lg.
// Fixed action column (112px md+ / 40px mobile) avoids `auto` track alignment bugs and button overflow.
const DOC_TABLE_COLS = 'grid-cols-[1fr_auto_40px] md:grid-cols-[2.2fr_1fr_140px_112px]'

const { t } = useI18n({ useScope: 'global' })
const router = useRouter()
const fileInput = ref<HTMLInputElement | null>(null)
const accountQuery = useAccount()
const documentsQuery = useDocuments()
const queryClient = useQueryClient()
const { pushToast } = useToast()
const { firstName, email } = useCurrentUser()

// "Son arşivlenen belgeler" means exactly that — filtered to archived
// status, not every document regardless of state (the real portal.izimza.com
// has this exact inconsistency; deliberately not repeating it here).
const recentDocuments = computed(
  () => documentsQuery.data.value?.filter((doc) => doc.status === 'archived').slice(0, 4) ?? [],
)
const pendingCount = computed(
  () => documentsQuery.data.value?.filter((doc) => doc.status === 'pending').length ?? 0,
)

const renewalDate = computed(() => {
  const raw = accountQuery.data.value?.creditsRenewalDate
  return raw ? formatDate(raw) : ''
})

const archive = computed(() => {
  const acc = accountQuery.data.value
  return acc ? computeArchiveStats(acc) : null
})

function pickFile() {
  fileInput.value?.click()
}

// This card has no upload pipeline of its own — signing isn't implemented,
// only timestamping is — so an accepted file has nowhere to go on this page.
// Rather than a dead-end drop, it's handed off via pendingUploadFiles and the
// user is taken to Timestamp, whose own onMounted() consumes it through the
// exact same processFiles() its native dropzone uses.
function acceptFiles(files: File[]) {
  if (!files.length) return

  const accepted: File[] = []
  const rejectedNames: string[] = []
  for (const file of files) {
    if (hasAcceptedExtension(file.name)) accepted.push(file)
    else rejectedNames.push(file.name)
  }

  if (rejectedNames.length === 1) {
    pushToast(t('timestamp.toasts.unsupportedOne', { name: rejectedNames[0] }))
  } else if (rejectedNames.length > 1) {
    pushToast(t('timestamp.toasts.unsupportedMany', { count: rejectedNames.length }))
  }

  if (accepted.length) {
    pendingUploadFiles.value = accepted
    // Shown before the navigation itself so the redirect reads as an
    // explained outcome ("your file went to the Timestamp queue") rather
    // than an unexplained jump away from the page the user was just on.
    pushToast(t('dashboard.toasts.queuedForTimestamp'), { tone: 'success' })
    router.push({ name: 'timestamp' })
  }
}

function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  acceptFiles(files)
}

const { dragActive, onDragEnter, onDragLeave, onDrop } = useDropzone(acceptFiles)

function downloadDocument(doc: Document) {
  // A real, observable file — this mock backend never stored the original
  // bytes, so what's downloadable is a receipt of the archived state, not a
  // copy of the original document. Mirrors exactly what DocumentCertificatePanel
  // displays, so the panel's "Download" button and this never drift apart.
  downloadTextFile(`${doc.name}.arsiv.txt`, buildArchiveReceipt(doc))
  pushToast(t('dashboard.toasts.downloaded', { name: doc.name }), { tone: 'success' })
}

const certificateDoc = ref<Document | null>(null)

function openCertificate(doc: Document) {
  certificateDoc.value = doc
}

function closeCertificate() {
  certificateDoc.value = null
}

async function emailDocument(doc: Document) {
  try {
    await sendMail({ documentId: doc.id, recipients: [email.value] }, { skipErrorToast: true })
    pushToast(t('dashboard.toasts.emailed', { name: doc.name }), { tone: 'success' })
  } catch {
    pushToast(t('common.errors.generic'), { retry: () => emailDocument(doc) })
  }
}

const deleteTarget = ref<Document | null>(null)
const deleting = ref(false)
// Purely a visibility flag now — closing it (by any means: either button,
// Escape, backdrop) has no side effect on deleteTarget. AlertDialogAction is
// built on reka-ui's DialogClose, which closes the dialog itself as part of
// its own click handling, with no guaranteed order relative to our own
// @click on the same button — deleteTarget used to get nulled from that
// close signal (first directly from a v-model setter, later from a watcher
// on it), which meant its lifecycle was only ever as reliable as an
// assumption about reka-ui's internal timing. It's now cleared exclusively
// from performDelete()'s own completion below, decoupled from the dialog
// entirely: nothing about opening or closing it can affect the target.
const deleteDialogOpen = ref(false)

function requestDelete(doc: Document) {
  deleteTarget.value = doc
  deleteDialogOpen.value = true
}

async function performDelete(doc: Document) {
  if (deleting.value) return
  deleting.value = true
  try {
    await deleteDocument(doc.id, { skipErrorToast: true })
    queryClient.invalidateQueries({ queryKey: ['documents'] })
    pushToast(t('dashboard.toasts.deleted'), { tone: 'success' })
  } catch {
    // Retries this exact attempt directly — closes over `doc`, not
    // deleteTarget, so it still works even after deleteTarget below has
    // been cleared (or reassigned to a different document in the meantime).
    pushToast(t('dashboard.toasts.deleteFailed'), { retry: () => performDelete(doc) })
  } finally {
    deleting.value = false
    // Settled — success or failure, this is the one and only place
    // deleteTarget gets cleared. Guarded so a delete that's still in
    // flight for a since-replaced target can't clobber a *new* target the
    // user has already opened the dialog for again.
    if (deleteTarget.value === doc) deleteTarget.value = null
  }
}

function confirmDelete() {
  const doc = deleteTarget.value
  if (doc) performDelete(doc)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight m-0 mb-1.5">
        {{ t('dashboard.greeting', { name: firstName }) }}
      </h1>
      <p class="text-sm text-muted-foreground m-0">
        {{ t('dashboard.pendingSignatures', { count: pendingCount }) }}
      </p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <template v-if="accountQuery.isPending.value">
        <StatCard v-for="i in 4" :key="i" loading />
      </template>
      <template v-else-if="accountQuery.data.value">
        <StatCard
          :label="t('dashboard.stats.totalSignatures')"
          :value="String(accountQuery.data.value.totalSignatures)"
          :unit="t('dashboard.stats.unitDocument')"
          :note="
            t('dashboard.stats.noteThisMonth', {
              count: accountQuery.data.value.signaturesThisMonth,
            })
          "
        />
        <StatCard
          :label="t('dashboard.stats.archivedDocuments')"
          :value="String(accountQuery.data.value.archivedDocuments)"
          :unit="t('dashboard.stats.unitDocument')"
          :note="
            t('dashboard.stats.noteLast30Days', {
              count: accountQuery.data.value.archivedLast30Days,
            })
          "
        />
        <StatCard
          :label="t('dashboard.stats.remainingCredits')"
          :value="String(accountQuery.data.value.remainingCredits)"
          :unit="t('dashboard.stats.unitCount')"
          :note="t('dashboard.stats.noteRenewal', { date: renewalDate })"
        />
        <StatCard
          v-if="archive"
          :label="t('dashboard.stats.archiveSpace')"
          :value="archive.usedGb"
          :unit="`/ ${archive.limitGb} GB`"
        >
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-primary dark:bg-foreground"
              :style="{ width: `${archive.percent}%` }"
            ></div>
          </div>
        </StatCard>
      </template>
      <div v-else class="col-span-2 lg:col-span-4 text-sm text-destructive">
        {{ t('dashboard.accountLoadError') }}
      </div>
    </div>

    <div
      tabindex="0"
      :aria-label="t('common.uploadDropzoneLabel')"
      class="border-[1.5px] border-dashed rounded-2xl bg-card transition duration-200 cursor-pointer p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6"
      :class="
        dragActive
          ? 'border-primary bg-primary/8'
          : 'border-primary/30 hover:border-primary hover:bg-primary/4'
      "
      @click="pickFile"
      @keydown.enter.prevent="pickFile"
      @keydown.space.prevent="pickFile"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div class="flex items-center gap-5">
        <div
          class="w-[52px] h-[52px] flex-none rounded-2xl bg-secondary flex items-center justify-center"
        >
          <UploadCloud class="w-5 h-5 text-primary dark:text-foreground" />
        </div>
        <div>
          <p class="font-semibold text-base m-0 mb-1">{{ t('dashboard.upload.title') }}</p>
          <p class="text-[13px] text-muted-foreground m-0">
            {{ t('dashboard.upload.description') }}
          </p>
        </div>
      </div>
      <span
        aria-hidden="true"
        class="flex-none bg-accent text-accent-foreground rounded-[10px] px-5 py-3 text-sm font-semibold"
      >
        {{ t('common.actions.chooseFile') }}
      </span>
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png"
        @change="onFilesChosen"
      />
    </div>

    <div class="bg-card border border-border rounded-2xl overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-border">
        <span class="text-[15px] font-semibold">{{ t('dashboard.table.title') }}</span>
        <span class="text-[13px] font-medium text-primary dark:text-foreground cursor-pointer">{{
          t('dashboard.table.viewAll')
        }}</span>
      </div>

      <div
        :class="[
          'hidden md:grid gap-4 px-5 py-3 bg-muted font-mono text-[11px] tracking-wide uppercase text-muted-foreground',
          DOC_TABLE_COLS,
        ]"
      >
        <span>{{ t('dashboard.table.file') }}</span
        ><span>{{ t('dashboard.table.date') }}</span
        ><span>{{ t('dashboard.table.operationType') }}</span
        ><span class="sr-only">{{ t('dashboard.table.actions') }}</span>
      </div>

      <div class="max-h-[420px] overflow-y-auto scrollbar-thin">
        <template v-if="documentsQuery.isPending.value">
          <div
            v-for="i in 4"
            :key="i"
            :class="[
              'grid gap-4 items-center px-5 py-3.5 border-b border-border last:border-b-0',
              DOC_TABLE_COLS,
            ]"
          >
            <div class="flex items-center gap-3 min-w-0">
              <SkeletonBlock class="w-[30px] h-[30px] flex-none rounded-lg" />
              <SkeletonBlock class="h-4 w-40" />
            </div>
            <SkeletonBlock class="hidden md:block h-3 w-16" />
            <SkeletonBlock class="h-5 w-20 rounded-full" />
            <SkeletonBlock class="w-8 h-8 rounded-lg" />
          </div>
        </template>

        <div
          v-else-if="recentDocuments.length === 0"
          class="p-8 text-center text-sm text-muted-foreground"
        >
          {{ t('dashboard.table.empty') }}
        </div>

        <template v-else>
          <div
            v-for="doc in recentDocuments"
            :key="doc.id"
            :class="[
              'grid gap-4 items-center px-5 py-3.5 border-b border-border last:border-b-0',
              DOC_TABLE_COLS,
            ]"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="w-[30px] h-[30px] flex-none rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-mono text-[9px] font-medium"
                >{{ doc.ext }}</span
              >
              <span class="text-sm font-medium truncate" :title="doc.name">{{ doc.name }}</span>
            </div>
            <span class="hidden md:inline text-[13px] text-muted-foreground">{{ doc.date }}</span>
            <OperationTypeBadge :operation-type="doc.operationType" />

            <div class="flex items-center justify-end gap-1">
              <button
                type="button"
                class="hidden md:inline-flex w-8 h-8 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                :aria-label="t('dashboard.table.viewCertificate')"
                @click="openCertificate(doc)"
              >
                <Eye class="w-4 h-4" />
              </button>

              <button
                type="button"
                class="hidden md:inline-flex w-8 h-8 flex-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                @click="downloadDocument(doc)"
              >
                <Download class="w-4 h-4" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    class="w-8 h-8 flex-none rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
                    :aria-label="t('dashboard.table.actionsFor', { name: doc.name })"
                  >
                    <MoreVertical class="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem class="md:hidden" @click="openCertificate(doc)">
                    <Eye class="w-4 h-4" /> {{ t('dashboard.table.viewCertificate') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem class="md:hidden" @click="downloadDocument(doc)">
                    <Download class="w-4 h-4" /> {{ t('common.actions.download') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="emailDocument(doc)">
                    <Mail class="w-4 h-4" /> {{ t('dashboard.table.emailSend') }}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" @click="requestDelete(doc)">
                    <Trash2 class="w-4 h-4" /> {{ t('common.actions.delete') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </template>
      </div>
    </div>

    <ConfirmDialog
      v-model:open="deleteDialogOpen"
      :title="t('dashboard.deleteDialog.title')"
      :description="t('dashboard.deleteDialog.description', { name: deleteTarget?.name ?? '' })"
      :cancel-label="t('common.actions.discard')"
      :confirm-label="
        deleting ? t('dashboard.deleteDialog.deleting') : t('dashboard.deleteDialog.confirm')
      "
      destructive
      :confirm-disabled="deleting"
      :cancel-disabled="deleting"
      @confirm="confirmDelete"
    />

    <DocumentCertificatePanel
      :document="certificateDoc"
      @dismiss="closeCertificate"
      @download="certificateDoc && downloadDocument(certificateDoc)"
    />
  </div>
</template>
