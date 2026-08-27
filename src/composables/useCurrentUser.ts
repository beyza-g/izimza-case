import { computed } from 'vue'
import { useProfile } from '@/queries/useProfile'
import { profileFields } from '@/data/mockData'

// Seed fallbacks for the brief window before useProfile()'s query resolves —
// same values ProfileView.vue's own form already seeds itself with before
// resetForm() overwrites them with the real fetched record. Email has no
// live query behind it at all (the /profile resource doesn't store it — see
// ProfileView.vue), so this seed constant is its only source, live or not.
const SEED_FIRST_NAME = profileFields.find((f) => f.key === 'firstName')?.value ?? ''
const SEED_LAST_NAME = profileFields.find((f) => f.key === 'lastName')?.value ?? ''
const SEED_EMAIL = profileFields.find((f) => f.key === 'email')?.value ?? ''

/**
 * Single source for "who is the current user" display data (name, initials,
 * email), so it's read from useProfile()'s cache everywhere instead of being
 * retyped as a literal string in each component that shows it.
 */
export function useCurrentUser() {
  const profileQuery = useProfile()

  const firstName = computed(() => profileQuery.data.value?.firstName ?? SEED_FIRST_NAME)
  const lastName = computed(() => profileQuery.data.value?.lastName ?? SEED_LAST_NAME)
  const fullName = computed(() => `${firstName.value} ${lastName.value}`.trim())
  const initials = computed(() =>
    `${firstName.value.charAt(0)}${lastName.value.charAt(0)}`.toUpperCase(),
  )
  const email = computed(() => SEED_EMAIL)

  return { firstName, lastName, fullName, initials, email }
}
