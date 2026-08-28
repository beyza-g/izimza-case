<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'
import { useQueryClient } from '@tanstack/vue-query'
import { profileFields, profileSubnav } from '@/data/mockData'
import ChangePasswordModal from '@/components/profile/ChangePasswordModal.vue'
import { useProfile } from '@/queries/useProfile'
import { useAccount } from '@/queries/useAccount'
import { useSecurity } from '@/queries/useSecurity'
import { updateProfile, type ProfileInfo } from '@/api/profile'
import { closeAllSessions as closeAllSessionsRequest } from '@/api/security'
import { PHONE_REGEX } from '@/lib/phone'
import { formatDate, formatDateTime } from '@/lib/formatDate'
import { useToast } from '@/composables/useToast'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePhoneInputMask } from '@/composables/usePhoneInputMask'

const { t } = useI18n({ useScope: 'global' })
const { pushToast } = useToast()
const { fullName, initials } = useCurrentUser()

// The keys the /profile resource actually stores — "E-posta" is locked/
// display-only and isn't part of that resource, so it's excluded from what
// gets PATCHed.
const EDITABLE_KEYS = ['firstName', 'lastName', 'phone'] as const

// Rebuilt whenever the active locale changes so validation messages never
// stay stuck in whatever language was active when the form first mounted.
const profileSchema = computed(() =>
  z.object(
    Object.fromEntries(
      profileFields.map((f) => {
        if (f.key === 'phone') {
          return [f.key, z.string().regex(PHONE_REGEX, t('profile.errors.invalidPhone'))]
        }
        return [
          f.key,
          f.required ? z.string().trim().min(1, t('common.requiredField')) : z.string(),
        ]
      }),
    ),
  ),
)
type ProfileForm = z.infer<typeof profileSchema.value>

const profileQuery = useProfile()
const accountQuery = useAccount()
const securityQuery = useSecurity()
const queryClient = useQueryClient()

const accountMeta = computed(() => {
  const account = accountQuery.data.value
  if (!account) return ''
  return t('profile.accountMeta', {
    email: fields.email,
    plan: t(`common.plan.${account.planTier}`),
    memberSince: formatDate(account.memberSince),
  })
})

const passwordLastChanged = computed(() => {
  const security = securityQuery.data.value
  return security
    ? t('profile.security.passwordLastChanged', { date: formatDate(security.passwordChangedAt) })
    : ''
})

const sessionsInfo = computed(() => {
  const security = securityQuery.data.value
  if (!security) return ''
  return t('profile.security.sessionsInfo', {
    deviceCount: security.activeSessionCount,
    lastLogin: formatDateTime(security.lastLoginAt),
    location: security.lastLoginLocation,
  })
})

const { handleSubmit, defineField, errors, meta, resetForm } = useForm<ProfileForm>({
  validationSchema: computed(() => toTypedSchema(profileSchema.value)),
  initialValues: Object.fromEntries(profileFields.map((f) => [f.key, f.value])) as ProfileForm,
})

// Seed values are just a placeholder for the first paint — once the real
// /profile record loads, re-baseline the form with it so Kaydet/İptal don't
// end up comparing against stale local data.
watch(
  profileQuery.data,
  (data) => {
    if (!data) return
    resetForm({
      values: {
        ...(Object.fromEntries(profileFields.map((f) => [f.key, f.value])) as ProfileForm),
        ...data,
      },
    })
  },
  { immediate: true },
)

const fields = reactive(
  Object.fromEntries(profileFields.map((f) => [f.key, defineField(f.key)[0]])),
) as unknown as Record<string, string>

const saving = ref(false)
const attemptedSave = ref(false)
const passwordModalOpen = ref(false)

const save = handleSubmit(
  async (values) => {
    saving.value = true
    try {
      const valuesByKey = values as unknown as Record<string, string>
      const payload = Object.fromEntries(
        EDITABLE_KEYS.map((key) => [key, valuesByKey[key]]),
      ) as Partial<ProfileInfo>
      await updateProfile(payload)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      resetForm({ values })
      pushToast(t('profile.toasts.saved'), { tone: 'success' })
    } finally {
      saving.value = false
    }
  },
  () => {
    attemptedSave.value = true
  },
)

function cancel() {
  resetForm()
  attemptedSave.value = false
}

const closingSessions = ref(false)

async function closeAllSessions() {
  closingSessions.value = true
  try {
    await closeAllSessionsRequest()
    queryClient.invalidateQueries({ queryKey: ['security'] })
    pushToast(t('profile.toasts.sessionsClosed'), { tone: 'success' })
  } finally {
    closingSessions.value = false
  }
}

const { onPhoneInput } = usePhoneInputMask((formatted) => {
  fields.phone = formatted
})
</script>

