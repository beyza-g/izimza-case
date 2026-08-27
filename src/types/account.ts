export interface Account {
  totalSignatures: number
  signaturesThisMonth: number
  archivedDocuments: number
  archivedLast30Days: number
  remainingCredits: number
  creditsRenewalDate: string
  archiveUsedMb: number
  archiveLimitMb: number
  planTier: string
  memberSince: string
  nesValidUntil: string
}
