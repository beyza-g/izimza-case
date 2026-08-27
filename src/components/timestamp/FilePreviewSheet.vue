<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileText } from 'lucide-vue-next'
import BaseSideSheet from '@/components/ui/BaseSideSheet.vue'
import type { QueueFile } from '@/stores/timestampQueue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  files: QueueFile[]
  initialIndex: number | null
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const open = computed(() => props.initialIndex !== null)
const activeIndex = ref(0)

// Re-targets whenever the parent asks for a specific file — both the
// closed->open transition and, while already open, a different row's
// preview button being clicked (initialIndex changes but stays non-null).
watch(
  () => props.initialIndex,
  (index) => {
    if (index !== null) activeIndex.value = index
  },
)

const activeFile = computed<QueueFile | null>(() => props.files[activeIndex.value] ?? null)

function kindOf(file: QueueFile): 'pdf' | 'image' | 'unsupported' {
  const type = file.file.type
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('image/')) return 'image'
  // Some browsers leave `type` empty for a picked file — fall back to the
  // extension so a PDF/PNG isn't wrongly treated as unsupported.
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'png') return 'image'
  return 'unsupported'
}

const activeKind = computed(() => (activeFile.value ? kindOf(activeFile.value) : 'unsupported'))

// Lazily populated, one entry per file, the first time that file is
// actually displayed — as the main preview, or as an image thumbnail in
// the strip below. Never pre-created for the whole queue up front: a
// 20-file batch shouldn't mean 20 live object URLs the moment the sheet
// opens if only a couple are ever actually looked at.
const urlCache = new Map<number, string>()

function urlFor(file: QueueFile): string {
  const cached = urlCache.get(file.id)
  if (cached) return cached
  const url = URL.createObjectURL(file.file)
  urlCache.set(file.id, url)
  return url
}

function thumbUrl(file: QueueFile): string {
  return urlFor(file)
}

const activeObjectUrl = ref<string | null>(null)

watch(
  activeFile,
  (file) => {
    activeObjectUrl.value = file ? urlFor(file) : null
  },
  { immediate: true },
)

function clearCache() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
  activeObjectUrl.value = null
}

// BaseSideSheet owns focus/backdrop/Escape; this still needs its own
// watch on `open` purely for the object-URL cache lifecycle.
watch(open, (isOpen) => {
  if (!isOpen) clearCache()
})

onBeforeUnmount(clearCache)

function close() {
  emit('dismiss')
}

function selectIndex(i: number) {
  activeIndex.value = i
}

function prev() {
  activeIndex.value = Math.max(0, activeIndex.value - 1)
}

function next() {
  activeIndex.value = Math.min(props.files.length - 1, activeIndex.value + 1)
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    prev()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    next()
  }
}
</script>

<template>
  <BaseSideSheet
    :open="open"
    :label="t('timestamp.preview.title', { name: activeFile?.name ?? '' })"
    @dismiss="close"
    @panel-keydown="onPanelKeydown"
  >
    <template #header>
      <p class="text-[15px] font-semibold truncate m-0">{{ activeFile?.name }}</p>
    </template>

    <div class="flex-1 min-h-0 bg-muted flex items-center justify-center overflow-hidden">
      <iframe
        v-if="activeKind === 'pdf' && activeObjectUrl"
        :key="activeFile?.id"
        :src="activeObjectUrl"
        :title="activeFile?.name"
        class="w-full h-full border-0 bg-background"
      />
      <img
        v-else-if="activeKind === 'image' && activeObjectUrl"
        :src="activeObjectUrl"
        :alt="activeFile?.name"
        class="max-w-full max-h-full object-contain"
      />
      <div v-else class="flex flex-col items-center gap-3 text-center px-8">
        <FileText class="w-10 h-10 text-muted-foreground" />
        <p class="text-sm text-muted-foreground max-w-[36ch] m-0">
          {{ t('timestamp.preview.unsupported') }}
        </p>
      </div>
    </div>

    <div class="flex-none border-t border-border px-4 py-3 overflow-x-auto scrollbar-thin">
      <div class="flex gap-2">
        <button
          v-for="(f, i) in files"
          :key="f.id"
          type="button"
          class="w-16 h-16 flex-none rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 overflow-hidden transition-colors"
          :class="
            i === activeIndex
              ? 'border-primary bg-[color-mix(in_oklch,var(--primary)_8%,transparent)]'
              : 'border-border hover:border-[color-mix(in_oklch,var(--primary)_50%,transparent)]'
          "
          :aria-label="f.name"
          :aria-current="i === activeIndex"
          @click="selectIndex(i)"
        >
          <img
            v-if="kindOf(f) === 'image'"
            :src="thumbUrl(f)"
            :alt="f.name"
            class="w-full h-full object-cover"
          />
          <template v-else>
            <FileText class="w-5 h-5 text-muted-foreground" />
            <span class="text-[9px] leading-tight text-muted-foreground truncate max-w-full px-1">{{
              f.name
            }}</span>
          </template>
        </button>
      </div>
    </div>
  </BaseSideSheet>
</template>
