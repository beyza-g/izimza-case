<script setup lang="ts">
import { onBeforeUnmount, onMounted, nextTick, ref } from 'vue'
import { ChevronUp } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useCurrentUser } from '@/composables/useCurrentUser'
import AppUserPopover from './AppUserPopover.vue'

defineProps<{ expanded?: boolean }>()

const { t } = useI18n({ useScope: 'global' })
const { fullName, initials } = useCurrentUser()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const popoverEl = ref<HTMLElement | null>(null)
const popoverStyle = ref<{ left: string; bottom: string }>({ left: '0px', bottom: '0px' })

// Teleported to <body> instead of positioned relative to `root`: the sidebar's
// tablet icon-rail wraps this in an `overflow-hidden` container (needed for
// its own hover-expand width transition), which would otherwise clip a
// popover this much wider than the collapsed 76px rail.
function updatePosition() {
  if (!root.value) return
  const rect = root.value.getBoundingClientRect()
  popoverStyle.value = {
    left: `${rect.left}px`,
    bottom: `${window.innerHeight - rect.top + 8}px`,
  }
}

async function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    updatePosition()
  }
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  const insideTrigger = root.value?.contains(target)
  const insidePopover = popoverEl.value?.contains(target)
  // The language selector's DropdownMenuContent (and any other reka-ui
  // dropdown/select content) portals to <body> instead of staying inside
  // popoverEl's DOM subtree, so a click on one of its items would otherwise
  // read as "outside" and close this popover along with it.
  const insidePortaledMenu = (target as Element).closest?.(
    '[data-slot="dropdown-menu-content"]',
  )
  if (!insideTrigger && !insidePopover && !insidePortaledMenu) {
    open.value = false
  }
}

function onScroll() {
  if (open.value) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('scroll', onScroll, true)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('scroll', onScroll, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative">
    <Teleport to="body">
      <div v-if="open" ref="popoverEl" class="fixed z-30 w-[280px]" :style="popoverStyle">
        <AppUserPopover @close="open = false" />
      </div>
    </Teleport>

    <button
      type="button"
      class="w-full flex items-center gap-2.5 bg-white/10 border border-white/14 rounded-xl p-2.5 hover:bg-white/14 transition-colors"
      @click="toggleOpen"
    >
      <span
        class="w-[34px] h-[34px] flex-none rounded-full bg-white/18 flex items-center justify-center text-xs font-semibold"
        >{{ initials }}</span
      >
      <div class="flex-1 min-w-0 text-left" :class="expanded ? '' : 'hidden lg:block'">
        <p class="text-[13px] font-medium m-0">{{ fullName }}</p>
        <p class="text-[11px] text-white/60 truncate m-0">{{ t('common.user.role') }}</p>
      </div>
      <ChevronUp class="w-3 h-3 text-white/70" :class="expanded ? '' : 'hidden lg:block'" />
    </button>
  </div>
</template>
