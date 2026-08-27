<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { X } from 'lucide-vue-next'

const { t } = useI18n({ useScope: 'global' })

const props = withDefaults(
  defineProps<{
    open: boolean
    label: string
    widthClass?: string
  }>(),
  {
    widthClass: 'w-full sm:w-[480px] lg:w-[560px]',
  },
)

const emit = defineEmits<{
  dismiss: []
  // Forwarded from the panel's own keydown so a consumer (e.g. a
  // thumbnail strip needing arrow-key paging) can react to keys beyond
  // the Escape this component already owns, without this component
  // needing to know what those keys mean.
  panelKeydown: [event: KeyboardEvent]
}>()

const closeButtonRef = ref<HTMLButtonElement | null>(null)
// Captured the instant the sheet opens (whatever had focus — normally the
// row/card button that triggered it), so closing can return focus there
// instead of dropping it to <body>.
let triggerEl: HTMLElement | null = null

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      triggerEl = document.activeElement as HTMLElement | null
      nextTick(() => closeButtonRef.value?.focus())
    } else {
      triggerEl?.focus()
      triggerEl = null
    }
  },
)

function close() {
  emit('dismiss')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100]">
      <Transition
        appear
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div class="absolute inset-0 bg-black/60" @click="close" />
      </Transition>

      <Transition
        appear
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-x-full"
        leave-active-class="transition-transform duration-150 ease-in"
        leave-to-class="translate-x-full"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="label"
          :class="widthClass"
          class="absolute inset-y-0 right-0 bg-card shadow-2xl flex flex-col outline-none"
          @keydown.esc="close"
          @keydown="emit('panelKeydown', $event)"
        >
          <div
            class="flex items-center justify-between gap-4 px-6 py-4 border-b border-border flex-none"
          >
            <div class="min-w-0 flex-1"><slot name="header" /></div>
            <button
              ref="closeButtonRef"
              type="button"
              class="w-8 h-8 flex-none rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              :aria-label="t('common.actions.close')"
              @click="close"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <slot />
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
