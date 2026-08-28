export interface ArchiveStats {
  usedGb: string
  limitGb: number
  percent: number
}

export function computeArchiveStats(account: {
  archiveUsedMb: number
  archiveLimitMb: number
}): ArchiveStats {
  return {
    usedGb: (account.archiveUsedMb / 1024).toFixed(1).replace('.', ','),
    limitGb: Math.round(account.archiveLimitMb / 1024),
    percent: Math.min(100, Math.round((account.archiveUsedMb / account.archiveLimitMb) * 100)),
  }
}
