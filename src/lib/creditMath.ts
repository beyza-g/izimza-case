// Pure credit-cost arithmetic for the Timestamp flow, extracted out of
// TimestampView.vue so it's unit-testable without mounting the view or its
// queries. Behavior is unchanged from the inline computed()s it replaced.

export function totalCost(queuedCount: number, creditCost: number): number {
  return queuedCount * creditCost
}

export function insufficientBalance(
  queuedCount: number,
  totalCostValue: number,
  remainingCredits: number,
): boolean {
  return queuedCount > 0 && totalCostValue > remainingCredits
}

export function remainingAfter(remainingCredits: number, totalCostValue: number): number {
  return remainingCredits - totalCostValue
}
