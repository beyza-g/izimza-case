<script setup lang="ts">
import { ref } from 'vue'
import { Bug } from 'lucide-vue-next'
import { debugForceNextError } from '@/lib/mockApi'
import { http } from '@/lib/http'
import { useToast } from '@/composables/useToast'

const { pushToast } = useToast()
const open = ref(false)

function triggerMock() {
  debugForceNextError()
  pushToast('Sonraki mock istek hataya zorlanacak.', { tone: 'success' })
  open.value = false
}

// These fire a real HTTP request through the same axios instance/interceptors —
// only the target differs, so the network/4xx/5xx branches in src/lib/http.ts
// run against genuine responses (or a genuine connection failure).
function triggerNetworkError() {
  http.get('/account', { baseURL: 'http://localhost:1' }).catch(() => {})
  open.value = false
}

function triggerValidationError() {
  http.get('/__mock/validation-error').catch(() => {})
  open.value = false
}

function triggerServerError() {
  http.get('/__mock/server-error').catch(() => {})
  open.value = false
}
</script>

<template>
  <div class="fixed z-40 bottom-20 md:bottom-4 left-4 flex flex-col items-start gap-2">
    <div v-if="open" class="bg-card border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1 text-xs">
      <button type="button" class="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted" @click="triggerMock">
        Genel hata (toast+retry)
      </button>
      <div class="h-px bg-border my-0.5"></div>
      <button type="button" class="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted" @click="triggerNetworkError">
        HTTP: Ağ hatası
      </button>
      <button type="button" class="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted" @click="triggerValidationError">
        HTTP: 422 doğrulama
      </button>
      <button type="button" class="text-left px-2.5 py-1.5 rounded-lg hover:bg-muted" @click="triggerServerError">
        HTTP: 500 sunucu
      </button>
    </div>

    <button
      type="button"
      class="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg"
      title="Geliştirici aracı: sonraki isteği hata olarak simüle eder"
      @click="open = !open"
    >
      <Bug class="w-3.5 h-3.5" />
      Hata simüle et
    </button>
  </div>
</template>
