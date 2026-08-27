import { createI18n } from 'vue-i18n'
import { watchEffect } from 'vue'
import tr from '@/locales/tr.json'
import en from '@/locales/en.json'

export type Locale = 'tr' | 'en'

const STORAGE_KEY = 'izimza-locale'

function getInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'tr' || stored === 'en' ? stored : 'tr'
}

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'tr',
  messages: { tr, en },
})

// Same persist-on-change pattern as useTheme.ts: read once on init above,
// write back on every change here.
watchEffect(() => {
  localStorage.setItem(STORAGE_KEY, i18n.global.locale.value)
})
