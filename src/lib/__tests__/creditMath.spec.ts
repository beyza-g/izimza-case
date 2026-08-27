import { describe, it, expect } from 'vitest'
import { totalCost, insufficientBalance, remainingAfter } from '../creditMath'

describe('totalCost', () => {
  it.each([
    [0, 1, 0],
    [3, 1, 3],
    [5, 2, 10],
  ])('queuedCount=%i, creditCost=%i -> %i', (queuedCount, creditCost, expected) => {
    expect(totalCost(queuedCount, creditCost)).toBe(expected)
  })
})

describe('insufficientBalance', () => {
  it('is false for an empty queue regardless of balance', () => {
    // Guards against showing a false "insufficient balance" warning before
    // anything has actually been queued (totalCost is 0, not > balance, but
    // the queuedCount === 0 short-circuit is what the UI actually relies on).
    expect(insufficientBalance(0, 0, 0)).toBe(false)
  })

  it('is false exactly at the balance boundary (cost === balance)', () => {
    expect(insufficientBalance(3, 3, 3)).toBe(false)
  })

  it('is true one credit over the balance boundary', () => {
    expect(insufficientBalance(4, 4, 3)).toBe(true)
  })

  it('is false when the queue costs well under the balance', () => {
    expect(insufficientBalance(2, 2, 10)).toBe(false)
  })
})

describe('remainingAfter', () => {
  it.each([
    [10, 3, 7],
    [10, 10, 0],
    [5, 8, -3],
  ])('remainingCredits=%i, totalCost=%i -> %i', (remainingCredits, cost, expected) => {
    expect(remainingAfter(remainingCredits, cost)).toBe(expected)
  })
})

describe('table-driven scenarios matching TimestampView usage', () => {
  it.each([
    { label: 'empty queue', queuedCount: 0, remainingCredits: 10, creditCost: 1, expectInsufficient: false, expectRemaining: 10 },
    { label: 'insufficient balance boundary', queuedCount: 11, remainingCredits: 10, creditCost: 1, expectInsufficient: true, expectRemaining: -1 },
    { label: 'exact balance match', queuedCount: 10, remainingCredits: 10, creditCost: 1, expectInsufficient: false, expectRemaining: 0 },
    { label: 'normal case, balance left over', queuedCount: 2, remainingCredits: 10, creditCost: 1, expectInsufficient: false, expectRemaining: 8 },
  ])('$label', ({ queuedCount, remainingCredits, creditCost, expectInsufficient, expectRemaining }) => {
    const cost = totalCost(queuedCount, creditCost)
    expect(insufficientBalance(queuedCount, cost, remainingCredits)).toBe(expectInsufficient)
    expect(remainingAfter(remainingCredits, cost)).toBe(expectRemaining)
  })
})
