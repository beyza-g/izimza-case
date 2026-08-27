<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, X } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import { updatePassword } from '@/api/security'
import { useSecurity } from '@/queries/useSecurity'
import { useToast } from '@/composables/useToast'

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n({ useScope: 'global' })

// Rebuilt whenever the active locale changes so validation messages never
// stay stuck in whatever language was active when the form first mounted.
const passwordSchema = computed(() =>
  z
    .object({
      current: z.string().min(1, t('common.requiredField')),
      next: z
        .string()
        .min(8, t('profile.password.rules.minLength'))
        .regex(/[A-ZÇĞİÖŞÜ]/, t('profile.password.rules.upper'))
        .regex(/[a-zçğıöşü]/, t('profile.password.rules.lower'))
        .regex(/\d/, t('profile.password.rules.digit')),
      confirm: z.string(),
    })
    .refine((data) => data.confirm.length > 0 && data.next === data.confirm, {
      message: t('profile.password.rules.match'),
      path: ['confirm'],
    }),
)

type PasswordForm = z.infer<typeof passwordSchema.value>

const { handleSubmit, values, defineField } = useForm<PasswordForm>({
  validationSchema: computed(() => toTypedSchema(passwordSchema.value)),
  initialValues: { current: '', next: '', confirm: '' },
})

const [current] = defineField('current')
const [next] = defineField('next')
const [confirm] = defineField('confirm')

const currentPasswordError = ref('')
const submitting = ref(false)
const currentPasswordInput = ref<HTMLInputElement | null>(null)
const { pushToast } = useToast()
const securityQuery = useSecurity()
const queryClient = useQueryClient()

onMounted(() => {
  currentPasswordInput.value?.focus()
})

const rules = computed(() => [
  { label: t('profile.password.rules.minLength'), ok: values.next.length >= 8 },
  { label: t('profile.password.rules.upper'), ok: /[A-ZÇĞİÖŞÜ]/.test(values.next) },
  { label: t('profile.password.rules.lower'), ok: /[a-zçğıöşü]/.test(values.next) },
  { label: t('profile.password.rules.digit'), ok: /\d/.test(values.next) },
  {
    label: t('profile.password.rules.match'),
    ok: values.next.length > 0 && values.next === values.confirm,
  },
])

const canSubmit = computed(() => rules.value.every((r) => r.ok) && values.current.length > 0)

function onCurrentInput() {
  currentPasswordError.value = ''
}

const submit = handleSubmit(async (formValues) => {
  if (formValues.current !== securityQuery.data.value?.currentPassword) {
    currentPasswordError.value = t('profile.password.currentError')
    return
  }

  submitting.value = true
  try {
    await updatePassword(formValues.next)
    queryClient.invalidateQueries({ queryKey: ['security'] })
    pushToast(t('profile.password.toastSuccess'), { tone: 'success' })
    emit('close')
  } finally {
    submitting.value = false
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div
      class="w-full max-w-[440px] bg-card border border-border rounded-2xl p-7 flex flex-col gap-4 shadow-2xl"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-lg font-semibold tracking-tight m-0 mb-1">
            {{ t('profile.password.title') }}
          </p>
          <p class="text-[13px] text-muted-foreground m-0">
            {{ t('profile.password.description') }}
          </p>
        </div>
        <button
          type="button"
          class="w-[30px] h-[30px] flex-none rounded-full border border-border flex items-center justify-center text-muted-foreground"
          @click="$emit('close')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{
            t('profile.password.current')
          }}</label>
          <input
            ref="currentPasswordInput"
            v-model="current"
            type="password"
            class="w-full border rounded-[10px] px-3.5 py-3 text-sm"
            :class="
              currentPasswordError
                ? 'border-destructive focus:border-destructive'
                : 'border-input focus:border-primary'
            "
            @input="onCurrentInput"
          />
          <p v-if="currentPasswordError" class="text-xs text-destructive mt-1.5 m-0">
            {{ currentPasswordError }}
          </p>
        </div>
        <div>
          <label class="block text-xs font-medium text-muted-foreground mb-1.5">{{
            t('profile.password.new')
          }}</label>
          <input
            v-model="next"
            type="password"
            class="w-full border border-input rounded-[10px] px-3.5 py-3 text-sm focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-muted-foreground mb-1.5"
            >{{ t('profile.password.confirm') }}</label
          >
          <input
            v-model="confirm"
            type="password"
            class="w-full border border-input rounded-[10px] px-3.5 py-3 text-sm focus:border-primary"
          />
        </div>
      </div>

      <div class="bg-muted rounded-xl p-3.5 flex flex-col gap-2">
        <p class="text-xs font-medium m-0">{{ t('profile.password.requirementsTitle') }}</p>
        <div v-for="rule in rules" :key="rule.label" class="flex items-center gap-2.5">
          <span
            class="w-[15px] h-[15px] rounded-full flex items-center justify-center flex-none"
            :class="rule.ok ? 'bg-success/15 text-success' : 'bg-border text-muted-foreground'"
          >
            <Check v-if="rule.ok" class="w-2.5 h-2.5" />
            <X v-else class="w-2.5 h-2.5" />
          </span>
          <span class="text-xs" :class="rule.ok ? 'text-foreground' : 'text-muted-foreground'">{{
            rule.label
          }}</span>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-[10px] px-5 py-3 text-[13px] font-semibold transition-colors disabled:opacity-60"
          :class="canSubmit ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting ? t('profile.password.changing') : t('profile.password.title') }}
        </button>
      </div>
    </div>
  </div>
</template>
