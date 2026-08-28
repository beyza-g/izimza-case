export type DocStatus = 'signed' | 'archived' | 'pending' | 'cancelled'

// Display-only mapping: DocStatus -> i18n key. Kept entirely separate from
// the raw-status validation in documents.ts's mapDocument() — the backend
// already speaks this same English vocabulary directly, so that function
// only validates/falls back now rather than translating from another one.
export const statusLabels: Record<DocStatus, string> = {
  signed: 'common.status.signed',
  archived: 'common.status.archived',
  pending: 'common.status.pending',
  cancelled: 'common.status.cancelled',
}

export const statusClasses: Record<DocStatus, string> = {
  signed: 'bg-success/10 text-success',
  archived: 'bg-muted-foreground/10 text-muted-foreground',
  pending: 'bg-warning/15 text-warning',
  cancelled: 'bg-destructive/10 text-destructive',
}

// What operation produced the document — independent of DocStatus (its
// current lifecycle state). A document can be archived after either flow.
export type OperationType = 'timestamp' | 'sign'

export const operationTypeLabels: Record<OperationType, string> = {
  timestamp: 'dashboard.operationTypes.timestamp',
  sign: 'dashboard.operationTypes.sign',
}

export const operationTypeClasses: Record<OperationType, string> = {
  timestamp: 'bg-primary/10 text-primary dark:text-foreground',
  sign: 'bg-success/10 text-success',
}

export interface NavItem {
  key: string
  labelKey: string
  routeName?: string
  disabled?: boolean
}

export const navItems: NavItem[] = [
  { key: 'home', labelKey: 'common.nav.home', routeName: 'dashboard' },
  { key: 'sign', labelKey: 'common.nav.sign', disabled: true },
  { key: 'timestamp', labelKey: 'common.nav.timestamp', routeName: 'timestamp' },
  { key: 'archive', labelKey: 'common.nav.archive', disabled: true },
  { key: 'documents', labelKey: 'common.nav.documents', disabled: true },
]

export const bottomNavItems: NavItem[] = [
  { key: 'home', labelKey: 'common.nav.home', routeName: 'dashboard' },
  { key: 'sign', labelKey: 'common.nav.sign', disabled: true },
  { key: 'timestamp', labelKey: 'common.nav.timestampShort', routeName: 'timestamp' },
  { key: 'archive', labelKey: 'common.nav.archive', disabled: true },
  { key: 'account', labelKey: 'common.nav.account', routeName: 'profile' },
]

export interface ProfileField {
  key: string
  labelKey: string
  value: string
  locked?: boolean
  required?: boolean
}

export const profileFields: ProfileField[] = [
  { key: 'firstName', labelKey: 'profile.fields.firstName', value: 'Beyza', required: true },
  { key: 'lastName', labelKey: 'profile.fields.lastName', value: 'Güzel', required: true },
  {
    key: 'phone',
    labelKey: 'profile.fields.phone',
    value: '0(551) 169-6158',
    required: true,
  },
  {
    key: 'email',
    labelKey: 'profile.fields.email',
    value: 'guzelbeyza98@gmail.com',
    locked: true,
  },
]

export const profileSubnav = [
  { key: 'security', labelKey: 'profile.settingsNav.security', disabled: false },
  { key: 'signature', labelKey: 'profile.settingsNav.signature', disabled: true },
  { key: 'billing', labelKey: 'profile.settingsNav.billing', disabled: true },
  { key: 'recipients', labelKey: 'profile.settingsNav.recipients', disabled: true },
]

export interface Recipient {
  name: string
  mail: string
  selected: boolean
}

export const recipients: Recipient[] = [
  { name: 'Ahmet Kaya', mail: 'a.kaya@sirket.com', selected: true },
  { name: 'Deniz Arslan', mail: 'deniz@hukukofisi.com', selected: false },
  { name: 'Muhasebe', mail: 'muhasebe@sirket.com', selected: false },
]

export const otpLength = 6

export const timestampFile = {
  name: 'Kira Sözleşmesi 2026.pdf',
  size: '1,2 MB',
  uploadedAt: '15:41',
}
