<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Info, X } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { DialogTitle, VisuallyHidden } from 'reka-ui'
import { useQueryClient } from '@tanstack/vue-query'
import { updatePassword } from '@/api/security'
import { useSecurity } from '@/queries/useSecurity'
import { useToast } from '@/composables/useToast'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_UPPER_REGEX,
  PASSWORD_LOWER_REGEX,
  PASSWORD_DIGIT_REGEX,
  getPasswordRules,
} from '@/lib/passwordRules'

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
        .min(PASSWORD_MIN_LENGTH, t('profile.password.rules.minLength'))
        .regex(PASSWORD_UPPER_REGEX, t('profile.password.rules.upper'))
        .regex(PASSWORD_LOWER_REGEX, t('profile.password.rules.lower'))
        .regex(PASSWORD_DIGIT_REGEX, t('profile.password.rules.digit')),
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

// reka-ui's DialogContent (via FocusScope) auto-focuses the first tabbable
// element on open, which would be the close (X) button since it precedes
// the current-password input in DOM order. Prevent that default and focus
// the current-password input ourselves, matching the pre-migration behavior.
function onOpenAutoFocus(event: Event) {
  event.preventDefault()
  currentPasswordInput.value?.focus()
}

const rules = computed(() => getPasswordRules(values.next, values.confirm, t))

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

// This component only exists while its parent's v-if is true, so its own
// lifetime already represents "open" — reka-ui's own Escape/outside-click
// detection is what can trigger update:open(false) here, which we just
// forward as the same 'close' this component already emitted for its old
// hand-rolled backdrop/@keydown.esc.
function onOpenChange(value: boolean) {
  if (!value) emit('close')
}
</script>

<template>
  <Dialog :open="true" @update:open="onOpenChange">
    <DialogContent
      class="max-w-[440px] bg-card p-7 flex flex-col gap-4"
      @open-auto-focus="onOpenAutoFocus"
    >
      <DialogTitle as-child>
        <VisuallyHidden>{{ t('profile.password.title') }}</VisuallyHidden>
      </DialogTitle>

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

      <div class="bg-muted rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground">
        <Info class="w-3.5 h-3.5 flex-none mt-0.5" />
        <span>{{ t('profile.password.demoNotice') }}</span>
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
    </DialogContent>
  </Dialog>
</template>