<template>
  <div class="flex flex-col lg:flex-row gap-6">
    <!-- mobile/tablet subnav — lg+ uses the structural AppSettingsNav column instead -->
    <div class="lg:hidden flex flex-col gap-4">
      <div>
        <p class="text-lg font-semibold tracking-tight m-0 mb-0.5">
          {{ t('profile.mobileHeading') }}
        </p>
        <p class="text-xs text-muted-foreground m-0">{{ t('profile.mobileSubheading') }}</p>
      </div>
      <div class="flex gap-1.5 overflow-x-auto">
        <span
          v-for="item in profileSubnav"
          :key="item.key"
          class="flex-none rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap"
          :class="[
            item.key === 'security'
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'bg-secondary text-secondary-foreground font-medium',
            item.disabled ? 'opacity-50' : '',
          ]"
        >
          {{ t(item.labelKey) }}
        </span>
      </div>
    </div>

    <!-- content -->
    <div class="flex-1 min-w-0 flex flex-col gap-5">
      <div class="flex items-center gap-4">
        <span
          class="w-[60px] h-[60px] flex-none rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold"
          >{{ initials }}</span
        >
        <div>
          <div class="flex items-center gap-2.5 mb-1">
            <p class="text-xl font-semibold tracking-tight m-0">{{ fullName }}</p>
            <span
              class="relative group inline-flex items-center gap-1.5 bg-success/12 text-success rounded-full px-2.5 py-1 text-xs font-semibold cursor-help"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span
              >{{ t('profile.badges.nesVerified') }}
              <span
                class="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 w-max max-w-[220px] whitespace-normal rounded-lg bg-foreground text-background text-[11px] font-normal leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center"
              >
                {{ t('profile.badges.nesTooltip') }}
              </span>
            </span>
          </div>
          <p class="text-[13px] text-muted-foreground m-0">
            {{ accountMeta }}
          </p>
        </div>
      </div>

      <div class="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <p class="text-base font-semibold tracking-tight m-0 mb-0.5">
            {{ t('profile.personalInfo.title') }}
          </p>
          <p class="text-[13px] text-muted-foreground m-0">
            {{ t('profile.personalInfo.description') }}
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="f in profileFields" :key="f.key">
            <label class="block text-xs font-medium text-muted-foreground mb-1.5"
              >{{ t(f.labelKey) }}<span v-if="f.required" class="text-destructive"> *</span></label
            >
            <div
              class="border rounded-[10px] px-3.5 py-3 text-sm flex items-center justify-between"
              :class="[
                f.locked ? 'bg-muted text-muted-foreground' : 'bg-card',
                attemptedSave && errors[f.key]
                  ? 'border-destructive'
                  : 'border-input focus-within:border-primary',
              ]"
            >
              <template v-if="f.locked">
                <span>{{ fields[f.key] }}</span>
              </template>
              <input
                v-else-if="f.key === 'phone'"
                :value="fields[f.key]"
                type="tel"
                inputmode="numeric"
                placeholder="0(5XX) XXX-XXXX"
                class="w-full bg-transparent outline-none"
                @input="onPhoneInput"
              />
              <input v-else v-model="fields[f.key]" class="w-full bg-transparent outline-none" />
            </div>
            <p v-if="attemptedSave && errors[f.key]" class="text-xs text-destructive mt-1.5 m-0">
              {{ errors[f.key] }}
            </p>
          </div>
        </div>
        <div class="border-t border-border pt-4 flex flex-col gap-2.5 items-end">
          <div class="flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              class="border border-border rounded-[10px] px-4 py-2.5 text-[13px] font-medium text-muted-foreground disabled:opacity-60"
              :disabled="!meta.dirty"
              @click="cancel"
            >
              {{ t('common.actions.cancel') }}
            </button>
            <button
              type="button"
              class="min-w-[132px] bg-accent text-accent-foreground rounded-[10px] px-5 py-2.5 text-[13px] font-semibold disabled:opacity-60"
              :disabled="saving || !meta.dirty"
              @click="save"
            >
              {{ saving ? t('profile.saving') : t('common.actions.save') }}
            </button>
          </div>
          <p
            class="w-full text-[11.5px] leading-relaxed text-muted-foreground text-right max-w-[65ch] m-0"
          >
            {{ t('profile.kvkkText') }}
            <a href="#" class="whitespace-nowrap text-primary dark:text-foreground hover:underline">{{
              t('profile.kvkkReadLink')
            }}</a>
          </p>
        </div>
      </div>

      <div class="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3.5">
        <p class="text-base font-semibold tracking-tight m-0">{{ t('profile.security.title') }}</p>
        <div class="flex items-center justify-between border border-border rounded-xl p-4 gap-4">
          <div>
            <p class="text-sm font-medium m-0 mb-0.5">{{ t('profile.security.password') }}</p>
            <p class="text-xs text-muted-foreground m-0">
              {{ passwordLastChanged }}
            </p>
          </div>
          <button
            type="button"
            class="flex-none border border-border bg-card text-foreground rounded-[9px] px-4 py-2.5 text-[13px] font-medium"
            @click="passwordModalOpen = true"
          >
            {{ t('profile.security.changePassword') }}
          </button>
        </div>
        <div class="flex items-center justify-between border border-border rounded-xl p-4 gap-4">
          <div>
            <p class="text-sm font-medium m-0 mb-0.5">{{ t('profile.security.sessions') }}</p>
            <p class="text-xs text-muted-foreground m-0">
              {{ sessionsInfo }}
            </p>
          </div>
          <button
            type="button"
            class="flex-none border border-border rounded-[9px] px-4 py-2.5 text-[13px] font-medium text-destructive disabled:opacity-60"
            :disabled="closingSessions"
            @click="closeAllSessions"
          >
            {{
              closingSessions
                ? t('profile.security.closingAllSessions')
                : t('profile.security.closeAllSessions')
            }}
          </button>
        </div>
      </div>
    </div>

    <ChangePasswordModal v-if="passwordModalOpen" @close="passwordModalOpen = false" />
  </div>
</template>
