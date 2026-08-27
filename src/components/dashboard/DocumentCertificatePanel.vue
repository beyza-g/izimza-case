<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Info, Download } from 'lucide-vue-next'
import BaseSideSheet from '@/components/ui/BaseSideSheet.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { Document } from '@/api/documents'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  document: Document | null
}>()

const emit = defineEmits<{
  dismiss: []
  download: []
}>()

// The mock backend only ever stores one date per document (see
// mapDocument() in api/documents.ts) — labeled by what that date actually
// means for this document's current status, not a second field that
// doesn't exist.
const dateLabel = computed(() =>
  props.document?.status === 'archived'
    ? t('dashboard.certificate.archiveDate')
    : t('dashboard.certificate.uploadDate'),
)
</script>

<template>
  <BaseSideSheet
    :open="!!document"
    :label="t('dashboard.certificate.title', { name: document?.name ?? '' })"
    @dismiss="emit('dismiss')"
  >
    <template #header>
      <p class="text-[15px] font-semibold truncate m-0">
        {{ t('dashboard.certificate.title', { name: document?.name ?? '' }) }}
      </p>
    </template>

    <div class="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
      <!-- Persistent, in-UI honesty note — not something tucked away in the
           README. Always visible, not a hover-only tooltip. -->
      <div
        class="mx-6 mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground bg-muted rounded-lg p-2.5"
      >
        <Info class="w-3.5 h-3.5 flex-none mt-0.5" />
        <p class="m-0">{{ t('dashboard.certificate.disclaimer') }}</p>
      </div>

      <template v-if="document">
        <!-- Official-document header block: centered, name + status
             prominent, the way an actual certificate leads with what it's
             certifying before any supporting detail. -->
        <div
          class="px-6 pt-7 pb-6 border-b border-border flex flex-col items-center text-center gap-3"
        >
          <div
            class="w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center font-mono text-sm font-semibold"
          >
            {{ document.ext }}
          </div>
          <p class="text-lg font-semibold tracking-tight m-0 break-words max-w-[40ch]">
            {{ document.name }}
          </p>
          <div class="scale-110">
            <StatusBadge :status="document.status" />
          </div>
        </div>

        <div class="px-6 py-6 flex flex-col gap-6">
          <div>
            <p
              class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground m-0 mb-3"
            >
              {{ t('dashboard.certificate.documentInfoSection') }}
            </p>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-4 m-0">
              <div>
                <dt class="text-xs text-muted-foreground m-0 mb-1">{{ dateLabel }}</dt>
                <dd class="text-sm font-medium m-0">{{ document.date }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground m-0 mb-1">
                  {{ t('dashboard.certificate.fileType') }}
                </dt>
                <dd class="text-sm font-medium m-0">{{ document.ext }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground m-0 mb-1">
                  {{ t('dashboard.certificate.docId') }}
                </dt>
                <dd class="text-sm font-medium m-0">#{{ document.id }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground m-0 mb-1">
                  {{ t('dashboard.certificate.fileSize') }}
                </dt>
                <dd class="text-sm font-medium m-0">{{ document.sizeMb }} MB</dd>
              </div>
            </dl>
          </div>

          <div class="border-t border-border pt-6">
            <p
              class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground m-0 mb-3"
            >
              {{ t('dashboard.certificate.verificationSection') }}
            </p>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-4 m-0">
              <div>
                <dt class="text-xs text-muted-foreground m-0 mb-1">
                  {{ t('dashboard.certificate.hashAlgorithm') }}
                </dt>
                <dd class="text-sm font-medium font-mono m-0">SHA-256</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground m-0 mb-1">
                  {{ t('dashboard.certificate.standard') }}
                </dt>
                <dd class="text-sm font-medium font-mono m-0">RFC 3161</dd>
              </div>
            </dl>
          </div>
        </div>
      </template>
    </div>

    <div class="flex-none border-t border-border p-6">
      <button
        type="button"
        class="w-full bg-accent text-accent-foreground rounded-[11px] py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
        @click="emit('download')"
      >
        <Download class="w-4 h-4" /> {{ t('common.actions.download') }}
      </button>
    </div>
  </BaseSideSheet>
</template>
